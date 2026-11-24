import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { useTranslation } from "react-i18next"
import {
  FileTextIcon,
  PackageCheckIcon,
  PencilIcon,
  PrinterIcon,
  ReceiptIcon,
  SendIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader } from "@/components/app/page-header"
import { ToneBadge } from "@/components/app/tone-badge"
import { useRun } from "@/components/app/use-run"
import { formatDay, formatStamp } from "@/lib/format"
import { ROUTES, withId } from "@/routes/routeConstants"
import type { UploadedFile } from "@/services/products"
import {
  amendOrder,
  cancelOrder,
  fetchOrder,
  issueOrder,
  receiveGoods,
  registerInvoice,
  updateOrder,
  type Order,
} from "@/services/procurement"
import { FileUpload, Files, FormDialog, Info, Loading } from "./shared"
import { tzs, useLoad } from "./shared-utils"
import { Documents } from "./documents"

type GrnLineDraft = {
  delivered: string
  rejected: string
  reason: string
  batch: string
  expiry: string
  serials: string
  warranty: string
  photos: UploadedFile[]
}

function ReceiveDialog({
  o,
  onClose,
  onDone,
}: {
  o: Order
  onClose: () => void
  onDone: (grnId: string) => void
}) {
  const { t } = useTranslation()
  const run = useRun()
  const [note, setNote] = useState({
    no: "",
    text: "",
    files: [] as UploadedFile[],
  })
  const [lines, setLines] = useState<Record<number, GrnLineDraft>>(
    Object.fromEntries(
      o.lines
        .filter((l) => l.outstandingQty > 0)
        .map((l) => [
          l.lineNo,
          {
            delivered: String(l.outstandingQty),
            rejected: "0",
            reason: "",
            batch: "",
            expiry: "",
            serials: "",
            warranty: "",
            photos: [],
          },
        ])
    )
  )
  const set = (n: number, k: keyof GrnLineDraft, v: string | UploadedFile[]) =>
    setLines((p) => ({ ...p, [n]: { ...p[n], [k]: v } }))
  return (
    <FormDialog
      wide
      title={t("grn.receive", "Receive goods (GRN)")}
      description={t(
        "grn.hint",
        "Main store only. Received quantity goes to quarantine until the owning department inspects it. Wrong or damaged items refused at the door: record them with a reason and photos."
      )}
      confirmLabel={t("grn.record", "Record GRN")}
      onClose={onClose}
      onConfirm={async () => {
        let id = ""
        const ok = await run(
          async () => {
            const g = await receiveGoods(o.uniqueId, {
              deliveryNoteNo: note.no || null,
              deliveryNoteFileUniqueId: note.files[0]?.uniqueId ?? null,
              note: note.text || null,
              lines: Object.entries(lines).map(([n, l]) => ({
                lineNo: Number(n),
                deliveredQty: Number(l.delivered) || 0,
                rejectedQty: Number(l.rejected) || 0,
                rejectReason: l.reason || null,
                photoFileUniqueIds: l.photos.map((p) => p.uniqueId),
                batchNumber: l.batch || null,
                expiryDate: l.expiry || null,
                serialNumbers: l.serials
                  .split(/[\s,;]+/)
                  .map((s) => s.trim())
                  .filter(Boolean),
                warrantyMonths: l.warranty ? Number(l.warranty) : null,
              })),
            })
            id = g.uniqueId
          },
          t("grn.recorded", "GRN recorded; inspection assigned")
        )
        if (ok) onDone(id)
        return ok
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="gr-dn">
            {t("grn.delivery_note", "Delivery note number")}
          </FieldLabel>
          <Input
            id="gr-dn"
            value={note.no}
            onChange={(e) => setNote({ ...note, no: e.target.value })}
          />
        </Field>
        <Field>
          <FieldLabel>
            {t("grn.delivery_note_file", "Delivery note (scan)")}
          </FieldLabel>
          <FileUpload
            multiple={false}
            folder="grn"
            files={note.files}
            onChange={(files) => setNote({ ...note, files })}
          />
        </Field>
      </div>
      {o.lines
        .filter((l) => lines[l.lineNo])
        .map((l) => {
          const d = lines[l.lineNo]
          const received =
            (Number(d.delivered) || 0) - (Number(d.rejected) || 0)
          return (
            <div key={l.lineNo} className="space-y-2 rounded-md border p-3">
              <div className="text-sm font-medium">
                {l.lineNo}. {l.productName}{" "}
                <span className="font-normal text-muted-foreground">
                  ({t("grn.outstanding", "outstanding")} {l.outstandingQty}{" "}
                  {l.unit})
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <Field>
                  <FieldLabel>{t("grn.delivered", "Delivered")}</FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    value={d.delivered}
                    onChange={(e) => set(l.lineNo, "delivered", e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>
                    {t("grn.refused", "Refused (wrong / damaged)")}
                  </FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    value={d.rejected}
                    onChange={(e) => set(l.lineNo, "rejected", e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>
                    {t("grn.to_quarantine", "To quarantine")}
                  </FieldLabel>
                  <Input disabled value={String(received)} />
                </Field>
              </div>
              {Number(d.rejected) > 0 && (
                <>
                  <Input
                    placeholder={t("grn.refuse_reason", "Reason for refusing")}
                    value={d.reason}
                    onChange={(e) => set(l.lineNo, "reason", e.target.value)}
                  />
                  <FileUpload
                    files={d.photos}
                    folder="grn"
                    accept="image/*"
                    onChange={(p) => set(l.lineNo, "photos", p)}
                  />
                </>
              )}
              {l.trackingType === "SERIALISED" && received > 0 && (
                <div className="grid gap-2 sm:grid-cols-[1fr_10rem]">
                  <Textarea
                    rows={2}
                    placeholder={t(
                      "grn.serials",
                      "Serial numbers ({{n}}), one per line or comma-separated",
                      { n: received }
                    )}
                    value={d.serials}
                    onChange={(e) => set(l.lineNo, "serials", e.target.value)}
                  />
                  <Input
                    type="number"
                    min={0}
                    placeholder={t("grn.warranty", "Warranty (months)")}
                    value={d.warranty}
                    onChange={(e) => set(l.lineNo, "warranty", e.target.value)}
                  />
                </div>
              )}
              {l.trackingType === "BATCH" && received > 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder={t("grn.batch", "Batch number")}
                    value={d.batch}
                    onChange={(e) => set(l.lineNo, "batch", e.target.value)}
                  />
                  <Input
                    type="date"
                    aria-label={t("grn.expiry", "Expiry date")}
                    value={d.expiry}
                    onChange={(e) => set(l.lineNo, "expiry", e.target.value)}
                  />
                </div>
              )}
            </div>
          )
        })}
      <Textarea
        rows={2}
        placeholder={t("common.note", "Note")}
        value={note.text}
        onChange={(e) => setNote({ ...note, text: e.target.value })}
      />
    </FormDialog>
  )
}

const OrderDetailsPage = () => {
  const { t } = useTranslation()
  const run = useRun()
  const navigate = useNavigate()
  const { uniqueId = "" } = useParams()
  const x = useLoad(() => fetchOrder(uniqueId), [uniqueId])
  const [dialog, setDialog] = useState<
    null | "edit" | "amend" | "cancel" | "receive" | "invoice"
  >(null)
  const [edit, setEdit] = useState({ deliveryDate: "", instructions: "" })
  const [amend, setAmend] = useState<{
    reason: string
    deliveryDate: string
    instructions: string
    lines: Record<number, { quantity: string; unitPrice: string }>
  }>({ reason: "", deliveryDate: "", instructions: "", lines: {} })
  const [cancel, setCancel] = useState({ reason: "", reaward: true })
  const [inv, setInv] = useState({
    no: "",
    date: new Date().toISOString().slice(0, 10),
    amount: "",
    vat: "",
    files: [] as UploadedFile[],
  })
  if (!x.data) return <Loading error={x.error} />
  const o = x.data
  const act = (fn: () => Promise<Order>, ok?: string) =>
    run(async () => x.set(await fn()), ok)
  const pending = o.amendments.find(
    (a) => a.status === "IN_APPROVAL" || a.status === "AWAITING_ACKNOWLEDGEMENT"
  )
  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          title={
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-mono">{o.number}</span>
              {o.revision > 0 && (
                <span className="text-base text-muted-foreground">
                  rev {o.revision}
                </span>
              )}
              <ToneBadge code={o.status} />
              {o.overdue && (
                <Badge variant="destructive">
                  {t("orders.overdue", "Overdue")}
                </Badge>
              )}
            </span>
          }
          description={`${o.vendor?.name ?? o.shopName ?? ""} · ${o.kind === "CASH" ? t("orders.cash", "Cash purchase") : (o.tender?.number ?? "")} · ${tzs(o.totalInclVat)}`}
          actions={
            <>
              <Button variant="outline" onClick={() => window.print()}>
                <PrinterIcon />
                {o.kind === "CASH"
                  ? t("orders.print_cash", "Print")
                  : t("orders.print", "Print LPO")}
              </Button>
              {o.approvalUniqueId && (
                <Button variant="outline" asChild>
                  <Link
                    to={withId(ROUTES.APPROVAL_DETAILS, o.approvalUniqueId)}
                  >
                    <ShieldCheckIcon />
                    {t("products.open_approval", "Approval")}
                  </Link>
                </Button>
              )}
              {o.can.edit && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setEdit({
                      deliveryDate: o.deliveryDate?.slice(0, 10) ?? "",
                      instructions: o.instructions ?? "",
                    })
                    setDialog("edit")
                  }}
                >
                  <PencilIcon />
                  {t("actions.edit", "Edit")}
                </Button>
              )}
              {o.can.amend && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setAmend({
                      reason: "",
                      deliveryDate: o.deliveryDate?.slice(0, 10) ?? "",
                      instructions: o.instructions ?? "",
                      lines: Object.fromEntries(
                        o.lines.map((l) => [
                          l.lineNo,
                          {
                            quantity: String(l.quantity),
                            unitPrice: String(l.unitPrice),
                          },
                        ])
                      ),
                    })
                    setDialog("amend")
                  }}
                >
                  <FileTextIcon />
                  {t("orders.amend", "Amend")}
                </Button>
              )}
              {o.can.cancel && (
                <Button variant="outline" onClick={() => setDialog("cancel")}>
                  <XCircleIcon />
                  {t("actions.cancel", "Cancel")}
                </Button>
              )}
              {o.can.registerInvoice && (
                <Button variant="outline" onClick={() => setDialog("invoice")}>
                  <ReceiptIcon />
                  {t("invoices.register", "Register invoice")}
                </Button>
              )}
              {o.can.receive && (
                <Button onClick={() => setDialog("receive")}>
                  <PackageCheckIcon />
                  {t("grn.receive", "Receive goods (GRN)")}
                </Button>
              )}
              {o.can.issue && (
                <Button
                  onClick={() =>
                    act(
                      () => issueOrder(o.uniqueId),
                      t("orders.sent", "Sent for issue")
                    )
                  }
                >
                  <SendIcon />
                  {t("orders.issue", "Issue LPO")}
                </Button>
              )}
            </>
          }
        />
      </div>

      <div className="hidden justify-between print:flex">
        <div>
          <div className="text-xs uppercase">
            AzamTV —{" "}
            {o.kind === "CASH"
              ? t("orders.cash", "Cash purchase")
              : t("orders.lpo_long", "Local Purchase Order")}
          </div>
          <div className="font-mono text-2xl font-bold">
            {o.number}
            {o.revision > 0 && ` rev ${o.revision}`}
          </div>
        </div>
        <div className="text-right text-sm">
          <div className="font-medium">{o.vendor?.name ?? o.shopName}</div>
          {o.vendor && (
            <div>
              {o.vendor.number}
              {o.vendor.tin && ` · TIN ${o.vendor.tin}`}
            </div>
          )}
          {o.vendor?.address && <div>{o.vendor.address}</div>}
        </div>
      </div>

      {pending && (
        <Card className="border-amber-500/40 print:hidden">
          <CardContent className="text-sm">
            {t(
              "orders.amendment_pending",
              "Amendment rev {{r}} is {{s}}: the previous version stays in force until the vendor acknowledges.",
              {
                r: pending.revision,
                s: pending.status.toLowerCase().replace(/_/g, " "),
              }
            )}{" "}
            {pending.approvalUniqueId && (
              <Link
                className="underline"
                to={withId(ROUTES.APPROVAL_DETAILS, pending.approvalUniqueId)}
              >
                {t("products.open_approval", "Approval")}
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <Info
            items={[
              [
                t("orders.deliver_to", "Deliver to"),
                `${o.store.name}${o.store.address ? `, ${o.store.address}` : ""}`,
              ],
              [t("orders.delivery", "Delivery by"), formatDay(o.deliveryDate)],
              [
                t("orders.tender", "Tender"),
                o.tender && (
                  <Link
                    className="underline print:no-underline"
                    to={withId(ROUTES.TENDER_DETAILS, o.tender.uniqueId)}
                  >
                    {o.tender.number} — {o.tender.title}
                  </Link>
                ),
              ],
              [
                t("orders.issued", "Issued"),
                o.issuedAt && formatStamp(o.issuedAt),
              ],
              [
                t("orders.acknowledged", "Acknowledged by the vendor"),
                o.acknowledgedAt &&
                  `${formatStamp(o.acknowledgedAt)} · ${o.acknowledgedBy ?? ""}`,
              ],
              [
                t("orders.instructions", "Delivery instructions"),
                o.instructions,
              ],
              [t("orders.cancelled", "Cancelled"), o.cancelReason],
            ]}
          />
          {o.receipts.length > 0 && (
            <div className="mt-3 text-sm">
              {t("purchasing.receipts", "Receipts")}:{" "}
              <Files files={o.receipts} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>{t("products.product", "Product")}</TableHead>
                <TableHead className="text-right">
                  {t("common.quantity", "Qty")}
                </TableHead>
                <TableHead className="text-right">
                  {t("orders.unit", "Unit price")}
                </TableHead>
                <TableHead className="text-right">
                  {t("orders.excl", "Excl. VAT")}
                </TableHead>
                <TableHead className="text-right">VAT</TableHead>
                <TableHead className="text-right">
                  {t("orders.total", "Total incl. VAT")}
                </TableHead>
                <TableHead className="text-right print:hidden">
                  {t("orders.received", "Received / passed")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {o.lines.map((l) => (
                <TableRow key={l.lineNo}>
                  <TableCell>{l.lineNo}</TableCell>
                  <TableCell>
                    {l.productName}
                    <div className="text-xs text-muted-foreground">
                      {[l.productCode, l.brand, l.model, l.description]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {l.quantity} {l.unit}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {tzs(l.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {tzs(l.lineExclVat)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {tzs(l.lineVat)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {tzs(l.lineTotal)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap print:hidden">
                    {l.receivedQty} / {l.passedQty}
                    {l.failedQty > 0 && (
                      <span className="text-destructive">
                        {" "}
                        ({l.failedQty} {t("orders.failed", "failed")})
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={4} className="text-right">
                  {t("orders.totals", "Totals (TZS)")}
                </TableCell>
                <TableCell className="text-right">
                  {tzs(o.totalExclVat)}
                </TableCell>
                <TableCell className="text-right">{tzs(o.totalVat)}</TableCell>
                <TableCell className="text-right font-bold">
                  {tzs(o.totalInclVat)}
                </TableCell>
                <TableCell className="print:hidden" />
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <div className="hidden grid-cols-2 gap-8 pt-12 text-sm print:grid">
        <div className="border-t pt-2">
          {t("orders.sign_proc", "Procurement Officer (name, signature, date)")}
        </div>
        <div className="border-t pt-2">
          {t(
            "orders.sign_vendor",
            "Vendor acknowledgement (name, signature, date)"
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 print:hidden">
        <Card>
          <CardHeader>
            <CardTitle>
              {t("orders.receiving", "Receiving and invoices")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {o.grns.length + o.invoices.length === 0 && (
              <p className="text-muted-foreground">—</p>
            )}
            {o.grns.map((g) => (
              <div key={g.uniqueId} className="flex items-center gap-2">
                <Link
                  className="font-mono underline"
                  to={withId(ROUTES.GRN_DETAILS, g.uniqueId)}
                >
                  {g.number}
                </Link>
                <ToneBadge code={g.status} />
                <span className="text-muted-foreground">
                  {formatStamp(g.receivedAt)}
                </span>
              </div>
            ))}
            {o.invoices.map((i) => (
              <div key={i.uniqueId} className="flex items-center gap-2">
                <Link
                  className="underline"
                  to={withId(ROUTES.INVOICE_DETAILS, i.uniqueId)}
                >
                  {t("invoices.invoice", "Invoice")} {i.vendorInvoiceNo}
                </Link>
                <ToneBadge code={i.status} />
                <span>{tzs(i.amountInclVat)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("orders.revisions", "Amendments")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {o.amendments.length === 0 && (
              <p className="text-muted-foreground">—</p>
            )}
            {o.amendments.map((a) => (
              <div key={a.uniqueId} className="rounded-md border p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">rev {a.revision}</span>
                  <ToneBadge code={a.status} />
                  {a.increasesValue && (
                    <Badge variant="secondary">
                      {t("orders.increase", "value increase (CEO)")}
                    </Badge>
                  )}
                  <span className="text-muted-foreground">
                    {formatStamp(a.createdAt)}
                  </span>
                </div>
                <p>{a.reason}</p>
                <ul className="text-xs text-muted-foreground">
                  {a.after.lines.map((n) => {
                    const b = a.before.lines.find((x) => x.lineNo === n.lineNo)
                    if (
                      !b ||
                      (b.quantity === n.quantity && b.unitPrice === n.unitPrice)
                    )
                      return null
                    return (
                      <li key={n.lineNo}>
                        {t("purchasing.line", "line")} {n.lineNo}: {b.quantity}{" "}
                        × {tzs(b.unitPrice)} → {n.quantity} × {tzs(n.unitPrice)}
                      </li>
                    )
                  })}
                  {a.before.deliveryDate !== a.after.deliveryDate && (
                    <li>
                      {t("orders.delivery", "Delivery by")}:{" "}
                      {formatDay(a.before.deliveryDate)} →{" "}
                      {formatDay(a.after.deliveryDate)}
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <div className="print:hidden">
        <Documents type="PurchaseOrder" id={o.uniqueId} />
      </div>

      {dialog === "edit" && (
        <FormDialog
          title={t("actions.edit", "Edit")}
          confirmLabel={t("actions.save", "Save")}
          onClose={() => setDialog(null)}
          onConfirm={() =>
            act(() =>
              updateOrder(o.uniqueId, {
                deliveryDate: edit.deliveryDate || null,
                instructions: edit.instructions,
              })
            )
          }
        >
          <Field>
            <FieldLabel htmlFor="oe-d">
              {t("orders.delivery", "Delivery by")}
            </FieldLabel>
            <Input
              id="oe-d"
              type="date"
              value={edit.deliveryDate}
              onChange={(e) =>
                setEdit({ ...edit, deliveryDate: e.target.value })
              }
            />
          </Field>
          <Textarea
            rows={3}
            placeholder={t("orders.instructions", "Delivery instructions")}
            value={edit.instructions}
            onChange={(e) => setEdit({ ...edit, instructions: e.target.value })}
          />
        </FormDialog>
      )}
      {dialog === "amend" && (
        <FormDialog
          wide
          title={t("orders.amend", "Amend")}
          description={t(
            "orders.amend_hint",
            "Allowed: delivery date and instructions, quantity decrease, and quantity or price changes within the awarded tender line (never above the awarded price, never new items). A value increase also needs the CEO; the vendor acknowledges the new version."
          )}
          confirmLabel={t("orders.send_amendment", "Send for approval")}
          canConfirm={amend.reason.trim().length >= 5}
          onClose={() => setDialog(null)}
          onConfirm={() =>
            act(
              () =>
                amendOrder(o.uniqueId, {
                  reason: amend.reason,
                  deliveryDate: amend.deliveryDate || null,
                  instructions: amend.instructions,
                  lines: Object.entries(amend.lines).map(([n, l]) => ({
                    lineNo: Number(n),
                    quantity: Number(l.quantity),
                    unitPrice: Number(l.unitPrice),
                  })),
                }),
              t("orders.amendment_sent", "Amendment sent for approval")
            )
          }
        >
          {o.lines.map((l) => (
            <div
              key={l.lineNo}
              className="grid items-end gap-2 sm:grid-cols-[1fr_7rem_10rem]"
            >
              <div className="text-sm">
                {l.lineNo}. {l.productName}
                <div className="text-xs text-muted-foreground">
                  {t("orders.award_limits", "awarded")}:{" "}
                  {l.awardedQuantity ?? "—"} × {tzs(l.awardedUnitPrice)}
                </div>
              </div>
              <Input
                type="number"
                aria-label={t("common.quantity", "Qty")}
                value={amend.lines[l.lineNo].quantity}
                onChange={(e) =>
                  setAmend({
                    ...amend,
                    lines: {
                      ...amend.lines,
                      [l.lineNo]: {
                        ...amend.lines[l.lineNo],
                        quantity: e.target.value,
                      },
                    },
                  })
                }
              />
              <Input
                type="number"
                aria-label={t("orders.unit", "Unit price")}
                value={amend.lines[l.lineNo].unitPrice}
                onChange={(e) =>
                  setAmend({
                    ...amend,
                    lines: {
                      ...amend.lines,
                      [l.lineNo]: {
                        ...amend.lines[l.lineNo],
                        unitPrice: e.target.value,
                      },
                    },
                  })
                }
              />
            </div>
          ))}
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              type="date"
              aria-label={t("orders.delivery", "Delivery by")}
              value={amend.deliveryDate}
              onChange={(e) =>
                setAmend({ ...amend, deliveryDate: e.target.value })
              }
            />
            <Input
              placeholder={t("orders.instructions", "Delivery instructions")}
              value={amend.instructions}
              onChange={(e) =>
                setAmend({ ...amend, instructions: e.target.value })
              }
            />
          </div>
          <Textarea
            rows={2}
            placeholder={t("common.reason", "Reason")}
            value={amend.reason}
            onChange={(e) => setAmend({ ...amend, reason: e.target.value })}
          />
        </FormDialog>
      )}
      {dialog === "cancel" && (
        <FormDialog
          title={t("orders.cancel_title", "Cancel this LPO?")}
          description={
            o.status === "DRAFT"
              ? undefined
              : t(
                  "orders.cancel_hint",
                  "The CEO approves the cancellation. Re-award gives the items to the next-ranked compliant vendor (new draft LPO)."
                )
          }
          confirmLabel={t("orders.cancel_confirm", "Cancel LPO")}
          destructive
          canConfirm={cancel.reason.trim().length >= 5}
          onClose={() => setDialog(null)}
          onConfirm={() =>
            act(() => cancelOrder(o.uniqueId, cancel.reason, cancel.reaward))
          }
        >
          <Textarea
            rows={3}
            placeholder={t("common.reason", "Reason")}
            value={cancel.reason}
            onChange={(e) => setCancel({ ...cancel, reason: e.target.value })}
          />
          {o.kind === "TENDER" && o.status !== "DRAFT" && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={cancel.reaward}
                onCheckedChange={(v) =>
                  setCancel({ ...cancel, reaward: v === true })
                }
              />
              {t(
                "orders.reaward",
                "Re-award to the next-ranked compliant vendor"
              )}
            </label>
          )}
        </FormDialog>
      )}
      {dialog === "receive" && (
        <ReceiveDialog
          o={o}
          onClose={() => setDialog(null)}
          onDone={(id) => navigate(withId(ROUTES.GRN_DETAILS, id))}
        />
      )}
      {dialog === "invoice" && (
        <FormDialog
          title={t("invoices.register", "Register invoice")}
          confirmLabel={t("actions.save", "Save")}
          canConfirm={
            !!inv.no.trim() && Number(inv.amount) > 0 && Number(inv.vat) >= 0
          }
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            let id = ""
            const ok = await run(async () => {
              id = (
                await registerInvoice(o.uniqueId, {
                  vendorInvoiceNo: inv.no,
                  invoiceDate: inv.date,
                  amountInclVat: Number(inv.amount),
                  vatAmount: Number(inv.vat),
                  fileUniqueId: inv.files[0]?.uniqueId ?? null,
                })
              ).uniqueId
            })
            if (ok) navigate(withId(ROUTES.INVOICE_DETAILS, id))
            return ok
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="iv-no">
                {t("invoices.number", "Vendor invoice number")}
              </FieldLabel>
              <Input
                id="iv-no"
                value={inv.no}
                onChange={(e) => setInv({ ...inv, no: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="iv-d">
                {t("invoices.date", "Invoice date")}
              </FieldLabel>
              <Input
                id="iv-d"
                type="date"
                value={inv.date}
                onChange={(e) => setInv({ ...inv, date: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="iv-a">
                {t("invoices.amount", "Amount incl. VAT (TZS)")}
              </FieldLabel>
              <Input
                id="iv-a"
                type="number"
                value={inv.amount}
                onChange={(e) => setInv({ ...inv, amount: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="iv-v">
                {t("invoices.vat", "VAT amount (TZS)")}
              </FieldLabel>
              <Input
                id="iv-v"
                type="number"
                value={inv.vat}
                onChange={(e) => setInv({ ...inv, vat: e.target.value })}
              />
            </Field>
          </div>
          <FileUpload
            multiple={false}
            folder="invoices"
            files={inv.files}
            onChange={(files) => setInv({ ...inv, files })}
          />
        </FormDialog>
      )}
    </div>
  )
}

export default OrderDetailsPage
