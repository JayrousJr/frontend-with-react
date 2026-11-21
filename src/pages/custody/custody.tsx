import { useCallback, useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { useTranslation } from "react-i18next"
import {
  AlertTriangleIcon,
  ClipboardCheckIcon,
  PackageCheckIcon,
  PlusIcon,
  UndoIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader } from "@/components/app/page-header"
import { ToneBadge } from "@/components/app/tone-badge"
import { useCodeLabel } from "@/components/app/use-code-label"
import { useRun } from "@/components/app/use-run"
import { useAuth } from "@/context/auth-context"
import { formatDay, formatStamp } from "@/lib/format"
import { P, hasPermission } from "@/lib/permissions"
import { cn } from "@/lib/utils"
import { ROUTES, withId } from "@/routes/routeConstants"
import {
  cancelReturn,
  fetchCustodyItems,
  fetchCustodyTransfers,
  fetchHandovers,
  fetchInspectionsDue,
  fetchReports,
  fetchReturns,
  proposeResponsibility,
  type AssetReport,
  type AssetReturn,
  type CustodyItem,
  type CustodyTransfer,
  type Handover,
  type Responsibility,
} from "@/services/custody"
import {
  InspectionDialog,
  ReceiveReturnDialog,
  ReportDialog,
  ReturnRequestDialog,
  TransferCustodyDialog,
} from "./dialogs"

/** Items table shared by My items and the custody overview. */
export function CustodyItemsTable({
  items,
  selectable,
  selected,
  onToggle,
  showCustodian = true,
  actions,
}: {
  items: CustodyItem[]
  selectable?: boolean
  selected?: Set<string>
  onToggle?: (id: string) => void
  showCustodian?: boolean
  actions?: (i: CustodyItem) => React.ReactNode
}) {
  const { t } = useTranslation()
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {selectable && <TableHead className="w-8" />}
            <TableHead>{t("assets.tag", "Tag")}</TableHead>
            {showCustodian && (
              <TableHead>{t("custody.custodian", "Custodian")}</TableHead>
            )}
            <TableHead>{t("assets.condition", "Condition")}</TableHead>
            <TableHead>{t("custody.since", "Since")}</TableHead>
            <TableHead>{t("custody.return_by", "Return by")}</TableHead>
            <TableHead>
              {t("custody.next_inspection", "Next inspection")}
            </TableHead>
            {actions && <TableHead />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-muted-foreground">
                {t("custody.no_items", "No items in custody.")}
              </TableCell>
            </TableRow>
          )}
          {items.map((i) => (
            <TableRow
              key={`${i.assetUniqueId}-${i.from}`}
              className={cn(i.isComponent && "text-muted-foreground")}
            >
              {selectable && (
                <TableCell>
                  {!i.isComponent && (
                    <Checkbox
                      checked={selected?.has(i.assetUniqueId)}
                      onCheckedChange={() => onToggle?.(i.assetUniqueId)}
                    />
                  )}
                </TableCell>
              )}
              <TableCell>
                <Link
                  className="font-mono text-sm hover:underline"
                  to={withId(ROUTES.ASSET_DETAILS, i.assetUniqueId)}
                >
                  {i.tag}
                </Link>
                <div className="text-sm">
                  {i.productName}
                  {i.isComponent &&
                    ` (${t("custody.component", "kit component")})`}
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {!i.acknowledged && (
                    <Badge variant="outline">
                      {t("custody.unacknowledged", "Not acknowledged")}
                    </Badge>
                  )}
                  {i.openReports > 0 && (
                    <Badge variant="destructive">
                      {t("custody.open_reports", "{{n}} open report", {
                        n: i.openReports,
                      })}
                    </Badge>
                  )}
                </div>
              </TableCell>
              {showCustodian && (
                <TableCell>
                  {i.custodian.fullName}
                  <div className="text-xs text-muted-foreground">
                    {i.departmentName}
                  </div>
                </TableCell>
              )}
              <TableCell>
                <ToneBadge code={i.condition} />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {formatDay(i.from)}
              </TableCell>
              <TableCell
                className={cn(
                  "whitespace-nowrap",
                  i.overdue && "font-medium text-destructive"
                )}
              >
                {i.expectedReturnDate
                  ? formatDay(i.expectedReturnDate)
                  : t("custody.open_ended", "Open-ended")}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {i.nextInspection ? formatDay(i.nextInspection) : "—"}
              </TableCell>
              {actions && (
                <TableCell className="text-right">{actions(i)}</TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function ItemsTab() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [items, setItems] = useState<CustodyItem[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [dialog, setDialog] = useState<
    null | "return" | "recall" | "transfer" | "receive"
  >(null)
  const [inspect, setInspect] = useState<CustodyItem | null>(null)
  const [report, setReport] = useState<CustodyItem | null>(null)
  const load = useCallback(() => void fetchCustodyItems().then(setItems), [])
  useEffect(load, [load])
  const chosen = items.filter((i) => selected.has(i.assetUniqueId))
  const sameCustodian =
    chosen.length > 0 &&
    chosen.every((i) => i.custodian.uniqueId === chosen[0].custodian.uniqueId)
  const withComponents = items.filter(
    (i) =>
      chosen.some((c) => c.custodian.uniqueId === i.custodian.uniqueId) &&
      (selected.has(i.assetUniqueId) || i.isComponent)
  )
  const done = () => {
    setDialog(null)
    setInspect(null)
    setReport(null)
    setSelected(new Set())
    load()
  }
  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {hasPermission(user, P.RETURN_RECEIVE) && (
            <Button
              size="sm"
              disabled={!sameCustodian}
              onClick={() => setDialog("receive")}
            >
              <PackageCheckIcon />
              {t("custody.receive", "Receive items back")}
            </Button>
          )}
          {hasPermission(user, P.RETURN_REQUEST) && (
            <Button
              size="sm"
              variant="outline"
              disabled={!sameCustodian}
              onClick={() => setDialog("return")}
            >
              <UndoIcon />
              {t("custody.request_return", "Request return")}
            </Button>
          )}
          {hasPermission(user, P.CUSTODY_RECALL) && (
            <Button
              size="sm"
              variant="outline"
              disabled={!sameCustodian}
              onClick={() => setDialog("recall")}
            >
              {t("custody.recall", "Recall items")}
            </Button>
          )}
          {hasPermission(user, P.CUSTODY_TRANSFER_REQUEST) && (
            <Button
              size="sm"
              variant="outline"
              disabled={!sameCustodian}
              onClick={() => setDialog("transfer")}
            >
              {t("custody.transfer", "Transfer custody")}
            </Button>
          )}
          <span className="self-center text-xs text-muted-foreground">
            {t(
              "custody.select_hint",
              "Tick items of one custodian to act on them."
            )}
          </span>
        </div>
        <CustodyItemsTable
          items={items}
          selectable
          selected={selected}
          onToggle={(id) =>
            setSelected((p) => {
              const n = new Set(p)
              if (n.has(id)) n.delete(id)
              else n.add(id)
              return n
            })
          }
          actions={(i) =>
            i.isComponent ? null : (
              <div className="flex justify-end gap-1">
                {hasPermission(user, P.ASSET_INSPECTION) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setInspect(i)}
                  >
                    {t("custody.inspect", "Inspect")}
                  </Button>
                )}
                {hasPermission(user, P.ASSET_REPORT_CREATE) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setReport(i)}
                  >
                    {t("custody.report_short", "Report")}
                  </Button>
                )}
              </div>
            )
          }
        />
      </CardContent>
      {(dialog === "return" || dialog === "recall") && (
        <ReturnRequestDialog
          items={chosen}
          recall={dialog === "recall"}
          onClose={() => setDialog(null)}
          onDone={done}
        />
      )}
      {dialog === "transfer" && (
        <TransferCustodyDialog
          items={chosen}
          onClose={() => setDialog(null)}
          onDone={done}
        />
      )}
      {dialog === "receive" && (
        <ReceiveReturnDialog
          items={withComponents}
          onClose={() => setDialog(null)}
          onDone={done}
        />
      )}
      {inspect && (
        <InspectionDialog
          item={inspect}
          onClose={() => setInspect(null)}
          onDone={done}
        />
      )}
      {report && (
        <ReportDialog
          assetUniqueId={report.assetUniqueId}
          tag={report.tag}
          onClose={() => setReport(null)}
          onDone={done}
        />
      )}
    </Card>
  )
}

function HandoversTab() {
  const { t } = useTranslation()
  const label = useCodeLabel()
  const [rows, setRows] = useState<Handover[]>([])
  useEffect(() => void fetchHandovers().then(setRows), [])
  return (
    <Card className="py-0">
      <CardContent className="divide-y p-0">
        {rows.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">
            {t("custody.no_handovers", "No handovers.")}
          </p>
        )}
        {rows.map((h) => (
          <Link
            key={h.uniqueId}
            to={withId(ROUTES.HANDOVER_DETAILS, h.uniqueId)}
            className="block px-4 py-3 hover:bg-muted sm:px-6"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-medium">{h.number}</span>
              <span>{h.custodian.fullName}</span>
              <ToneBadge code={h.status} />
            </div>
            <div className="text-xs text-muted-foreground">
              {label(h.source)} {h.sourceRef} ·{" "}
              {h.lines.map((l) => l.tag).join(", ")} · {h.store.name} ·{" "}
              {formatStamp(h.createdAt)}
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}

function ReturnsTab() {
  const { t } = useTranslation()
  const label = useCodeLabel()
  const run = useRun()
  const { user } = useAuth()
  const [rows, setRows] = useState<AssetReturn[]>([])
  const [receiving, setReceiving] = useState<{
    ret: AssetReturn
    items: CustodyItem[]
  } | null>(null)
  const load = useCallback(() => void fetchReturns().then(setRows), [])
  useEffect(load, [load])
  return (
    <Card className="py-0">
      <CardContent className="divide-y p-0">
        {rows.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">
            {t("custody.no_returns", "No returns.")}
          </p>
        )}
        {rows.map((r) => (
          <div
            key={r.uniqueId}
            className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-medium">{r.number}</span>
                <span>{r.custodian.fullName}</span>
                <ToneBadge code={r.status} />
                <Badge variant="secondary">{label(r.trigger)}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {r.lines
                  .map(
                    (l) =>
                      `${l.tag}${l.received && l.condition ? ` (${label(l.condition)})` : ""}${l.missing ? ` — ${t("custody.missing_short", "missing")}: ${l.missing}` : ""}`
                  )
                  .join(", ")}
                {r.store && ` · ${r.store.name}`} ·{" "}
                {formatStamp(r.receivedAt ?? r.createdAt)}
              </div>
            </div>
            {r.status === "REQUESTED" &&
              hasPermission(user, P.RETURN_RECEIVE) && (
                <Button
                  size="sm"
                  onClick={async () => {
                    const items = (
                      await fetchCustodyItems({
                        employeeUniqueId: r.custodian.uniqueId,
                      })
                    ).filter(
                      (i) =>
                        r.lines.some(
                          (l) => l.assetUniqueId === i.assetUniqueId
                        ) || i.isComponent
                    )
                    setReceiving({ ret: r, items })
                  }}
                >
                  {t("custody.receive", "Receive items back")}
                </Button>
              )}
            {r.status === "REQUESTED" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  run(async () => {
                    await cancelReturn(r.uniqueId)
                    load()
                  })
                }
              >
                {t("actions.cancel", "Cancel")}
              </Button>
            )}
          </div>
        ))}
      </CardContent>
      {receiving && (
        <ReceiveReturnDialog
          items={receiving.items}
          returnUniqueId={receiving.ret.uniqueId}
          onClose={() => setReceiving(null)}
          onDone={() => {
            setReceiving(null)
            load()
          }}
        />
      )}
    </Card>
  )
}

function ResponsibilityDialog({
  r,
  onClose,
  onDone,
}: {
  r: AssetReport
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation()
  const label = useCodeLabel()
  const run = useRun()
  const [decision, setDecision] = useState<Responsibility>("NORMAL_WEAR")
  const [reason, setReason] = useState("")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("custody.responsibility", "Responsibility decision")} —{" "}
            {r.number}
          </DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <p className="text-sm text-muted-foreground">
            {t(
              "custody.responsibility_hint",
              "Decision and reason only — no amounts. Owning HOD, then HR approve. Any financial or disciplinary step follows AzamTV policy outside the system."
            )}
          </p>
          <Field>
            <FieldLabel htmlFor="rs-dec">
              {t("custody.decision", "Decision")}
            </FieldLabel>
            <NativeSelect
              id="rs-dec"
              className="w-full"
              value={decision}
              onChange={(e) => setDecision(e.target.value as Responsibility)}
            >
              {(
                [
                  "NORMAL_WEAR",
                  "ACCIDENT",
                  "NEGLIGENCE",
                  "UNDER_INVESTIGATION",
                ] as const
              ).map((d) => (
                <NativeSelectOption key={d} value={d}>
                  {label(d)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="rs-reason">
              {t("common.reason", "Reason")}
            </FieldLabel>
            <Textarea
              id="rs-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("actions.cancel", "Cancel")}
          </Button>
          <Button
            disabled={reason.trim().length < 3}
            onClick={async () => {
              const ok = await run(
                () =>
                  proposeResponsibility(r.uniqueId, decision, reason.trim()),
                t("custody.sent", "Sent for approval")
              )
              if (ok) onDone()
            }}
          >
            {t("custody.send_decision", "Send for approval")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ReportsTab() {
  const { t } = useTranslation()
  const label = useCodeLabel()
  const [rows, setRows] = useState<AssetReport[]>([])
  const [deciding, setDeciding] = useState<AssetReport | null>(null)
  const load = useCallback(() => void fetchReports().then(setRows), [])
  useEffect(load, [load])
  return (
    <Card className="py-0">
      <CardContent className="divide-y p-0">
        {rows.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">
            {t("custody.no_reports", "No reports.")}
          </p>
        )}
        {rows.map((r) => (
          <div
            key={r.uniqueId}
            className="flex flex-wrap items-start gap-3 px-4 py-3 sm:px-6"
          >
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-medium">{r.number}</span>
                <Badge
                  variant={
                    r.type === "LOSS" || r.type === "THEFT"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {label(r.type)}
                </Badge>
                <ToneBadge code={r.status} />
                <Link
                  className="font-mono text-sm underline"
                  to={withId(ROUTES.ASSET_DETAILS, r.asset.uniqueId)}
                >
                  {r.asset.tag}
                </Link>
                {r.automatic && (
                  <Badge variant="outline">
                    {t("custody.automatic", "automatic")}
                  </Badge>
                )}
              </div>
              <p className="text-sm">{r.circumstances}</p>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {r.custodian && <span>{r.custodian}</span>}
                <span>{formatStamp(r.occurredAt)}</span>
                {r.maintenanceTicketUniqueId && (
                  <Link
                    className="underline"
                    to={withId(
                      ROUTES.MAINTENANCE_DETAILS,
                      r.maintenanceTicketUniqueId
                    )}
                  >
                    {t("custody.ticket", "Maintenance ticket")}
                  </Link>
                )}
                {r.lossApprovalUniqueId && (
                  <Link
                    className="underline"
                    to={withId(ROUTES.APPROVAL_DETAILS, r.lossApprovalUniqueId)}
                  >
                    {t("custody.loss_approval", "Loss approval")}
                  </Link>
                )}
                {r.responsibility && (
                  <span>
                    {t("custody.responsibility", "Responsibility decision")}:{" "}
                    {label(r.responsibility)} (
                    {r.responsibilityStatus?.toLowerCase()})
                  </span>
                )}
              </div>
            </div>
            {r.canDecideResponsibility && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDeciding(r)}
              >
                {t("custody.responsibility", "Responsibility decision")}
              </Button>
            )}
          </div>
        ))}
      </CardContent>
      {deciding && (
        <ResponsibilityDialog
          r={deciding}
          onClose={() => setDeciding(null)}
          onDone={() => {
            setDeciding(null)
            load()
          }}
        />
      )}
    </Card>
  )
}

function TransfersTab() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [rows, setRows] = useState<CustodyTransfer[]>([])
  useEffect(() => void fetchCustodyTransfers().then(setRows), [])
  return (
    <Card className="py-0">
      <CardContent className="divide-y p-0">
        {rows.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">
            {t("custody.no_transfers", "No custody transfers.")}
          </p>
        )}
        {rows.map((x) => (
          <div
            key={x.uniqueId}
            className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-medium">{x.number}</span>
                <span>
                  {x.from.fullName} → {x.to.fullName}
                </span>
                <ToneBadge code={x.status} />
              </div>
              <div className="text-xs text-muted-foreground">
                {x.assets.map((a) => a.tag).join(", ")} · {x.reason} ·{" "}
                {formatStamp(x.createdAt)}
              </div>
            </div>
            {x.status === "APPROVED" &&
              hasPermission(user, P.HANDOVER_PREPARE) && (
                <Button size="sm" asChild>
                  <Link to={`${ROUTES.HANDOVER_NEW}?transfer=${x.uniqueId}`}>
                    {t("custody.hand_over_new", "Hand over to new custodian")}
                  </Link>
                </Button>
              )}
            {x.approvalRequestUniqueId && (
              <Button size="sm" variant="ghost" asChild>
                <Link
                  to={withId(
                    ROUTES.APPROVAL_DETAILS,
                    x.approvalRequestUniqueId
                  )}
                >
                  {t("products.open_approval", "Approval")}
                </Link>
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function InspectionsTab() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [rows, setRows] = useState<CustodyItem[]>([])
  const [inspect, setInspect] = useState<CustodyItem | null>(null)
  const load = useCallback(() => void fetchInspectionsDue().then(setRows), [])
  useEffect(load, [load])
  return (
    <Card>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">
          {t(
            "custody.inspections_hint",
            "Items in custody whose condition inspection is due in the next 30 days or overdue (laptops/phones every 12 months, camera/audio/lighting every 6)."
          )}
        </p>
        <CustodyItemsTable
          items={rows}
          actions={(i) =>
            hasPermission(user, P.ASSET_INSPECTION) ? (
              <Button size="sm" variant="outline" onClick={() => setInspect(i)}>
                <ClipboardCheckIcon />
                {t("custody.inspect", "Inspect")}
              </Button>
            ) : null
          }
        />
      </CardContent>
      {inspect && (
        <InspectionDialog
          item={inspect}
          onClose={() => setInspect(null)}
          onDone={() => {
            setInspect(null)
            load()
          }}
        />
      )}
    </Card>
  )
}

const TABS = [
  "items",
  "handovers",
  "returns",
  "reports",
  "transfers",
  "inspections",
] as const

const CustodyPage = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab = (TABS as readonly string[]).includes(params.get("tab") ?? "")
    ? params.get("tab")!
    : "items"
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("custody.title", "Custody")}
        description={t(
          "custody.subtitle",
          "Who holds which company item, from handover to return. Every handover references a request; the custodian acknowledges it."
        )}
        actions={
          hasPermission(user, P.HANDOVER_PREPARE) && (
            <Button asChild>
              <Link to={ROUTES.HANDOVER_NEW}>
                <PlusIcon />
                {t("custody.new_handover", "New handover")}
              </Link>
            </Button>
          )
        }
      />
      <Tabs
        value={tab}
        onValueChange={(v) => setParams({ tab: v }, { replace: true })}
      >
        <TabsList variant="line" className="flex-wrap">
          <TabsTrigger value="items">
            {t("custody.tab_items", "Items held")}
          </TabsTrigger>
          <TabsTrigger value="handovers">
            {t("custody.tab_handovers", "Handovers")}
          </TabsTrigger>
          <TabsTrigger value="returns">
            {t("custody.tab_returns", "Returns")}
          </TabsTrigger>
          <TabsTrigger value="reports">
            <AlertTriangleIcon className="size-3.5" />
            {t("custody.tab_reports", "Reports")}
          </TabsTrigger>
          <TabsTrigger value="transfers">
            {t("custody.tab_transfers", "Transfers")}
          </TabsTrigger>
          <TabsTrigger value="inspections">
            {t("custody.tab_inspections", "Inspections due")}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "items" && <ItemsTab />}
      {tab === "handovers" && <HandoversTab />}
      {tab === "returns" && <ReturnsTab />}
      {tab === "reports" && <ReportsTab />}
      {tab === "transfers" && <TransfersTab />}
      {tab === "inspections" && <InspectionsTab />}
    </div>
  )
}

export default CustodyPage
