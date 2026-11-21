import { useEffect, useState } from "react"
import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ToneBadge } from "@/components/app/tone-badge"
import { useCodeLabel } from "@/components/app/use-code-label"
import { useAuth } from "@/context/auth-context"
import { formatDay } from "@/lib/format"
import { P, hasPermission } from "@/lib/permissions"
import { ROUTES, withId } from "@/routes/routeConstants"
import {
  fetchCustodyHistory,
  fetchReports,
  type AssetReport,
  type CustodyItem,
} from "@/services/custody"
import { ReportDialog } from "./dialogs"

/** Asset view (B3 §5): current custodian, full custody history, reports. */
export function AssetCustody({
  assetUniqueId,
  tag,
  onChanged,
}: {
  assetUniqueId: string
  tag: string
  onChanged: () => void
}) {
  const { t } = useTranslation()
  const label = useCodeLabel()
  const { user } = useAuth()
  const [history, setHistory] = useState<CustodyItem[]>([])
  const [reports, setReports] = useState<AssetReport[]>([])
  const [reporting, setReporting] = useState(false)
  useEffect(() => {
    void fetchCustodyHistory({ assetUniqueId })
      .then(setHistory)
      .catch(() => setHistory([]))
    void fetchReports(assetUniqueId)
      .then(setReports)
      .catch(() => setReports([]))
  }, [assetUniqueId])
  if (
    !history.length &&
    !reports.length &&
    !hasPermission(user, P.ASSET_REPORT_CREATE)
  )
    return null
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>{t("custody.history", "Custody")}</CardTitle>
        {hasPermission(user, P.ASSET_REPORT_CREATE) && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setReporting(true)}
          >
            {t("custody.report", "Report a problem")}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {history.length === 0 ? (
          <p className="text-muted-foreground">
            {t("custody.never_held", "Never handed over to anyone.")}
          </p>
        ) : (
          <ul className="divide-y">
            {history.map((c) => (
              <li
                key={`${c.from}-${c.custodian.uniqueId}`}
                className="flex flex-wrap items-center gap-2 py-2"
              >
                <span className="font-medium">{c.custodian.fullName}</span>
                <span className="text-muted-foreground">
                  {c.departmentName}
                </span>
                <span>
                  {formatDay(c.from)} →{" "}
                  {c.to ? formatDay(c.to) : t("custody.now", "now")}
                </span>
                {c.endReason && <ToneBadge code={c.endReason} />}
                {c.handoverUniqueId && (
                  <Link
                    className="font-mono text-xs underline"
                    to={withId(ROUTES.HANDOVER_DETAILS, c.handoverUniqueId)}
                  >
                    {c.handoverNumber}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
        {reports.length > 0 && (
          <div>
            <h3 className="mb-1 font-medium">
              {t("custody.reports", "Reports")}
            </h3>
            <ul className="space-y-1">
              {reports.map((r) => (
                <li
                  key={r.uniqueId}
                  className="flex flex-wrap items-center gap-2"
                >
                  <span className="font-mono text-xs">{r.number}</span>
                  {label(r.type)}
                  <ToneBadge code={r.status} />
                  <span className="text-muted-foreground">
                    {r.circumstances}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
      {reporting && (
        <ReportDialog
          assetUniqueId={assetUniqueId}
          tag={tag}
          onClose={() => setReporting(false)}
          onDone={() => {
            setReporting(false)
            onChanged()
          }}
        />
      )}
    </Card>
  )
}

/** Employee view (B3 §5): items held now and before. */
export function EmployeeCustody({
  employeeUniqueId,
}: {
  employeeUniqueId: string
}) {
  const { t } = useTranslation()
  const [rows, setRows] = useState<CustodyItem[] | null>(null)
  useEffect(() => {
    void fetchCustodyHistory({ employeeUniqueId })
      .then(setRows)
      .catch(() => setRows(null))
  }, [employeeUniqueId])
  if (!rows) return null
  const now = rows.filter((r) => !r.to)
  const before = rows.filter((r) => r.to)
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("custody.employee_items", "Company items")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {rows.length === 0 && (
          <p className="text-muted-foreground">
            {t("custody.no_items", "No items in custody.")}
          </p>
        )}
        {[
          [t("custody.held_now", "Held now"), now],
          [t("custody.held_before", "Held before"), before],
        ].map(([title, list]) =>
          (list as CustodyItem[]).length ? (
            <div key={title as string}>
              <h3 className="mb-1 font-medium">{title as string}</h3>
              <ul className="space-y-1">
                {(list as CustodyItem[]).map((c) => (
                  <li
                    key={`${c.assetUniqueId}-${c.from}`}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <Link
                      className="font-mono text-xs underline"
                      to={withId(ROUTES.ASSET_DETAILS, c.assetUniqueId)}
                    >
                      {c.tag}
                    </Link>
                    {c.productName}
                    <span className="text-muted-foreground">
                      {formatDay(c.from)} →{" "}
                      {c.to ? formatDay(c.to) : t("custody.now", "now")}
                    </span>
                    {!c.to && c.overdue && <ToneBadge code="OVERDUE" />}
                  </li>
                ))}
              </ul>
            </div>
          ) : null
        )}
      </CardContent>
    </Card>
  )
}
