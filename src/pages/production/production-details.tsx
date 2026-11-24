import { useState } from "react"
import { Link, useParams, useSearchParams } from "react-router"
import { useTranslation } from "react-i18next"
import {
  FileTextIcon,
  PencilIcon,
  QrCodeIcon,
  SendIcon,
  XIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/app/page-header"
import { ToneBadge } from "@/components/app/tone-badge"
import { useRun } from "@/components/app/use-run"
import { ROUTES, withId } from "@/routes/routeConstants"
import {
  cancelProduction,
  fetchProduction,
  submitProduction,
} from "@/services/production"
import { FormDialog, Loading } from "./ui"
import { PRODUCTION_TABS, useLoad, type ProductionTab } from "./utils"
import { OverviewTab } from "./tab-overview"
import { CrewTab } from "./tab-crew"
import { EquipmentTab } from "./tab-equipment"
import { RunningOrderTab } from "./tab-running-order"
import { TransportTab } from "./tab-transport"
import { DocumentsTab } from "./tab-documents"
import { ChecklistTab } from "./tab-checklist"
import { ExecutionTab } from "./tab-execution"
import { AttendanceTab } from "./tab-attendance"
import { ClosureTab } from "./tab-closure"
import { MessagesTab } from "./tab-messages"

const ProductionDetailsPage = () => {
  const { t } = useTranslation()
  const run = useRun()
  const { uniqueId = "" } = useParams()
  const [params, setParams] = useSearchParams()
  const tab = (PRODUCTION_TABS as readonly string[]).includes(
    params.get("tab") ?? ""
  )
    ? (params.get("tab") as ProductionTab)
    : "overview"
  const p = useLoad(() => fetchProduction(uniqueId), [uniqueId])
  const [cancel, setCancel] = useState<string | null>(null)
  if (!p.data) return <Loading error={p.error} />
  const d = p.data
  const planned = ![
    "DRAFT",
    "SUBMITTED",
    "UNDER_REVIEW",
    "RETURNED",
    "APPROVED",
    "REJECTED",
  ].includes(d.status)
  const tabs: [ProductionTab, string, boolean][] = [
    ["overview", t("prod_tabs.overview", "Overview"), true],
    ["crew", t("prod_tabs.crew", "Crew"), true],
    ["equipment", t("prod_tabs.equipment", "Equipment"), planned],
    ["running-order", t("prod_tabs.running_order", "Running order"), planned],
    ["transport", t("prod_tabs.transport", "Transport"), planned],
    ["documents", t("prod_tabs.documents", "Documents"), true],
    ["readiness", t("prod_tabs.readiness", "Readiness"), planned],
    ["execution", t("prod_tabs.execution", "Execution"), planned],
    ["attendance", t("prod_tabs.attendance", "Attendance"), planned],
    [
      "closure",
      t("prod_tabs.closure", "Closure"),
      ["COMPLETED", "CLOSED"].includes(d.status),
    ],
    ["messages", t("prod_tabs.messages", "Messages"), true],
  ]
  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{d.number}</span>
            <span>{d.title}</span>
            <ToneBadge code={d.status} />
          </span>
        }
        description={`${d.category} · ${t("productions.producer", "Producer")} ${d.producer}`}
        actions={
          <>
            {d.approvalUniqueId && (
              <Button asChild variant="outline" size="sm">
                <Link to={withId(ROUTES.APPROVAL_DETAILS, d.approvalUniqueId)}>
                  {t("productions.approval", "Approval")}
                </Link>
              </Button>
            )}
            {planned && (
              <>
                <Button asChild variant="outline" size="sm">
                  <Link to={withId(ROUTES.CALL_SHEET, d.uniqueId)}>
                    <FileTextIcon />
                    {t("productions.call_sheet", "Call sheet")}
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to={withId(ROUTES.BADGES, d.uniqueId)}>
                    <QrCodeIcon />
                    {t("productions.badges", "QR badges")}
                  </Link>
                </Button>
              </>
            )}
            {d.can.edit && (
              <Button asChild variant="outline" size="sm">
                <Link to={withId(ROUTES.PRODUCTION_EDIT, d.uniqueId)}>
                  <PencilIcon />
                  {t("actions.edit", "Edit")}
                </Link>
              </Button>
            )}
            {d.can.submit && (
              <Button
                size="sm"
                onClick={() =>
                  run(
                    async () => p.set(await submitProduction(d.uniqueId)),
                    t(
                      "productions.submitted",
                      "Request submitted to the Production Manager"
                    )
                  )
                }
              >
                <SendIcon />
                {t("productions.submit", "Submit")}
              </Button>
            )}
            {d.can.cancel && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setCancel("")}
              >
                <XIcon />
                {t("productions.cancel", "Cancel production")}
              </Button>
            )}
          </>
        }
      />
      {d.status === "CANCELLED" && d.cancelReason && (
        <p className="text-sm text-destructive">
          {t("productions.cancelled_reason", "Cancelled")}: {d.cancelReason}
        </p>
      )}
      {d.status === "CLOSED" && (
        <p className="text-sm text-muted-foreground">
          {t(
            "productions.closed_note",
            "Closed: the records are read-only. Corrections go through an amendment (Closure tab)."
          )}
        </p>
      )}
      <Tabs
        value={tab}
        onValueChange={(v) => setParams({ tab: v }, { replace: true })}
      >
        <TabsList variant="line" className="flex-wrap">
          {tabs
            .filter(([, , show]) => show)
            .map(([k, label]) => (
              <TabsTrigger key={k} value={k}>
                {label}
              </TabsTrigger>
            ))}
        </TabsList>
        <TabsContent value="overview">
          <OverviewTab p={d} onChange={(x) => p.set(x)} reload={p.reload} />
        </TabsContent>
        <TabsContent value="crew">
          <CrewTab p={d} />
        </TabsContent>
        <TabsContent value="equipment">
          <EquipmentTab p={d} />
        </TabsContent>
        <TabsContent value="running-order">
          <RunningOrderTab p={d} />
        </TabsContent>
        <TabsContent value="transport">
          <TransportTab p={d} />
        </TabsContent>
        <TabsContent value="documents">
          <DocumentsTab p={d} />
        </TabsContent>
        <TabsContent value="readiness">
          <ChecklistTab p={d} kind="READINESS" onStatus={p.reload} />
        </TabsContent>
        <TabsContent value="execution">
          <ExecutionTab p={d} onStatus={p.reload} />
        </TabsContent>
        <TabsContent value="attendance">
          <AttendanceTab p={d} />
        </TabsContent>
        <TabsContent value="closure">
          <ClosureTab p={d} onStatus={p.reload} />
        </TabsContent>
        <TabsContent value="messages">
          <MessagesTab p={d} />
        </TabsContent>
      </Tabs>
      {cancel !== null && (
        <FormDialog
          title={t("productions.cancel", "Cancel production")}
          description={t(
            "productions.cancel_hint",
            "Bookings are released, trips cancelled and everyone involved is told. A reason is required."
          )}
          confirmLabel={t("productions.cancel", "Cancel production")}
          destructive
          canConfirm={!!cancel.trim()}
          onClose={() => setCancel(null)}
          onConfirm={() =>
            run(
              async () => p.set(await cancelProduction(d.uniqueId, cancel)),
              t("productions.cancelled", "Production cancelled")
            )
          }
        >
          <Textarea
            rows={3}
            value={cancel}
            onChange={(e) => setCancel(e.target.value)}
            placeholder={t("common.reason", "Reason")}
          />
        </FormDialog>
      )}
    </div>
  )
}

export default ProductionDetailsPage
