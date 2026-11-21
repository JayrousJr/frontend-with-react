import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router"
import { useTranslation } from "react-i18next"
import {
  CircleHelpIcon,
  SearchCheckIcon,
  Trash2Icon,
  WrenchIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
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
import { ToneBadge } from "@/components/app/tone-badge"
import { useCodeLabel } from "@/components/app/use-code-label"
import { ReasonDialog } from "@/components/app/reason-dialog"
import { useRun } from "@/components/app/use-run"
import { useAuth } from "@/context/auth-context"
import { formatStamp } from "@/lib/format"
import { P, hasPermission } from "@/lib/permissions"
import { ROUTES, withId } from "@/routes/routeConstants"
import {
  fetchStore,
  fetchTickets,
  MAINTENANCE_SOURCES,
  markAssetFound,
  markAssetLost,
  openTicket,
  proposeDisposal,
  type Asset,
  type MaintenanceSource,
  type MaintenanceTicket,
  type Store,
} from "@/services/store"

type Kind = null | "fault" | "dispose" | "lost" | "found"

/** Report fault, propose disposal, mark lost / found (B2 §8, §10, §6.1). */
export function AssetActions({
  asset: a,
  onChanged,
}: {
  asset: Asset
  onChanged: () => void
}) {
  const { t } = useTranslation()
  const label = useCodeLabel()
  const run = useRun()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [kind, setKind] = useState<Kind>(null)
  const [source, setSource] = useState<MaintenanceSource>("FAULT_REPORT")
  const [description, setDescription] = useState("")
  const [method, setMethod] = useState("scrap")
  const [store, setStore] = useState<Store | null>(null)
  const [loc, setLoc] = useState("")
  useEffect(() => {
    if (kind === "found" && a.store)
      void fetchStore(a.store.uniqueId).then(setStore)
  }, [kind, a.store])

  const gone = ["DISPOSED", "PENDING_DISPOSAL"].includes(a.status)
  const canFault =
    hasPermission(user, P.MAINTENANCE_CREATE) && !gone && a.status !== "LOST"
  const canDispose =
    hasPermission(user, P.DISPOSAL_PROPOSE) &&
    ["IN_STORE", "DAMAGED", "MISSING", "LOST"].includes(a.status)
  const canLost = hasPermission(user, P.STORE_MANAGE) && a.status === "MISSING"
  const canFound =
    hasPermission(user, P.STOCK_ADJUST) &&
    (a.status === "MISSING" || a.status === "LOST")

  return (
    <>
      {canFault && (
        <Button variant="outline" onClick={() => setKind("fault")}>
          <WrenchIcon />
          {t("assets.report_fault", "Report fault")}
        </Button>
      )}
      {canLost && (
        <Button variant="outline" onClick={() => setKind("lost")}>
          <CircleHelpIcon />
          {t("assets.mark_lost", "Mark lost")}
        </Button>
      )}
      {canFound && (
        <Button variant="outline" onClick={() => setKind("found")}>
          <SearchCheckIcon />
          {t("assets.mark_found", "Found it")}
        </Button>
      )}
      {canDispose && (
        <Button variant="outline" onClick={() => setKind("dispose")}>
          <Trash2Icon />
          {t("assets.propose_disposal", "Propose disposal")}
        </Button>
      )}

      {kind === "fault" && (
        <Dialog open onOpenChange={(o) => !o && setKind(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {t("assets.report_fault", "Report fault")}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "assets.report_fault_hint",
                  "Opens a maintenance ticket for {{tag}}.",
                  { tag: a.tag }
                )}
              </DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="f-source">
                  {t("maintenance.source", "Source")}
                </FieldLabel>
                <NativeSelect
                  id="f-source"
                  className="w-full"
                  value={source}
                  onChange={(e) =>
                    setSource(e.target.value as MaintenanceSource)
                  }
                >
                  {MAINTENANCE_SOURCES.map((s) => (
                    <NativeSelectOption key={s} value={s}>
                      {label(s)}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="f-desc">
                  {t("assets.fault", "What is wrong?")}
                </FieldLabel>
                <Textarea
                  id="f-desc"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button variant="outline" onClick={() => setKind(null)}>
                {t("actions.cancel", "Cancel")}
              </Button>
              <Button
                disabled={description.trim().length < 3}
                onClick={async () => {
                  let id = ""
                  const ok = await run(
                    async () => {
                      id = (
                        await openTicket({
                          assetUniqueId: a.uniqueId,
                          source,
                          description: description.trim(),
                        })
                      ).uniqueId
                    },
                    t("assets.ticket_opened", "Maintenance ticket opened")
                  )
                  if (ok) navigate(withId(ROUTES.MAINTENANCE_DETAILS, id))
                }}
              >
                <WrenchIcon />
                {t("assets.open_ticket", "Open ticket")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {kind === "dispose" && (
        <ReasonDialog
          title={t("assets.propose_disposal", "Propose disposal")}
          description={t(
            "assets.propose_disposal_hint",
            "The asset is set aside (pending disposal) while the owning department's HOD and the Disposal Committee decide."
          )}
          confirmLabel={t("assets.propose", "Propose")}
          destructive
          canConfirm={method.trim().length >= 2}
          onClose={() => setKind(null)}
          onConfirm={async (reason) => {
            let id = ""
            const ok = await run(
              async () => {
                id = (
                  await proposeDisposal({
                    assetUniqueId: a.uniqueId,
                    reason,
                    method: method.trim(),
                  })
                ).uniqueId
              },
              t("assets.disposal_proposed", "Disposal proposed")
            )
            if (ok) navigate(withId(ROUTES.DISPOSAL_DETAILS, id))
            return ok
          }}
        >
          <Field>
            <FieldLabel htmlFor="d-method">
              {t("disposals.method", "Method")}
            </FieldLabel>
            <NativeSelect
              id="d-method"
              className="w-full"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              {["scrap", "sale", "donation", "destruction", "write-off"].map(
                (m) => (
                  <NativeSelectOption key={m} value={m}>
                    {t(`disposals.method_${m}`, m)}
                  </NativeSelectOption>
                )
              )}
            </NativeSelect>
          </Field>
        </ReasonDialog>
      )}
      {kind === "lost" && (
        <ReasonDialog
          title={t("assets.mark_lost", "Mark lost")}
          description={t(
            "assets.mark_lost_hint",
            "After follow-up the asset was not found. It can be written off through disposal."
          )}
          confirmLabel={t("assets.mark_lost", "Mark lost")}
          destructive
          onClose={() => setKind(null)}
          onConfirm={async (reason) => {
            const ok = await run(
              () => markAssetLost(a.uniqueId, reason),
              t("common.saved", "Saved")
            )
            if (ok) onChanged()
            return ok
          }}
        />
      )}
      {kind === "found" && (
        <ReasonDialog
          title={t("assets.mark_found", "Found it")}
          description={t(
            "assets.mark_found_hint",
            "Puts the asset back into {{store}}.",
            { store: a.store?.name ?? "" }
          )}
          confirmLabel={t("assets.mark_found", "Found it")}
          canConfirm={!!loc}
          onClose={() => setKind(null)}
          onConfirm={async (note) => {
            const ok = await run(
              () => markAssetFound(a.uniqueId, loc, note),
              t("common.saved", "Saved")
            )
            if (ok) onChanged()
            return ok
          }}
        >
          <Field>
            <FieldLabel htmlFor="fd-loc">
              {t("locations.path", "Location")}
            </FieldLabel>
            <NativeSelect
              id="fd-loc"
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
        </ReasonDialog>
      )}
    </>
  )
}

/** Maintenance history of an asset. */
export function AssetMaintenance({ assetUniqueId }: { assetUniqueId: string }) {
  const { t } = useTranslation()
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([])
  useEffect(() => {
    void fetchTickets(undefined, assetUniqueId)
      .then(setTickets)
      .catch(() => setTickets([]))
  }, [assetUniqueId])
  if (!tickets.length) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("nav.maintenance", "Maintenance")}</CardTitle>
      </CardHeader>
      <CardContent className="divide-y text-sm">
        {tickets.map((m) => (
          <Link
            key={m.uniqueId}
            to={withId(ROUTES.MAINTENANCE_DETAILS, m.uniqueId)}
            className="flex flex-wrap items-center gap-2 py-2 hover:bg-muted"
          >
            <span className="font-mono">{m.number}</span>
            <ToneBadge code={m.status} />
            <span className="min-w-0 flex-1 truncate">{m.description}</span>
            <span className="text-xs text-muted-foreground">
              {formatStamp(m.createdAt)}
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
