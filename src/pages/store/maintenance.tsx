import { useEffect, useState } from "react"
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
  PlayIcon,
  ShieldCheckIcon,
  TruckIcon,
  WrenchIcon,
  XCircleIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { PageHeader } from "@/components/app/page-header"
import { ToneBadge } from "@/components/app/tone-badge"
import { useCodeLabel } from "@/components/app/use-code-label"
import { ReasonDialog } from "@/components/app/reason-dialog"
import { useRun } from "@/components/app/use-run"
import { formatStamp } from "@/lib/format"
import { ROUTES, withId } from "@/routes/routeConstants"
import {
  cancelTicket,
  completeTicket,
  CONDITIONS,
  fetchStore,
  sendTicketToVendor,
  startTicket,
  type AssetCondition,
  type MaintenanceTicket,
  type Store,
} from "@/services/store"

const OPEN = ["OPEN", "IN_REPAIR", "AT_VENDOR"]

const MaintenancePage = () => {
  const { t } = useTranslation()
  const label = useCodeLabel()
  const { tickets } = useLoaderData() as { tickets: MaintenanceTicket[] }
  const [params, setParams] = useSearchParams()
  const tab = params.get("tab") ?? "open"
  const shown = tickets.filter((x) =>
    tab === "open" ? OPEN.includes(x.status) : true
  )
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("maintenance.title", "Maintenance")}
        description={t(
          "maintenance.subtitle",
          "Repairs and services. Open a ticket from the asset page (Report fault). Assets in repair cannot be reserved, issued or transferred."
        )}
      />
      <Tabs
        value={tab}
        onValueChange={(v) => setParams({ tab: v }, { replace: true })}
      >
        <TabsList variant="line">
          <TabsTrigger value="open">
            {t("maintenance.open_tab", "Open")}
          </TabsTrigger>
          <TabsTrigger value="all">{t("maintenance.all", "All")}</TabsTrigger>
        </TabsList>
      </Tabs>
      {shown.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-sm text-muted-foreground">
            <WrenchIcon className="size-8" />
            {t("maintenance.none", "No tickets here.")}
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <CardContent className="divide-y p-0">
            {shown.map((m) => (
              <Link
                key={m.uniqueId}
                to={withId(ROUTES.MAINTENANCE_DETAILS, m.uniqueId)}
                className="flex items-center gap-4 px-4 py-3 hover:bg-muted sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-medium">{m.number}</span>
                    <span className="font-mono text-sm">{m.asset.tag}</span>
                    <span>{m.asset.productName}</span>
                    <ToneBadge code={m.status} />
                    {m.underWarranty && (
                      <Badge variant="secondary">
                        {t("maintenance.warranty", "Under warranty")}
                      </Badge>
                    )}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {label(m.source)} · {m.description} ·{" "}
                    {formatStamp(m.createdAt)}
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

export default MaintenancePage

function CompleteDialog({
  m,
  onClose,
  onDone,
}: {
  m: MaintenanceTicket
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation()
  const label = useCodeLabel()
  const run = useRun()
  const [store, setStore] = useState<Store | null>(null)
  const [outcome, setOutcome] = useState("")
  const [condition, setCondition] = useState<AssetCondition>("GOOD")
  const [loc, setLoc] = useState("")
  useEffect(() => {
    if (m.asset.storeUniqueId)
      void fetchStore(m.asset.storeUniqueId).then(setStore)
  }, [m.asset.storeUniqueId])
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("maintenance.complete", "Close ticket")}</DialogTitle>
          <DialogDescription>
            {t(
              "maintenance.complete_hint",
              "The asset goes back into the store with its condition. Beyond repair → propose disposal."
            )}
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="mc-outcome">
              {t("maintenance.outcome", "What was done")}
            </FieldLabel>
            <Textarea
              id="mc-outcome"
              rows={3}
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="mc-cond">
                {t("assets.condition", "Condition")}
              </FieldLabel>
              <NativeSelect
                id="mc-cond"
                className="w-full"
                value={condition}
                onChange={(e) => setCondition(e.target.value as AssetCondition)}
              >
                {CONDITIONS.map((c) => (
                  <NativeSelectOption key={c} value={c}>
                    {label(c)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="mc-loc">
                {t("locations.path", "Location")}
              </FieldLabel>
              <NativeSelect
                id="mc-loc"
                className="w-full"
                value={loc}
                onChange={(e) => setLoc(e.target.value)}
              >
                <NativeSelectOption value="">
                  {t("common.choose", "— Choose —")}
                </NativeSelectOption>
                {store?.locations
                  .filter((l) => l.kind === "GENERAL" && l.isActive)
                  .map((l) => (
                    <NativeSelectOption key={l.uniqueId} value={l.uniqueId}>
                      {l.path}
                    </NativeSelectOption>
                  ))}
              </NativeSelect>
            </Field>
          </div>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("actions.cancel", "Cancel")}
          </Button>
          <Button
            disabled={outcome.trim().length < 3 || !loc}
            onClick={async () => {
              const ok = await run(
                () =>
                  completeTicket(m.uniqueId, {
                    outcome: outcome.trim(),
                    condition,
                    locationUniqueId: loc,
                  }),
                t("maintenance.completed", "Ticket closed")
              )
              if (ok) onDone()
            }}
          >
            <CheckCircle2Icon />
            {t("maintenance.complete", "Close ticket")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function MaintenanceDetailsPage() {
  const { t } = useTranslation()
  const label = useCodeLabel()
  const run = useRun()
  const { revalidate } = useRevalidator()
  const { ticket: m } = useLoaderData() as { ticket: MaintenanceTicket }
  const [dialog, setDialog] = useState<null | "vendor" | "complete" | "cancel">(
    null
  )
  const [vendor, setVendor] = useState(m.vendorName ?? "")
  const done = () => {
    setDialog(null)
    revalidate()
  }
  const rows: [string, string | null][] = [
    [t("maintenance.source", "Source"), label(m.source)],
    [
      t("maintenance.opened", "Opened"),
      `${m.openedBy} · ${formatStamp(m.createdAt)}`,
    ],
    [
      t("maintenance.repair", "Repair"),
      m.external
        ? `${t("maintenance.external", "External")} — ${m.vendorName ?? ""}`
        : t("maintenance.internal", "Internal"),
    ],
    [
      t("maintenance.started", "Out of service since"),
      m.startedAt && formatStamp(m.startedAt),
    ],
    [
      t("maintenance.sent_out", "Sent to vendor"),
      m.sentOutAt && formatStamp(m.sentOutAt),
    ],
    [
      t("maintenance.closed", "Closed"),
      m.completedAt && `${m.completedBy ?? ""} · ${formatStamp(m.completedAt)}`,
    ],
    [
      t("maintenance.downtime", "Downtime"),
      m.downtimeHours != null
        ? t("maintenance.hours", "{{n}} hours", { n: m.downtimeHours })
        : null,
    ],
    [t("maintenance.outcome", "What was done"), m.outcome],
  ]
  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{m.number}</span>
            <ToneBadge code={m.status} />
            {m.underWarranty && (
              <Badge variant="secondary">
                {t("maintenance.warranty", "Under warranty")}
              </Badge>
            )}
          </span>
        }
        description={
          <>
            <Link
              className="font-mono underline"
              to={withId(ROUTES.ASSET_DETAILS, m.asset.uniqueId)}
            >
              {m.asset.tag}
            </Link>{" "}
            · {m.asset.productName} · {m.asset.storeName}
          </>
        }
        actions={
          <>
            {m.can.cancel && (
              <Button variant="outline" onClick={() => setDialog("cancel")}>
                <XCircleIcon />
                {t("actions.cancel", "Cancel")}
              </Button>
            )}
            {m.can.sendOut && (
              <Button variant="outline" onClick={() => setDialog("vendor")}>
                <TruckIcon />
                {t("maintenance.send_out", "Send to vendor")}
              </Button>
            )}
            {m.can.start && (
              <Button
                variant="outline"
                onClick={() =>
                  run(
                    async () => {
                      await startTicket(m.uniqueId)
                      revalidate()
                    },
                    t("maintenance.started_toast", "Taken out of service")
                  )
                }
              >
                <PlayIcon />
                {t("maintenance.start", "Start internal repair")}
              </Button>
            )}
            {m.can.complete && (
              <Button onClick={() => setDialog("complete")}>
                <CheckCircle2Icon />
                {t("maintenance.complete", "Close ticket")}
              </Button>
            )}
          </>
        }
      />
      <Card>
        <CardContent className="space-y-4">
          <p className="text-sm whitespace-pre-line">{m.description}</p>
          {m.underWarranty && (
            <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
              <ShieldCheckIcon className="size-4" />
              {t(
                "maintenance.warranty_hint",
                "Under warranty — consider the original vendor{{v}}.",
                {
                  v: m.vendorName ? ` (${m.vendorName})` : "",
                }
              )}
            </p>
          )}
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
                <ToneBadge code={m.asset.status} />
                <ToneBadge code={m.asset.condition} />
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
      {dialog === "complete" && (
        <CompleteDialog m={m} onClose={() => setDialog(null)} onDone={done} />
      )}
      {dialog === "vendor" && (
        <Dialog open onOpenChange={(o) => !o && setDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {t("maintenance.send_out", "Send to vendor")}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "maintenance.send_out_hint",
                  "Recorded as repair send-out; the asset is out until it comes back."
                )}
              </DialogDescription>
            </DialogHeader>
            <Field>
              <FieldLabel htmlFor="mv-vendor">
                {t("products.vendor", "Vendor")}
              </FieldLabel>
              <Input
                id="mv-vendor"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
              />
            </Field>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialog(null)}>
                {t("actions.cancel", "Cancel")}
              </Button>
              <Button
                disabled={vendor.trim().length < 2}
                onClick={async () => {
                  const ok = await run(
                    () => sendTicketToVendor(m.uniqueId, vendor.trim()),
                    t("maintenance.sent_toast", "Sent to vendor")
                  )
                  if (ok) done()
                }}
              >
                <TruckIcon />
                {t("maintenance.send_out", "Send to vendor")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {dialog === "cancel" && (
        <ReasonDialog
          title={t("maintenance.cancel_title", "Cancel this ticket?")}
          confirmLabel={t("maintenance.cancel_confirm", "Cancel ticket")}
          destructive
          onClose={() => setDialog(null)}
          onConfirm={async (reason) => {
            const ok = await run(() => cancelTicket(m.uniqueId, reason))
            if (ok) revalidate()
            return ok
          }}
        />
      )}
    </div>
  )
}
