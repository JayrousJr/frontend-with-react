import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { useTranslation } from "react-i18next"
import {
  CheckIcon,
  LogInIcon,
  LogOutIcon,
  PrinterIcon,
  XIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldLabel } from "@/components/ui/field"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { PageHeader } from "@/components/app/page-header"
import { ToneBadge } from "@/components/app/tone-badge"
import { useRun } from "@/components/app/use-run"
import { formatStamp } from "@/lib/format"
import { ROUTES, withId } from "@/routes/routeConstants"
import {
  cancelBooking,
  checkoutBooking,
  createBooking,
  decideBooking,
  fetchBooking,
  fetchBookingAlternatives,
  returnBooking,
  type Booking,
} from "@/services/production"
import { FormDialog, Info, Loading, Section, SimpleTable } from "./ui"
import { useLoad } from "./utils"

const CONDITIONS = [
  "GOOD",
  "FAIR",
  "NEEDS_REPAIR",
  "UNDER_REPAIR",
  "BEYOND_REPAIR",
]

type OutLine = { condition: string; components: string[]; quantity: string }
type InLine = {
  missing: boolean
  condition: string
  returnedQty: string
  note: string
  missingComponents: string[]
}

function Checkout({
  b,
  onClose,
  onDone,
}: {
  b: Booking
  onClose: () => void
  onDone: (b: Booking) => void
}) {
  const { t } = useTranslation()
  const run = useRun()
  const [collector, setCollector] = useState(
    String(b.collectors[0]?.employeeId ?? "")
  )
  const [vehicle, setVehicle] = useState("")
  const [note, setNote] = useState("")
  const [lines, setLines] = useState<Record<number, OutLine>>(
    Object.fromEntries(
      b.lines.map((l) => [
        l.id,
        {
          condition: "GOOD",
          components: l.components,
          quantity: String(l.quantity),
        },
      ])
    )
  )
  const upd = (id: number, patch: Partial<OutLine>) =>
    setLines({ ...lines, [id]: { ...lines[id], ...patch } })
  return (
    <FormDialog
      wide
      title={t("bookings.checkout", "Check out")}
      description={t(
        "bookings.checkout_hint",
        "Record condition and the kit checklist. Consumables are issued to the production."
      )}
      confirmLabel={t("bookings.checkout", "Check out")}
      canConfirm={!!collector}
      onClose={onClose}
      onConfirm={() =>
        run(
          async () =>
            onDone(
              await checkoutBooking(b.uniqueId, {
                collectedByEmployeeId: Number(collector),
                vehicleAssetId: vehicle ? Number(vehicle) : null,
                note: note || null,
                lines: b.lines.map((l) => ({
                  lineId: l.id,
                  condition: l.assetId ? lines[l.id].condition : null,
                  components:
                    l.assetId && l.components.length
                      ? lines[l.id].components
                      : null,
                  quantity: l.assetId ? null : Number(lines[l.id].quantity),
                })),
              })
            ),
          t("bookings.checked_out", "Checked out")
        )
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel>{t("bookings.collected_by", "Collected by")}</FieldLabel>
          <NativeSelect
            className="w-full"
            value={collector}
            onChange={(e) => setCollector(e.target.value)}
          >
            {b.collectors.map((c) => (
              <NativeSelectOption
                key={c.employeeId}
                value={String(c.employeeId)}
              >
                {c.name} ({c.employeeNumber})
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel>{t("bookings.vehicle", "Vehicle")}</FieldLabel>
          <NativeSelect
            className="w-full"
            value={vehicle}
            onChange={(e) => setVehicle(e.target.value)}
          >
            <NativeSelectOption value="">—</NativeSelectOption>
            {b.vehicles.map((v) => (
              <NativeSelectOption key={v.assetId} value={String(v.assetId)}>
                {v.registrationNumber}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <div className="space-y-2">
        {b.lines.map((l) => (
          <div key={l.id} className="rounded-md border p-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono">{l.tag ?? ""}</span> {l.name}
              {l.assetId ? (
                <NativeSelect
                  className="ml-auto"
                  value={lines[l.id].condition}
                  onChange={(e) => upd(l.id, { condition: e.target.value })}
                >
                  {CONDITIONS.map((c) => (
                    <NativeSelectOption key={c} value={c}>
                      {t(`codes.${c}`, c)}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              ) : (
                <Input
                  className="ml-auto w-24"
                  type="number"
                  min={1}
                  max={l.quantity}
                  value={lines[l.id].quantity}
                  onChange={(e) => upd(l.id, { quantity: e.target.value })}
                />
              )}
            </div>
            {l.components.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-3">
                {l.components.map((c) => (
                  <label key={c} className="flex items-center gap-1 text-xs">
                    <Checkbox
                      checked={lines[l.id].components.includes(c)}
                      onCheckedChange={(v) =>
                        upd(l.id, {
                          components:
                            v === true
                              ? [...lines[l.id].components, c]
                              : lines[l.id].components.filter((x) => x !== c),
                        })
                      }
                    />
                    {c}
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <Textarea
        rows={2}
        placeholder={t("common.note", "Note")}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
    </FormDialog>
  )
}

function Return({
  b,
  onClose,
  onDone,
}: {
  b: Booking
  onClose: () => void
  onDone: (b: Booking) => void
}) {
  const { t } = useTranslation()
  const run = useRun()
  const [storeId, setStoreId] = useState(String(b.storeId))
  const [note, setNote] = useState("")
  const [lines, setLines] = useState<Record<number, InLine>>(
    Object.fromEntries(
      b.lines.map((l) => [
        l.id,
        {
          missing: false,
          condition: l.checkoutCondition ?? "GOOD",
          returnedQty: String(l.consumable ? 0 : l.checkedOutQty),
          note: "",
          missingComponents: [],
        },
      ])
    )
  )
  const upd = (id: number, patch: Partial<InLine>) =>
    setLines({ ...lines, [id]: { ...lines[id], ...patch } })
  return (
    <FormDialog
      wide
      title={t("bookings.return", "Receive return")}
      description={t(
        "bookings.return_hint",
        "Compare with the checkout condition. A worse condition creates a damage report (and maintenance ticket); a missing item creates a loss report."
      )}
      confirmLabel={t("bookings.receive", "Receive")}
      onClose={onClose}
      onConfirm={() =>
        run(
          async () =>
            onDone(
              await returnBooking(b.uniqueId, {
                storeId: Number(storeId),
                note: note || null,
                lines: b.lines.map((l) => ({
                  lineId: l.id,
                  missing: l.assetId ? lines[l.id].missing : false,
                  condition:
                    l.assetId && !lines[l.id].missing
                      ? lines[l.id].condition
                      : null,
                  returnedQty: l.assetId
                    ? null
                    : Number(lines[l.id].returnedQty),
                  note: lines[l.id].note || null,
                  missingComponents: lines[l.id].missingComponents,
                })),
              })
            ),
          t("bookings.returned", "Return received")
        )
      }
    >
      <Field>
        <FieldLabel>
          {t("bookings.return_store", "Returned to store")}
        </FieldLabel>
        <NativeSelect
          className="w-full"
          value={storeId}
          onChange={(e) => setStoreId(e.target.value)}
        >
          {b.returnStores.map((s) => (
            <NativeSelectOption key={s.id} value={String(s.id)}>
              {s.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      <div className="space-y-2">
        {b.lines.map((l) => (
          <div key={l.id} className="rounded-md border p-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono">{l.tag ?? ""}</span> {l.name}
              {l.checkoutCondition && (
                <span className="text-xs text-muted-foreground">
                  ({t("bookings.out_as", "out")}:{" "}
                  {t(`codes.${l.checkoutCondition}`, l.checkoutCondition)})
                </span>
              )}
              {l.assetId ? (
                <span className="ml-auto flex items-center gap-2">
                  <label className="flex items-center gap-1 text-xs">
                    <Checkbox
                      checked={lines[l.id].missing}
                      onCheckedChange={(v) =>
                        upd(l.id, { missing: v === true })
                      }
                    />
                    {t("bookings.missing", "Missing")}
                  </label>
                  {!lines[l.id].missing && (
                    <NativeSelect
                      value={lines[l.id].condition}
                      onChange={(e) => upd(l.id, { condition: e.target.value })}
                    >
                      {CONDITIONS.map((c) => (
                        <NativeSelectOption key={c} value={c}>
                          {t(`codes.${c}`, c)}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  )}
                </span>
              ) : (
                <span className="ml-auto flex items-center gap-1 text-xs">
                  {l.consumable
                    ? t("bookings.unused", "Unused returned")
                    : t("bookings.returned_qty", "Returned")}
                  <Input
                    className="w-20"
                    type="number"
                    min={0}
                    max={l.checkedOutQty}
                    value={lines[l.id].returnedQty}
                    onChange={(e) => upd(l.id, { returnedQty: e.target.value })}
                  />
                  / {l.checkedOutQty}
                </span>
              )}
            </div>
            {l.kitChecklist &&
              l.kitChecklist.length > 0 &&
              !lines[l.id].missing && (
                <div className="mt-1 flex flex-wrap gap-3 text-xs">
                  {t("bookings.components_missing", "Components missing")}:
                  {l.kitChecklist
                    .filter((k) => k.present)
                    .map((k) => (
                      <label key={k.tag} className="flex items-center gap-1">
                        <Checkbox
                          checked={lines[l.id].missingComponents.includes(
                            k.tag
                          )}
                          onCheckedChange={(v) =>
                            upd(l.id, {
                              missingComponents:
                                v === true
                                  ? [...lines[l.id].missingComponents, k.tag]
                                  : lines[l.id].missingComponents.filter(
                                      (x) => x !== k.tag
                                    ),
                            })
                          }
                        />
                        {k.tag}
                      </label>
                    ))}
                </div>
              )}
            <Input
              className="mt-1"
              placeholder={t("common.note", "Note")}
              value={lines[l.id].note}
              onChange={(e) => upd(l.id, { note: e.target.value })}
            />
          </div>
        ))}
      </div>
      <Textarea
        rows={2}
        placeholder={t("common.note", "Note")}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
    </FormDialog>
  )
}

/** Storekeeper: free items of the same categories in this store. */
function AlternativesPicker({
  id,
  value,
  onChange,
}: {
  id: string
  value: number[]
  onChange: (v: number[]) => void
}) {
  const { t } = useTranslation()
  const alt = useLoad(() => fetchBookingAlternatives(id), [id])
  if (!alt.data) return <Loading error={alt.error} />
  return (
    <div className="space-y-1">
      <div className="text-sm font-medium">
        {t(
          "bookings.propose",
          "Propose available alternatives (same categories, this store)"
        )}
      </div>
      {alt.data.length === 0 && (
        <p className="text-xs text-muted-foreground">
          {t(
            "bookings.no_alternatives",
            "No free items of the same categories in this store."
          )}
        </p>
      )}
      <div className="max-h-56 space-y-1 overflow-y-auto">
        {alt.data.map((a) => (
          <label
            key={a.assetId}
            className="flex items-start gap-2 rounded border px-2 py-1 text-sm"
          >
            <Checkbox
              checked={value.includes(a.assetId)}
              onCheckedChange={(c) =>
                onChange(
                  c === true
                    ? [...value, a.assetId]
                    : value.filter((x) => x !== a.assetId)
                )
              }
            />
            <span>
              <span className="font-mono">{a.tag}</span> {a.name}
              {a.conflicts.map((c, i) => (
                <span key={i} className="block text-xs text-amber-700">
                  {c}
                </span>
              ))}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}

const BookingDetailsPage = () => {
  const { t } = useTranslation()
  const run = useRun()
  const { uniqueId = "" } = useParams()
  const b = useLoad(() => fetchBooking(uniqueId), [uniqueId])
  const [dialog, setDialog] = useState<
    null | "out" | "in" | "reject" | "cancel"
  >(null)
  const [reason, setReason] = useState("")
  const [alts, setAlts] = useState<number[]>([])
  const navigate = useNavigate()
  if (!b.data) return <Loading error={b.error} />
  const d = b.data
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
          <Link
            className="underline"
            to={withId(ROUTES.PRODUCTION_DETAILS, d.productionUniqueId)}
          >
            {d.production} {d.productionTitle}
          </Link>
        }
        actions={
          <span className="flex flex-wrap gap-2 print:hidden">
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <PrinterIcon />
              {t("bookings.print", "Allocation sheet")}
            </Button>
            {d.can.decide && (
              <>
                <Button
                  size="sm"
                  onClick={() =>
                    run(
                      async () => {
                        await decideBooking(d.uniqueId, "APPROVE")
                        setTimeout(b.reload, 1500)
                      },
                      t("bookings.confirmed", "Confirmed — items reserved")
                    )
                  }
                >
                  <CheckIcon />
                  {t("bookings.confirm", "Confirm")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setReason("")
                    setDialog("reject")
                  }}
                >
                  <XIcon />
                  {t("bookings.reject", "Reject / propose alternative")}
                </Button>
              </>
            )}
            {d.can.checkout && (
              <Button size="sm" onClick={() => setDialog("out")}>
                <LogOutIcon />
                {t("bookings.checkout", "Check out")}
              </Button>
            )}
            {d.can.return && (
              <Button size="sm" onClick={() => setDialog("in")}>
                <LogInIcon />
                {t("bookings.return", "Receive return")}
              </Button>
            )}
            {d.can.cancel && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  setReason("")
                  setDialog("cancel")
                }}
              >
                {t("actions.cancel", "Cancel")}
              </Button>
            )}
          </span>
        }
      />
      <Section title={t("bookings.details", "Booking")}>
        <Info
          items={[
            [t("bookings.store", "Store"), d.store],
            [t("productions.department", "Department"), d.department],
            [
              t("bookings.period", "Period"),
              `${formatStamp(d.fromAt)} – ${formatStamp(d.toAt)}`,
            ],
            [t("bookings.intended_use", "Intended use"), d.intendedUse],
            [t("bookings.requested_by", "Requested by"), d.requestedBy],
            [t("bookings.decided_by", "Decided by"), d.decidedBy],
            [t("bookings.reject_reason", "Reason"), d.rejectReason],
            [
              t("bookings.checked_out_at", "Checked out"),
              d.checkedOutAt
                ? `${formatStamp(d.checkedOutAt)} · ${d.checkedOutBy}`
                : null,
            ],
            [t("bookings.collected_by", "Collected by"), d.collectedBy],
            [t("bookings.vehicle", "Vehicle"), d.vehicle],
            [
              t("bookings.returned_at", "Returned"),
              d.returnedAt
                ? `${formatStamp(d.returnedAt)} · ${d.returnedBy}`
                : null,
            ],
            [
              t("common.note", "Note"),
              [d.checkoutNote, d.returnNote].filter(Boolean).join(" / "),
            ],
          ]}
        />
      </Section>
      {d.alternatives.length > 0 && (
        <Section
          title={t(
            "bookings.alternatives",
            "Alternatives proposed by the store"
          )}
          actions={
            d.status === "REJECTED" && (
              <Button
                size="sm"
                onClick={() =>
                  run(
                    async () => {
                      const nb = await createBooking({
                        productionUniqueId: d.productionUniqueId,
                        departmentId: d.departmentId,
                        storeId: d.storeId,
                        intendedUse: d.intendedUse,
                        lines: d.alternatives.map((a) => ({
                          assetId: a.assetId,
                        })),
                      })
                      navigate(
                        withId(ROUTES.EQUIPMENT_BOOKING_DETAILS, nb.uniqueId)
                      )
                    },
                    t("bookings.sent", "Booking sent to the storekeeper")
                  )
                }
              >
                {t("bookings.book_alternatives", "Book these instead")}
              </Button>
            )
          }
        >
          <ul className="text-sm">
            {d.alternatives.map((a) => (
              <li key={a.assetId}>{a.label}</li>
            ))}
          </ul>
        </Section>
      )}
      <Section title={t("bookings.items", "Items")}>
        <SimpleTable
          head={[
            t("bookings.tag", "Tag"),
            t("bookings.item", "Item"),
            t("productions.quantity", "Qty"),
            t("bookings.out", "Out"),
            t("bookings.in", "Returned"),
            t("bookings.report", "Report"),
          ]}
          rows={d.lines.map((l) => [
            <span className="font-mono">{l.tag ?? "—"}</span>,
            <span>
              {l.name}
              <span className="block text-xs text-muted-foreground">
                {l.category}
                {l.location && ` · ${l.location}`}
                {l.consumable &&
                  ` · ${t("bookings.consumable_short", "consumable")}`}
                {l.kitChecklist &&
                  ` · ${l.kitChecklist.map((k) => `${k.tag}${k.present ? "" : " ✗"}`).join(", ")}`}
              </span>
            </span>,
            l.quantity,
            l.checkoutCondition ? (
              <ToneBadge code={l.checkoutCondition} />
            ) : (
              l.checkedOutQty || ""
            ),
            l.missing ? (
              <ToneBadge code="MISSING" />
            ) : l.returnCondition ? (
              <ToneBadge code={l.returnCondition} />
            ) : d.returnedAt ? (
              l.returnedQty
            ) : (
              ""
            ),
            l.report ? (
              <Link
                className="text-xs underline"
                to={`${ROUTES.CUSTODY}?tab=reports`}
              >
                {l.report.number} ({t(`codes.${l.report.type}`, l.report.type)})
              </Link>
            ) : (
              ""
            ),
          ])}
        />
      </Section>
      {dialog === "out" && (
        <Checkout
          b={d}
          onClose={() => setDialog(null)}
          onDone={(x) => b.set(x)}
        />
      )}
      {dialog === "in" && (
        <Return
          b={d}
          onClose={() => setDialog(null)}
          onDone={(x) => b.set(x)}
        />
      )}
      {(dialog === "reject" || dialog === "cancel") && (
        <FormDialog
          title={
            dialog === "reject"
              ? t("bookings.reject", "Reject / propose alternative")
              : t("bookings.cancel", "Cancel booking")
          }
          description={
            dialog === "reject"
              ? t(
                  "bookings.reject_hint",
                  "Say why, and which alternative items are available."
                )
              : undefined
          }
          confirmLabel={
            dialog === "reject"
              ? t("bookings.reject_btn", "Reject")
              : t("bookings.cancel", "Cancel booking")
          }
          destructive
          canConfirm={!!reason.trim()}
          onClose={() => setDialog(null)}
          onConfirm={() =>
            dialog === "reject"
              ? run(async () => {
                  await decideBooking(d.uniqueId, "REJECT", reason, alts)
                  setTimeout(b.reload, 1500)
                })
              : run(async () => b.set(await cancelBooking(d.uniqueId, reason)))
          }
        >
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          {dialog === "reject" && (
            <AlternativesPicker
              id={d.uniqueId}
              value={alts}
              onChange={setAlts}
            />
          )}
        </FormDialog>
      )}
    </div>
  )
}

export default BookingDetailsPage
