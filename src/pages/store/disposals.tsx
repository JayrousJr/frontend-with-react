import { useState } from "react"
import {
  Link,
  useLoaderData,
  useRevalidator,
  useSearchParams,
} from "react-router"
import { useTranslation } from "react-i18next"
import {
  CheckCircle2Icon,
  ChevronRightIcon,
  ShieldCheckIcon,
  Trash2Icon,
  XCircleIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/app/page-header"
import { ToneBadge } from "@/components/app/tone-badge"
import { useCodeLabel } from "@/components/app/use-code-label"
import { ReasonDialog } from "@/components/app/reason-dialog"
import { useRun } from "@/components/app/use-run"
import { formatStamp } from "@/lib/format"
import { ROUTES, withId } from "@/routes/routeConstants"
import {
  cancelDisposal,
  completeDisposal,
  type Disposal,
} from "@/services/store"

const OPEN = ["IN_APPROVAL", "APPROVED", "RETURNED"]

const DisposalsPage = () => {
  const { t } = useTranslation()
  const { disposals } = useLoaderData() as { disposals: Disposal[] }
  const [params, setParams] = useSearchParams()
  const tab = params.get("tab") ?? "open"
  const shown = disposals.filter((x) =>
    tab === "open" ? OPEN.includes(x.status) : true
  )
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("disposals.title", "Disposals")}
        description={t(
          "disposals.subtitle",
          "Proposed from the asset page. The owning department's HOD gives a technical opinion, the Disposal Committee approves, then the store records the disposal."
        )}
      />
      <Tabs
        value={tab}
        onValueChange={(v) => setParams({ tab: v }, { replace: true })}
      >
        <TabsList variant="line">
          <TabsTrigger value="open">{t("disposals.open", "Open")}</TabsTrigger>
          <TabsTrigger value="all">{t("disposals.all", "All")}</TabsTrigger>
        </TabsList>
      </Tabs>
      {shown.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-sm text-muted-foreground">
            <Trash2Icon className="size-8" />
            {t("disposals.none", "No disposals here.")}
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <CardContent className="divide-y p-0">
            {shown.map((d) => (
              <Link
                key={d.uniqueId}
                to={withId(ROUTES.DISPOSAL_DETAILS, d.uniqueId)}
                className="flex items-center gap-4 px-4 py-3 hover:bg-muted sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-medium">{d.number}</span>
                    <span className="font-mono text-sm">{d.asset.tag}</span>
                    <span>{d.asset.productName}</span>
                    <ToneBadge code={d.status} />
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {d.method} · {d.reason} · {d.proposedBy} ·{" "}
                    {formatStamp(d.createdAt)}
                  </div>
                </div>
                <ChevronRightIcon className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default DisposalsPage

export function DisposalDetailsPage() {
  const { t } = useTranslation()
  const label = useCodeLabel()
  const run = useRun()
  const { revalidate } = useRevalidator()
  const { disposal: d } = useLoaderData() as { disposal: Disposal }
  const [dialog, setDialog] = useState<null | "complete" | "cancel">(null)
  const rows: [string, string | null][] = [
    [t("disposals.method", "Method"), d.method],
    [t("common.reason", "Reason"), d.reason],
    [
      t("disposals.proposed", "Proposed"),
      `${d.proposedBy} · ${formatStamp(d.createdAt)}`,
    ],
    [t("disposals.status_before", "Status before"), label(d.previousStatus)],
    [t("products.owner", "Owning department"), d.asset.departmentName],
    [
      t("disposals.completed", "Disposed"),
      d.completedAt && `${d.completedBy ?? ""} · ${formatStamp(d.completedAt)}`,
    ],
    [t("disposals.note", "Disposal record"), d.completionNote],
  ]
  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{d.number}</span>
            <ToneBadge code={d.status} />
          </span>
        }
        description={
          <>
            <Link
              className="font-mono underline"
              to={withId(ROUTES.ASSET_DETAILS, d.asset.uniqueId)}
            >
              {d.asset.tag}
            </Link>{" "}
            · {d.asset.productName}
          </>
        }
        actions={
          <>
            {d.approvalRequestUniqueId && (
              <Button variant="outline" asChild>
                <Link
                  to={withId(
                    ROUTES.APPROVAL_DETAILS,
                    d.approvalRequestUniqueId
                  )}
                >
                  <ShieldCheckIcon />
                  {t("products.open_approval", "Approval")}
                </Link>
              </Button>
            )}
            {d.can.cancel && (
              <Button variant="outline" onClick={() => setDialog("cancel")}>
                <XCircleIcon />
                {t("disposals.withdraw", "Withdraw")}
              </Button>
            )}
            {d.can.complete && (
              <Button onClick={() => setDialog("complete")}>
                <CheckCircle2Icon />
                {t("disposals.record", "Record disposal")}
              </Button>
            )}
          </>
        }
      />
      <Card>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {rows
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            <div>
              <dt className="text-muted-foreground">
                {t("maintenance.asset_now", "Asset now")}
              </dt>
              <dd className="flex gap-1">
                <ToneBadge code={d.asset.status} />
                <ToneBadge code={d.asset.condition} />
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
      {dialog === "complete" && (
        <ReasonDialog
          title={t("disposals.record", "Record disposal")}
          description={t(
            "disposals.record_hint",
            "How and when it was disposed of (certificate, buyer, receipt…). The asset record is kept forever."
          )}
          confirmLabel={t("disposals.record", "Record disposal")}
          onClose={() => setDialog(null)}
          onConfirm={async (note) => {
            const ok = await run(
              () => completeDisposal(d.uniqueId, note),
              t("disposals.recorded", "Disposal recorded")
            )
            if (ok) revalidate()
            return ok
          }}
        />
      )}
      {dialog === "cancel" && (
        <ReasonDialog
          title={t("disposals.withdraw_title", "Withdraw this proposal?")}
          description={t(
            "disposals.withdraw_hint",
            "The asset goes back to how it was."
          )}
          confirmLabel={t("disposals.withdraw", "Withdraw")}
          destructive
          onClose={() => setDialog(null)}
          onConfirm={async (reason) => {
            const ok = await run(() => cancelDisposal(d.uniqueId, reason))
            if (ok) revalidate()
            return ok
          }}
        />
      )}
    </div>
  )
}
