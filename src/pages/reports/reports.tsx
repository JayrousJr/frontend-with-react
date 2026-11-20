import { useEffect, useState } from "react"
import { useLoaderData } from "react-router"
import { useTranslation } from "react-i18next"
import { DownloadIcon, FileSpreadsheetIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Field, FieldLabel } from "@/components/ui/field"
import { PageHeader } from "@/components/app/page-header"
import { useRun } from "@/components/app/use-run"
import { useAuth } from "@/context/auth-context"
import { P, hasPermission } from "@/lib/permissions"
import { fetchPermissionCatalogue, type PermissionDef } from "@/services/access"
import { downloadReport, type ReportInfo } from "@/services/reports"

const ReportsPage = () => {
  const { t } = useTranslation()
  const { reports } = useLoaderData() as { reports: ReportInfo[] }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("reports.title", "Reports")}
        description={t(
          "reports.subtitle",
          "Excel exports, limited to what your permissions let you see. Every export is recorded in the audit log."
        )}
      />
      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t(
              "reports.none",
              "No reports are available with your permissions."
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reports.map((r) => (
            <ReportCard key={r.code} report={r} />
          ))}
        </div>
      )}
    </div>
  )
}

function ReportCard({ report }: { report: ReportInfo }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const run = useRun()
  const [values, setValues] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [perms, setPerms] = useState<PermissionDef[]>([])
  const needsPerms = report.params.some((p) => p.type === "permission")

  useEffect(() => {
    if (needsPerms && hasPermission(user, P.ROLE_VIEW)) {
      void fetchPermissionCatalogue().then(setPerms)
    }
  }, [needsPerms, user])

  const missing = report.params.some(
    (p) => p.type === "permission" && !values[p.key]
  )

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSpreadsheetIcon className="size-4 text-emerald-600" />
          {t(`reports.${report.code}`, report.name)}
        </CardTitle>
        <CardDescription>{report.description}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto space-y-3">
        {report.params.map((p) => (
          <Field key={p.key}>
            <FieldLabel htmlFor={`${report.code}-${p.key}`} className="text-xs">
              {p.label}
            </FieldLabel>
            {p.type === "permission" ? (
              <NativeSelect
                id={`${report.code}-${p.key}`}
                className="w-full"
                value={values[p.key] ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [p.key]: e.target.value }))
                }
              >
                <NativeSelectOption value="">—</NativeSelectOption>
                {perms.map((x) => (
                  <NativeSelectOption key={x.code} value={x.code}>
                    {x.code}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            ) : (
              <Input
                id={`${report.code}-${p.key}`}
                type={
                  p.type === "date"
                    ? "date"
                    : p.type === "number"
                      ? "number"
                      : "text"
                }
                value={values[p.key] ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [p.key]: e.target.value }))
                }
              />
            )}
          </Field>
        ))}
        <Button
          variant="outline"
          className="w-full"
          disabled={busy || missing}
          onClick={async () => {
            setBusy(true)
            await run(() => downloadReport(report.code, values))
            setBusy(false)
          }}
        >
          <DownloadIcon />
          {busy
            ? t("reports.preparing", "Preparing…")
            : t("reports.download", "Download Excel")}
        </Button>
      </CardContent>
    </Card>
  )
}

export default ReportsPage
