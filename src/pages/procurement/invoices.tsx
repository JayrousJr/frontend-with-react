import { useState } from "react"
import { Link, useParams } from "react-router"
import { useTranslation } from "react-i18next"
import { BanknoteIcon, SendIcon, ShieldCheckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
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
import { useRun } from "@/components/app/use-run"
import { formatDay, formatStamp } from "@/lib/format"
import { ROUTES, withId } from "@/routes/routeConstants"
import type { UploadedFile } from "@/services/products"
import {
  fetchInvoice,
  fetchInvoices,
  recordPayment,
  requestPayment,
  type Invoice,
} from "@/services/procurement"
import { FileUpload, Files, FormDialog, Info, Loading } from "./shared"
import { tzs, useLoad } from "./shared-utils"

export const InvoicesPage = () => {
  const { t } = useTranslation()
  const rows = useLoad(fetchInvoices)
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("invoices.title", "Invoices and payments")}
        description={t(
          "invoices.subtitle",
          "Finance registers vendor invoices (from the LPO page), checks the three-way match, gets the payment approved and records the payment manually."
        )}
      />
      <Card className="py-0">
        <CardContent className="overflow-x-auto p-0">
          {!rows.data ? (
            <div className="p-6">
              <Loading error={rows.error} />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("invoices.invoice", "Invoice")}</TableHead>
                  <TableHead>{t("vendors.vendor", "Vendor")}</TableHead>
                  <TableHead className="text-right">
                    {t("invoices.amount", "Amount incl. VAT (TZS)")}
                  </TableHead>
                  <TableHead>{t("invoices.match", "Match")}</TableHead>
                  <TableHead>{t("common.status", "Status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      {t("invoices.none", "No invoices yet.")}
                    </TableCell>
                  </TableRow>
                )}
                {rows.data.map((i) => (
                  <TableRow key={i.uniqueId}>
                    <TableCell>
                      <Link
                        className="hover:underline"
                        to={withId(ROUTES.INVOICE_DETAILS, i.uniqueId)}
                      >
                        {i.vendorInvoiceNo}
                      </Link>
                      <div className="font-mono text-xs text-muted-foreground">
                        {i.order.number} · {formatDay(i.invoiceDate)}
                      </div>
                    </TableCell>
                    <TableCell>{i.vendor}</TableCell>
                    <TableCell className="text-right">
                      {tzs(i.amountInclVat)}
                    </TableCell>
                    <TableCell>
                      {i.match.matched
                        ? "✓"
                        : i.match.overInvoiced
                          ? t("invoices.over", "Over-invoiced")
                          : t("invoices.partial", "Goods pending")}
                    </TableCell>
                    <TableCell>
                      <ToneBadge code={i.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export const InvoiceDetailsPage = () => {
  const { t } = useTranslation()
  const run = useRun()
  const { uniqueId = "" } = useParams()
  const x = useLoad(() => fetchInvoice(uniqueId), [uniqueId])
  const [pay, setPay] = useState<{
    reference: string
    paidAt: string
    amount: string
    files: UploadedFile[]
  } | null>(null)
  if (!x.data) return <Loading error={x.error} />
  const d = x.data
  const act = (fn: () => Promise<Invoice>, ok?: string) =>
    run(async () => x.set(await fn()), ok)
  const m = d.match
  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {t("invoices.invoice", "Invoice")} {d.vendorInvoiceNo}
            <ToneBadge code={d.status} />
          </span>
        }
        description={`${d.vendor} · ${d.order.number}`}
        actions={
          <>
            {d.approvalUniqueId && (
              <Button variant="outline" asChild>
                <Link to={withId(ROUTES.APPROVAL_DETAILS, d.approvalUniqueId)}>
                  <ShieldCheckIcon />
                  {t("products.open_approval", "Approval")}
                </Link>
              </Button>
            )}
            {d.can.requestPayment && (
              <Button
                onClick={() =>
                  act(
                    () => requestPayment(d.uniqueId),
                    t("invoices.sent", "Sent for payment approval")
                  )
                }
              >
                <SendIcon />
                {t("invoices.request_payment", "Send for payment approval")}
              </Button>
            )}
            {d.can.recordPayment && (
              <Button
                onClick={() =>
                  setPay({
                    reference: "",
                    paidAt: new Date().toISOString().slice(0, 10),
                    amount: String(d.amountInclVat),
                    files: [],
                  })
                }
              >
                <BanknoteIcon />
                {t("invoices.record_payment", "Record payment")}
              </Button>
            )}
          </>
        }
      />
      {m.overInvoiced && (
        <Alert variant="destructive">
          <AlertDescription>
            {t(
              "invoices.over_hint",
              "Invoiced amounts exceed the value of goods passed at inspection."
            )}
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardContent>
          <Info
            items={[
              [
                "LPO",
                <Link
                  className="underline"
                  to={withId(ROUTES.ORDER_DETAILS, d.order.uniqueId)}
                >
                  {d.order.number}
                </Link>,
              ],
              [t("invoices.date", "Invoice date"), formatDay(d.invoiceDate)],
              [
                t("invoices.amount", "Amount incl. VAT (TZS)"),
                tzs(d.amountInclVat),
              ],
              ["VAT", tzs(d.vatAmount)],
              [t("orders.excl", "Excl. VAT"), tzs(d.amountExclVat)],
              [
                t("invoices.registered_by", "Registered by"),
                `${d.registeredBy ?? "—"} · ${formatStamp(d.createdAt)}`,
              ],
              [
                t("invoices.payment", "Payment"),
                d.paidAt &&
                  `${d.paymentReference} · ${formatDay(d.paidAt)} · ${tzs(d.paidAmount)} · ${d.paymentBy ?? ""}`,
              ],
            ]}
          />
          <div className="mt-2 text-sm">
            <Files files={[d.file, ...d.paymentFiles]} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            {t(
              "invoices.three_way",
              "Three-way match: LPO ↔ GRN / inspection ↔ invoice"
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Info
            items={[
              [t("invoices.ordered", "Ordered (LPO)"), tzs(m.ordered)],
              [t("invoices.received", "Passed inspection"), tzs(m.received)],
              [
                t("invoices.invoiced", "Invoiced (all invoices)"),
                tzs(m.invoiced),
              ],
              [t("invoices.paid", "Paid"), tzs(m.paid)],
              [
                t("invoices.match", "Match"),
                m.matched
                  ? t("invoices.matched", "Matched")
                  : m.overInvoiced
                    ? t("invoices.over", "Over-invoiced")
                    : t("invoices.partial", "Goods pending"),
              ],
            ]}
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead className="text-right">
                  {t("invoices.ordered_qty", "Ordered")}
                </TableHead>
                <TableHead className="text-right">
                  {t("invoices.received_qty", "Received")}
                </TableHead>
                <TableHead className="text-right">
                  {t("invoices.passed_qty", "Passed")}
                </TableHead>
                <TableHead className="text-right">
                  {t("orders.unit", "Unit price")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {m.lines.map((l) => (
                <TableRow key={l.lineNo}>
                  <TableCell>{l.lineNo}</TableCell>
                  <TableCell className="text-right">{l.ordered}</TableCell>
                  <TableCell className="text-right">{l.received}</TableCell>
                  <TableCell className="text-right">{l.passed}</TableCell>
                  <TableCell className="text-right">
                    {tzs(l.unitPrice)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {pay && (
        <FormDialog
          title={t("invoices.record_payment", "Record payment")}
          description={t(
            "invoices.manual",
            "Payment is made outside the system; record its reference and proof here."
          )}
          confirmLabel={t("actions.save", "Save")}
          canConfirm={!!pay.reference.trim() && Number(pay.amount) > 0}
          onClose={() => setPay(null)}
          onConfirm={() =>
            act(
              () =>
                recordPayment(d.uniqueId, {
                  reference: pay.reference,
                  paidAt: pay.paidAt,
                  amount: Number(pay.amount),
                  fileUniqueIds: pay.files.map((f) => f.uniqueId),
                }),
              t("invoices.paid_ok", "Payment recorded")
            )
          }
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="py-r">
                {t("invoices.reference", "Payment reference")}
              </FieldLabel>
              <Input
                id="py-r"
                value={pay.reference}
                onChange={(e) => setPay({ ...pay, reference: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="py-d">
                {t("invoices.paid_on", "Paid on")}
              </FieldLabel>
              <Input
                id="py-d"
                type="date"
                value={pay.paidAt}
                onChange={(e) => setPay({ ...pay, paidAt: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="py-a">
                {t("invoices.paid_amount", "Amount (TZS)")}
              </FieldLabel>
              <Input
                id="py-a"
                type="number"
                value={pay.amount}
                onChange={(e) => setPay({ ...pay, amount: e.target.value })}
              />
            </Field>
          </div>
          <FileUpload
            files={pay.files}
            folder="payments"
            onChange={(files) => setPay({ ...pay, files })}
          />
        </FormDialog>
      )}
    </div>
  )
}
