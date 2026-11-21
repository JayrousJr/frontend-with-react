import { useEffect, useState } from "react"
import { Link, useLoaderData, useRevalidator } from "react-router"
import { useTranslation } from "react-i18next"
import QRCode from "qrcode"
import {
  ArrowRightIcon,
  PackageCheckIcon,
  PrinterIcon,
  ShieldCheckIcon,
  TruckIcon,
  XCircleIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
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
import { ReasonDialog } from "@/components/app/reason-dialog"
import { AsyncPicker, type PickerOption } from "@/components/app/async-picker"
import { useRun } from "@/components/app/use-run"
import { formatStamp } from "@/lib/format"
import { ROUTES, withId } from "@/routes/routeConstants"
import {
  cancelTransfer,
  CONDITIONS,
  dispatchTransfer,
  fetchAssets,
  fetchStore,
  receiveTransfer,
  type AssetCondition,
  type Store,
  type Transfer,
} from "@/services/store"

type Row = {
  qty: string
  condition: AssetCondition | ""
  location: string
  note: string
}

function DispatchDialog({
  tr,
  onClose,
  onDone,
}: {
  tr: Transfer
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation()
  const label = useCodeLabel()
  const run = useRun()
  const [rows, setRows] = useState<Record<number, Row>>(() =>
    Object.fromEntries(
      tr.lines.map((l) => [
        l.lineNo,
        { qty: String(l.quantity), condition: "", location: "", note: "" },
      ])
    )
  )
  const [carriedBy, setCarriedBy] = useState("")
  const [vehicle, setVehicle] = useState<PickerOption | null>(null)
  const [eta, setEta] = useState("")
  const [busy, setBusy] = useState(false)
  const set = (n: number, p: Partial<Row>) =>
    setRows((r) => ({ ...r, [n]: { ...r[n], ...p } }))
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("transfers.dispatch", "Dispatch")}</DialogTitle>
          <DialogDescription>
            {t(
              "transfers.dispatch_hint",
              "Scan or count what leaves. Less than approved releases the rest; 0 means not sent."
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {tr.lines.map((l) => (
            <div
              key={l.lineNo}
              className="grid items-center gap-2 rounded-md border p-2 sm:grid-cols-[1fr_5rem_9rem]"
            >
              <div className="text-sm">
                <div className="font-medium">{l.assetTag ?? l.productName}</div>
                <div className="text-xs text-muted-foreground">
                  {l.assetTag
                    ? l.productName
                    : [l.fromLocation, l.batchNumber]
                        .filter(Boolean)
                        .join(" · ")}
                  {l.components.length > 0 && ` + ${l.components.join(", ")}`}
                </div>
              </div>
              <Input
                type="number"
                min={0}
                max={l.quantity}
                aria-label={t("movements.qty", "Qty")}
                value={rows[l.lineNo].qty}
                onChange={(e) => set(l.lineNo, { qty: e.target.value })}
              />
              {l.assetTag ? (
                <NativeSelect
                  size="sm"
                  className="w-full"
                  aria-label={t("assets.condition", "Condition")}
                  value={rows[l.lineNo].condition}
                  onChange={(e) =>
                    set(l.lineNo, {
                      condition: e.target.value as AssetCondition,
                    })
                  }
                >
                  <NativeSelectOption value="">
                    {t("transfers.condition_same", "Condition unchanged")}
                  </NativeSelectOption>
                  {CONDITIONS.map((c) => (
                    <NativeSelectOption key={c} value={c}>
                      {label(c)}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {t("transfers.of_n", "of {{n}}", { n: l.quantity })}
                </span>
              )}
            </div>
          ))}
        </div>
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="d-carrier">
                {t("transfers.carried_by", "Carried by")}
              </FieldLabel>
              <Input
                id="d-carrier"
                value={carriedBy}
                onChange={(e) => setCarriedBy(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="d-eta">
                {t("transfers.expected", "Expected arrival")}
              </FieldLabel>
              <Input
                id="d-eta"
                type="datetime-local"
                value={eta}
                onChange={(e) => setEta(e.target.value)}
              />
            </Field>
          </div>
          <Field>
            <FieldLabel>
              {t("transfers.vehicle", "Vehicle (optional)")}
            </FieldLabel>
            <AsyncPicker
              selected={vehicle}
              onChange={setVehicle}
              search={async (q) =>
                (
                  await fetchAssets(
                    { vehiclesOnly: true, search: q || undefined },
                    1,
                    20
                  )
                ).data.map((a) => ({
                  value: a.uniqueId,
                  label: a.vehicle?.registrationNumber ?? a.tag,
                  hint: a.product.name,
                }))
              }
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("actions.cancel", "Cancel")}
          </Button>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              const ok = await run(
                () =>
                  dispatchTransfer(tr.uniqueId, {
                    lines: tr.lines.map((l) => ({
                      lineNo: l.lineNo,
                      quantity: Number(rows[l.lineNo].qty || 0),
                      condition: rows[l.lineNo].condition || null,
                    })),
                    carriedBy: carriedBy.trim() || null,
                    vehicleAssetUniqueId: vehicle?.value ?? null,
                    expectedArrival: eta ? new Date(eta).toISOString() : null,
                  }),
                t("transfers.dispatched", "Dispatched")
              )
              setBusy(false)
              if (ok) onDone()
            }}
          >
            <TruckIcon />
            {t("transfers.dispatch", "Dispatch")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ReceiveDialog({
  tr,
  onClose,
  onDone,
}: {
  tr: Transfer
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation()
  const label = useCodeLabel()
  const run = useRun()
  const [store, setStore] = useState<Store | null>(null)
  const open = tr.lines.filter(
    (l) => (l.dispatchedQty ?? 0) > (l.receivedQty ?? 0)
  )
  const [rows, setRows] = useState<Record<number, Row>>(() =>
    Object.fromEntries(
      open.map((l) => [
        l.lineNo,
        {
          qty: String((l.dispatchedQty ?? 0) - (l.receivedQty ?? 0)),
          condition: "",
          location: "",
          note: "",
        },
      ])
    )
  )
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  useEffect(
    () => void fetchStore(tr.toStore.uniqueId).then(setStore),
    [tr.toStore.uniqueId]
  )
  const locations =
    store?.locations.filter((l) => l.kind === "GENERAL" && l.isActive) ?? []
  const set = (n: number, p: Partial<Row>) =>
    setRows((r) => ({ ...r, [n]: { ...r[n], ...p } }))
  const short = open.some(
    (l) =>
      Number(rows[l.lineNo].qty || 0) <
      (l.dispatchedQty ?? 0) - (l.receivedQty ?? 0)
  )
  const valid = open.every(
    (l) => Number(rows[l.lineNo].qty || 0) === 0 || rows[l.lineNo].location
  )
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("transfers.receive", "Confirm receipt")}</DialogTitle>
          <DialogDescription>
            {t(
              "transfers.receive_hint",
              "Count what arrived and where it goes. Anything short becomes a discrepancy for Store Managers."
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {open.map((l) => {
            const max = (l.dispatchedQty ?? 0) - (l.receivedQty ?? 0)
            return (
              <div
                key={l.lineNo}
                className="grid items-center gap-2 rounded-md border p-2 sm:grid-cols-[1fr_5rem_9rem_9rem]"
              >
                <div className="text-sm">
                  <div className="font-medium">
                    {l.assetTag ?? l.productName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("transfers.sent_n", "sent {{n}}", { n: max })}
                    {l.batchNumber ? ` · ${l.batchNumber}` : ""}
                  </div>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={max}
                  aria-label={t("movements.qty", "Qty")}
                  value={rows[l.lineNo].qty}
                  onChange={(e) => set(l.lineNo, { qty: e.target.value })}
                />
                <NativeSelect
                  size="sm"
                  className="w-full"
                  aria-label={t("locations.path", "Location")}
                  value={rows[l.lineNo].location}
                  onChange={(e) => set(l.lineNo, { location: e.target.value })}
                >
                  <NativeSelectOption value="">
                    {t("locations.path", "Location")}
                  </NativeSelectOption>
                  {locations.map((x) => (
                    <NativeSelectOption key={x.uniqueId} value={x.uniqueId}>
                      {x.path}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                {l.assetTag ? (
                  <NativeSelect
                    size="sm"
                    className="w-full"
                    aria-label={t("assets.condition", "Condition")}
                    value={rows[l.lineNo].condition}
                    onChange={(e) =>
                      set(l.lineNo, {
                        condition: e.target.value as AssetCondition,
                      })
                    }
                  >
                    <NativeSelectOption value="">
                      {t("transfers.condition_same", "Condition unchanged")}
                    </NativeSelectOption>
                    {CONDITIONS.map((c) => (
                      <NativeSelectOption key={c} value={c}>
                        {label(c)}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                ) : (
                  <span />
                )}
              </div>
            )
          })}
        </div>
        {short && (
          <Field>
            <FieldLabel htmlFor="r-note">
              {t("transfers.discrepancy_note", "What is missing or damaged?")}
            </FieldLabel>
            <Textarea
              id="r-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("actions.cancel", "Cancel")}
          </Button>
          <Button
            disabled={busy || !valid || (short && note.trim().length < 3)}
            onClick={async () => {
              setBusy(true)
              const ok = await run(
                () =>
                  receiveTransfer(tr.uniqueId, {
                    note: note.trim() || null,
                    lines: open.map((l) => ({
                      lineNo: l.lineNo,
                      quantity: Number(rows[l.lineNo].qty || 0),
                      condition: rows[l.lineNo].condition || null,
                      toLocationUniqueId: rows[l.lineNo].location || null,
                    })),
                  }),
                t("transfers.received", "Receipt confirmed")
              )
              setBusy(false)
              if (ok) onDone()
            }}
          >
            <PackageCheckIcon />
            {t("transfers.receive", "Confirm receipt")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const TransferDetailsPage = () => {
  const { t } = useTranslation()
  const label = useCodeLabel()
  const run = useRun()
  const { revalidate } = useRevalidator()
  const { transfer: tr } = useLoaderData() as { transfer: Transfer }
  const [dialog, setDialog] = useState<
    null | "dispatch" | "receive" | "cancel"
  >(null)
  const [qr, setQr] = useState<string | null>(null)
  useEffect(
    () =>
      void QRCode.toDataURL(tr.number, { margin: 1, width: 120 }).then(setQr),
    [tr.number]
  )
  const done = () => {
    setDialog(null)
    revalidate()
  }
  const info: [string, string | null][] = [
    [t("transfers.reason", "Reason"), label(tr.reason)],
    [
      t("transfers.requested_by", "Requested by"),
      `${tr.requestedBy} · ${formatStamp(tr.createdAt)}`,
    ],
    [
      t("transfers.dispatched_by", "Dispatched by"),
      tr.dispatchedBy && `${tr.dispatchedBy} · ${formatStamp(tr.dispatchedAt)}`,
    ],
    [
      t("transfers.carried_by", "Carried by"),
      [tr.carriedBy, tr.vehicle].filter(Boolean).join(" · ") || null,
    ],
    [
      t("transfers.expected", "Expected arrival"),
      tr.expectedArrival && formatStamp(tr.expectedArrival),
    ],
    [
      t("transfers.received_by", "Received by"),
      tr.receivedBy && `${tr.receivedBy} · ${formatStamp(tr.receivedAt)}`,
    ],
    [t("transfers.note", "Note"), tr.note],
    [t("transfers.discrepancy", "Discrepancy"), tr.discrepancyNote],
  ]
  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          title={
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-mono">{tr.number}</span>
              <ToneBadge code={tr.status} />
              {tr.overdue && (
                <Badge variant="destructive">
                  {t("transfers.overdue", "Overdue")}
                </Badge>
              )}
            </span>
          }
          description={
            <span className="inline-flex items-center gap-1">
              {tr.fromStore.name} <ArrowRightIcon className="size-3" />{" "}
              {tr.toStore.name}
            </span>
          }
          actions={
            <>
              {tr.approvalRequestUniqueId && (
                <Button variant="outline" asChild>
                  <Link
                    to={withId(
                      ROUTES.APPROVAL_DETAILS,
                      tr.discrepancyRequestUniqueId ??
                        tr.approvalRequestUniqueId
                    )}
                  >
                    <ShieldCheckIcon />
                    {t("products.open_approval", "Approval")}
                  </Link>
                </Button>
              )}
              <Button variant="outline" onClick={() => window.print()}>
                <PrinterIcon />
                {t("transfers.print", "Transfer note")}
              </Button>
              {tr.can.cancel && (
                <Button variant="outline" onClick={() => setDialog("cancel")}>
                  <XCircleIcon />
                  {t("actions.cancel", "Cancel")}
                </Button>
              )}
              {tr.can.dispatch && (
                <Button onClick={() => setDialog("dispatch")}>
                  <TruckIcon />
                  {t("transfers.dispatch", "Dispatch")}
                </Button>
              )}
              {tr.can.receive && (
                <Button onClick={() => setDialog("receive")}>
                  <PackageCheckIcon />
                  {t("transfers.receive", "Confirm receipt")}
                </Button>
              )}
            </>
          }
        />
      </div>
      <div className="hidden items-center justify-between print:flex">
        <div>
          <div className="text-xs uppercase">
            AzamTV — {t("transfers.print", "Transfer note")}
          </div>
          <div className="font-mono text-2xl font-bold">{tr.number}</div>
          <div>
            {tr.fromStore.name} → {tr.toStore.name}
          </div>
        </div>
        {qr && <img src={qr} alt="" className="size-24" />}
      </div>
      {tr.problem && (
        <Alert variant="destructive">
          <XCircleIcon />
          <AlertDescription>{tr.problem}</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {info
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("transfers.lines", "Lines")}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>{t("products.product", "Product")}</TableHead>
                <TableHead>{t("transfers.from_location", "From")}</TableHead>
                <TableHead className="text-right">
                  {t("transfers.requested", "Requested")}
                </TableHead>
                <TableHead className="text-right">
                  {t("transfers.sent", "Sent")}
                </TableHead>
                <TableHead className="text-right">
                  {t("transfers.received_qty", "Received")}
                </TableHead>
                <TableHead>{t("transfers.to_location", "To")}</TableHead>
                <TableHead>{t("assets.condition", "Condition")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tr.lines.map((l) => (
                <TableRow key={l.lineNo}>
                  <TableCell className="tabular-nums">{l.lineNo}</TableCell>
                  <TableCell>
                    {l.assetUniqueId ? (
                      <Link
                        className="font-mono underline"
                        to={withId(ROUTES.ASSET_DETAILS, l.assetUniqueId)}
                      >
                        {l.assetTag}
                      </Link>
                    ) : null}
                    <div>{l.productName}</div>
                    <div className="text-xs text-muted-foreground">
                      {[
                        l.productCode,
                        l.batchNumber,
                        l.components.length
                          ? `+ ${l.components.join(", ")}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </TableCell>
                  <TableCell>{l.fromLocation ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {l.quantity}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {l.dispatchedQty ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {l.receivedQty ?? "—"}
                  </TableCell>
                  <TableCell>{l.toLocation ?? "—"}</TableCell>
                  <TableCell>
                    {l.receivedCondition ? (
                      <ToneBadge code={l.receivedCondition} />
                    ) : l.dispatchCondition ? (
                      <ToneBadge code={l.dispatchCondition} />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className="hidden grid-cols-2 gap-8 pt-12 text-sm print:grid">
        <div className="border-t pt-2">
          {t(
            "transfers.sign_dispatch",
            "Dispatched by (name, signature, date)"
          )}
        </div>
        <div className="border-t pt-2">
          {t("transfers.sign_receive", "Received by (name, signature, date)")}
        </div>
      </div>

      {dialog === "dispatch" && (
        <DispatchDialog tr={tr} onClose={() => setDialog(null)} onDone={done} />
      )}
      {dialog === "receive" && (
        <ReceiveDialog tr={tr} onClose={() => setDialog(null)} onDone={done} />
      )}
      {dialog === "cancel" && (
        <ReasonDialog
          title={t("transfers.cancel_title", "Cancel this transfer?")}
          description={t(
            "transfers.cancel_hint",
            "Reserved stock is released."
          )}
          confirmLabel={t("transfers.cancel_confirm", "Cancel transfer")}
          destructive
          onClose={() => setDialog(null)}
          onConfirm={async (reason) => {
            const ok = await run(
              () => cancelTransfer(tr.uniqueId, reason),
              t("transfers.cancelled", "Cancelled")
            )
            if (ok) revalidate()
            return ok
          }}
        />
      )}
    </div>
  )
}

export default TransferDetailsPage
