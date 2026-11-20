import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
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
import { ConfirmDialog } from "@/components/app/confirm-dialog"
import { useRun } from "@/components/app/use-run"
import { formatStamp } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ImportStatus } from "@/services/imports"
import type {
  GenericImport,
  GenericImportHistory,
  importClient,
} from "@/services/products"

const TONE: Record<ImportStatus, string> = {
  VALIDATED: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  FAILED: "border-destructive/30 bg-destructive/10 text-destructive",
  COMMITTED:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
}

export type PreviewColumn = {
  key: string
  label: string
  mono?: boolean
}

/**
 * The shared Excel import flow: template → upload (every row checked) →
 * preview or errors → commit (all-or-nothing) → history.
 */
export function ExcelImport({
  client,
  ready,
  selector,
  templateQuery,
  templateName,
  templateHint,
  uploadFields,
  historyQuery,
  previewColumns,
  commitLabel,
  commitTitle,
  commitHint,
  committedHint,
  onCommitted,
}: {
  client: ReturnType<typeof importClient>
  /** False until the selector (store / department) is chosen. */
  ready: boolean
  selector?: ReactNode
  templateQuery: string
  templateName: string
  templateHint: string
  uploadFields: Record<string, string>
  historyQuery?: string
  previewColumns: PreviewColumn[]
  commitLabel: string
  commitTitle: string
  commitHint: (r: GenericImport) => string
  committedHint: ReactNode
  onCommitted?: (r: GenericImport) => void
}) {
  const { t } = useTranslation()
  const run = useRun()
  const input = useRef<HTMLInputElement>(null)
  const [result, setResult] = useState<GenericImport | null>(null)
  const [history, setHistory] = useState<GenericImportHistory[]>([])
  const [uploading, setUploading] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const loadHistory = useCallback(
    () => void client.history(historyQuery).then(setHistory),
    [client, historyQuery]
  )
  useEffect(loadHistory, [loadHistory])

  async function upload(file: File | undefined) {
    if (!file || !ready) return
    setUploading(true)
    setResult(null)
    await run(async () => setResult(await client.upload(file, uploadFields)))
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

  const step = (n: number) => (
    <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs">
      {n}
    </span>
  )

  return (
    <div className="space-y-6">
      {selector}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {step(1)}
              {t("import.step_template", "Download the template")}
            </CardTitle>
            <CardDescription>{templateHint}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              disabled={!ready}
              onClick={() =>
                run(() => client.template(templateQuery, templateName))
              }
            >
              <DownloadIcon />
              {t("import.download_template", "Download template (.xlsx)")}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {step(2)}
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
                dragOver && "border-primary bg-muted",
                !ready && "pointer-events-none opacity-50"
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
                disabled={uploading || !ready}
                onChange={(e) => void upload(e.target.files?.[0])}
              />
            </label>
          </CardContent>
        </Card>
      </div>

      {result && (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="flex flex-wrap items-center gap-2">
                <FileSpreadsheetIcon className="size-4" />
                <span className="break-all">{result.fileName}</span>
                <Badge variant="outline" className={TONE[result.status]}>
                  {statusLabel(result.status)}
                </Badge>
              </CardTitle>
              <CardDescription>
                {t(
                  "import.summary_generic",
                  "{{total}} rows · {{ok}} ready · {{errors}} errors",
                  {
                    total: result.totalRows,
                    ok: result.createCount,
                    errors: result.errorCount,
                  }
                )}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {result.status === "FAILED" && (
                <Button
                  variant="outline"
                  onClick={() => run(() => client.errors(result.uniqueId))}
                >
                  <DownloadIcon />
                  {t("import.download_errors", "Download file with errors")}
                </Button>
              )}
              {result.status === "VALIDATED" && (
                <Button onClick={() => setConfirm(true)}>
                  <CheckCircle2Icon />
                  {commitLabel}
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
                <AlertDescription>{committedHint}</AlertDescription>
              </Alert>
            )}
            <div className="max-h-96 overflow-auto rounded-md border">
              {result.errors.length > 0 ? (
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
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {previewColumns.map((c) => (
                        <TableHead key={c.key}>{c.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.preview.map((p, i) => (
                      <TableRow key={i}>
                        {previewColumns.map((c) => (
                          <TableCell
                            key={c.key}
                            className={cn(c.mono && "font-mono text-xs")}
                          >
                            {p[c.key] ?? "—"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    {t("import.no_history", "No imports yet.")}
                  </TableCell>
                </TableRow>
              )}
              {history.map((h) => (
                <TableRow
                  key={h.uniqueId}
                  className="cursor-pointer"
                  onClick={() =>
                    run(async () => setResult(await client.get(h.uniqueId)))
                  }
                >
                  <TableCell className="whitespace-nowrap">
                    {formatStamp(h.createdAt)}
                  </TableCell>
                  <TableCell>
                    {h.fileName}
                    {h.storeName && (
                      <div className="text-xs text-muted-foreground">
                        {h.storeName}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={TONE[h.status]}>
                      {statusLabel(h.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {h.totalRows}
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
          title={commitTitle}
          description={commitHint(result)}
          confirmLabel={commitLabel}
          onConfirm={async () => {
            let committed: GenericImport | null = null
            const ok = await run(
              async () => {
                committed = await client.commit(result.uniqueId)
                setResult(committed)
              },
              t("import.committed", "Import committed")
            )
            setConfirm(false)
            if (ok) {
              loadHistory()
              if (committed) onCommitted?.(committed)
            }
          }}
        />
      )}
    </div>
  )
}
