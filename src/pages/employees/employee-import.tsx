import { useEffect, useRef, useState } from "react"
import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import {
  CheckCircle2Icon,
  DownloadIcon,
  FileSpreadsheetIcon,
  UploadIcon,
  XCircleIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader } from "@/components/app/page-header"
import { ConfirmDialog } from "@/components/app/confirm-dialog"
import { useRun } from "@/components/app/use-run"
import { formatStamp } from "@/lib/format"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/routes/routeConstants"
import {
  commitEmployeeImport,
  downloadEmployeeTemplate,
  downloadImportErrors,
  fetchImport,
  fetchImportHistory,
  uploadEmployeeImport,
  type ImportHistoryItem,
  type ImportResult,
  type ImportStatus,
} from "@/services/imports"

const TONE: Record<ImportStatus, string> = {
  VALIDATED: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  FAILED: "border-destructive/30 bg-destructive/10 text-destructive",
  COMMITTED:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
}

const EmployeeImportPage = () => {
  const { t } = useTranslation()
  const run = useRun()
  const input = useRef<HTMLInputElement>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [history, setHistory] = useState<ImportHistoryItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const loadHistory = () => void fetchImportHistory().then(setHistory)
  useEffect(loadHistory, [])

  async function upload(file: File | undefined) {
    if (!file) return
    setUploading(true)
    setResult(null)
    await run(async () => {
      setResult(await uploadEmployeeImport(file))
    })
    setUploading(false)
    loadHistory()
    if (input.current) input.current.value = ""
  }

  const statusLabel = (s: ImportStatus) =>
    ({
      VALIDATED: t("import.status_validated", "Ready to commit"),
      FAILED: t("import.status_failed", "Has errors"),
      COMMITTED: t("import.status_committed", "Committed"),
    })[s]

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("import.title", "Import employees")}
        description={t(
          "import.subtitle",
          "Upload the Excel template. Every row is checked first; nothing is saved unless all rows are valid. Re-importing updates employees with the same number and never removes anyone."
        )}
        actions={
          <Button variant="outline" asChild>
            <Link to={ROUTES.EMPLOYEES}>
              {t("import.back", "Back to employees")}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs">
                1
              </span>
              {t("import.step_template", "Download the template")}
            </CardTitle>
            <CardDescription>
              {t(
                "import.template_hint",
                "Generated from today's departments, job titles and employment types, with drop-downs. Download a fresh copy after those lists change."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => run(downloadEmployeeTemplate)}
            >
              <DownloadIcon />
              {t("import.download_template", "Download template (.xlsx)")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs">
                2
              </span>
              {t("import.step_upload", "Upload the filled file")}
            </CardTitle>
            <CardDescription>
              {t("import.upload_hint", "Excel .xlsx, up to 10 MB.")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                void upload(e.dataTransfer.files[0])
              }}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center text-sm transition-colors hover:bg-muted",
                dragOver && "border-primary bg-muted"
              )}
            >
              {uploading ? (
                <Spinner />
              ) : (
                <UploadIcon className="size-6 text-muted-foreground" />
              )}
              <span>
                {uploading
                  ? t("import.checking", "Checking every row…")
                  : t("import.drop", "Drop the file here or click to choose")}
              </span>
              <input
                ref={input}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                disabled={uploading}
                onChange={(e) => void upload(e.target.files?.[0])}
              />
            </label>
          </CardContent>
        </Card>
      </div>

      {result && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="flex flex-wrap items-center gap-2">
                <FileSpreadsheetIcon className="size-4" />
                {result.fileName}
                <Badge variant="outline" className={TONE[result.status]}>
                  {statusLabel(result.status)}
                </Badge>
              </CardTitle>
              <CardDescription>
                {t(
                  "import.summary",
                  "{{total}} rows · {{create}} new · {{update}} updates · {{errors}} errors",
                  {
                    total: result.totalRows,
                    create: result.createCount,
                    update: result.updateCount,
                    errors: result.errorCount,
                  }
                )}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {result.status === "FAILED" && (
                <Button
                  variant="outline"
                  onClick={() =>
                    run(() => downloadImportErrors(result.uniqueId))
                  }
                >
                  <DownloadIcon />
                  {t("import.download_errors", "Download file with errors")}
                </Button>
              )}
              {result.status === "VALIDATED" && (
                <Button onClick={() => setConfirm(true)}>
                  <CheckCircle2Icon />
                  {t("import.commit", "Commit import")}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.status === "FAILED" && (
              <Alert variant="destructive">
                <XCircleIcon />
                <AlertDescription>
                  {t(
                    "import.failed_hint",
                    "Nothing was saved. Fix the rows below (the error file adds an Errors column next to each one) and upload again."
                  )}
                </AlertDescription>
              </Alert>
            )}
            {result.status === "COMMITTED" && (
              <Alert>
                <CheckCircle2Icon />
                <AlertDescription>
                  {t(
                    "import.committed_hint",
                    "Saved. Changes of department, job title, type, supervisor and email were added to each employee's history."
                  )}
                </AlertDescription>
              </Alert>
            )}
            {result.errors.length > 0 ? (
              <div className="max-h-96 overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">
                        {t("import.row", "Row")}
                      </TableHead>
                      <TableHead>{t("import.column", "Column")}</TableHead>
                      <TableHead>{t("import.problem", "Problem")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.errors.map((e, i) => (
                      <TableRow key={i}>
                        <TableCell className="tabular-nums">{e.row}</TableCell>
                        <TableCell>{e.column ?? "—"}</TableCell>
                        <TableCell className="text-destructive">
                          {e.message}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="max-h-96 overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">
                        {t("import.row", "Row")}
                      </TableHead>
                      <TableHead>{t("import.action", "Action")}</TableHead>
                      <TableHead>
                        {t("employees.number", "Employee no.")}
                      </TableHead>
                      <TableHead>{t("employees.name", "Name")}</TableHead>
                      <TableHead>
                        {t("employees.company_email", "Company email")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.preview.map((p) => (
                      <TableRow key={p.row}>
                        <TableCell className="tabular-nums">{p.row}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              p.action === "create" ? "default" : "secondary"
                            }
                          >
                            {p.action === "create"
                              ? t("import.new", "New")
                              : t("import.update", "Update")}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {p.employeeNumber}
                        </TableCell>
                        <TableCell>{p.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {p.companyEmail}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {result.preview.length <
              result.createCount + result.updateCount && (
              <p className="text-xs text-muted-foreground">
                {t("import.preview_cut", "Showing the first {{n}} rows.", {
                  n: result.preview.length,
                })}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("import.history", "Import history")}</CardTitle>
          <CardDescription>
            {t(
              "import.history_hint",
              "Every upload is kept with its file and result."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("audit.when", "When")}</TableHead>
                <TableHead>{t("import.file", "File")}</TableHead>
                <TableHead>{t("common.status", "Status")}</TableHead>
                <TableHead className="text-right">
                  {t("import.rows", "Rows")}
                </TableHead>
                <TableHead>{t("import.by", "By")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    {t("import.no_history", "No imports yet.")}
                  </TableCell>
                </TableRow>
              )}
              {history.map((h) => (
                <TableRow
                  key={h.uniqueId}
                  className="cursor-pointer"
                  onClick={() =>
                    run(async () => setResult(await fetchImport(h.uniqueId)))
                  }
                >
                  <TableCell className="whitespace-nowrap">
                    {formatStamp(h.createdAt)}
                  </TableCell>
                  <TableCell>{h.fileName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={TONE[h.status]}>
                      {statusLabel(h.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {h.totalRows}
                  </TableCell>
                  <TableCell className="text-sm">
                    {h.uploadedBy}
                    {h.committedBy && h.committedBy !== h.uploadedBy && (
                      <div className="text-xs text-muted-foreground">
                        {t("import.committed_by", "committed by {{name}}", {
                          name: h.committedBy,
                        })}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {result && (
        <ConfirmDialog
          open={confirm}
          onOpenChange={setConfirm}
          title={t("import.commit_title", "Commit this import?")}
          description={t(
            "import.commit_hint",
            "{{create}} employees will be created and {{update}} updated, in one step. The rows are checked again before saving.",
            { create: result.createCount, update: result.updateCount }
          )}
          confirmLabel={t("import.commit", "Commit import")}
          onConfirm={async () => {
            const ok = await run(
              async () => {
                setResult(await commitEmployeeImport(result.uniqueId))
              },
              t("import.committed", "Import committed")
            )
            setConfirm(false)
            if (ok) loadHistory()
          }}
        />
      )}
    </div>
  )
}

export default EmployeeImportPage
