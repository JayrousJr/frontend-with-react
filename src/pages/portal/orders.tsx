import { Link, useParams } from "react-router"
import { useTranslation } from "react-i18next"
import { CheckCircle2Icon, PrinterIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToneBadge } from "@/components/app/tone-badge"
import { useRun } from "@/components/app/use-run"
import { formatDay, formatStamp } from "@/lib/format"
import { portalAcknowledge, portalOrder, portalOrders } from "@/services/portal"
import { Info, Loading } from "../procurement/shared"
import { tzs, useLoad } from "../procurement/shared-utils"

export const PortalOrdersPage = () => {
  const { t } = useTranslation()
  const rows = useLoad(portalOrders)
  return (
    <>
      <h1 className="text-2xl font-semibold">{t("portal.orders", "LPOs")}</h1>
      <Card className="py-0">
        <CardContent className="divide-y p-0">
          {!rows.data && (
            <div className="p-6">
              <Loading error={rows.error} />
            </div>
          )}
          {rows.data?.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground">
              {t("orders.none", "No LPOs yet.")}
            </p>
          )}
          {rows.data?.map((o) => (
            <Link
              key={o.uniqueId}
              to={`/portal/orders/${o.uniqueId}`}
              className="block px-4 py-3 hover:bg-muted sm:px-6"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-medium">{o.number}</span>
                {o.revision > 0 && (
                  <span className="text-xs">rev {o.revision}</span>
                )}
                <ToneBadge code={o.status} />
                {o.can.acknowledge && (
                  <span className="text-xs text-amber-700">
                    {t("portal.ack_needed", "acknowledgement needed")}
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {o.tender?.number} · {tzs(o.totalInclVat)} ·{" "}
                {t("orders.delivery", "Delivery by")}{" "}
                {formatDay(o.deliveryDate)}
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </>
  )
}

export const PortalOrderPage = () => {
  const { t } = useTranslation()
  const run = useRun()
  const { uniqueId = "" } = useParams()
  const x = useLoad(() => portalOrder(uniqueId), [uniqueId])
  if (!x.data) return <Loading error={x.error} />
  const o = x.data
  const pending = o.amendments.find(
    (a) => a.status === "AWAITING_ACKNOWLEDGEMENT"
  )
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-2xl font-semibold">
          <span className="font-mono">{o.number}</span>{" "}
          {o.revision > 0 && (
            <span className="text-base">rev {o.revision}</span>
          )}{" "}
          <ToneBadge code={o.status} />
        </h1>
        <Button
          variant="outline"
          className="print:hidden"
          onClick={() => window.print()}
        >
          <PrinterIcon />
          {t("orders.print", "Print LPO")}
        </Button>
        {o.can.acknowledge && (
          <Button
            className="print:hidden"
            onClick={() =>
              run(
                async () => x.set(await portalAcknowledge(o.uniqueId)),
                t("portal.acknowledged", "Acknowledged")
              )
            }
          >
            <CheckCircle2Icon />
            {pending
              ? t("portal.ack_amendment", "Acknowledge amendment rev {{r}}", {
                  r: pending.revision,
                })
              : t("portal.ack", "Acknowledge LPO")}
          </Button>
        )}
      </div>
      {pending && (
        <Alert className="print:hidden">
          <AlertDescription>
            {t(
              "portal.amendment",
              "AzamTV amended this LPO (rev {{r}}): {{reason}}. Until you acknowledge, the current version stays in force.",
              { r: pending.revision, reason: pending.reason }
            )}
            <ul className="mt-1 text-xs">
              {pending.after.lines.map((n) => {
                const b = pending.before.lines.find(
                  (x) => x.lineNo === n.lineNo
                )
                if (
                  !b ||
                  (b.quantity === n.quantity && b.unitPrice === n.unitPrice)
                )
                  return null
                return (
                  <li key={n.lineNo}>
                    {t("purchasing.line", "line")} {n.lineNo}: {b.quantity} ×{" "}
                    {tzs(b.unitPrice)} → {n.quantity} × {tzs(n.unitPrice)}
                  </li>
                )
              })}
              {pending.before.deliveryDate !== pending.after.deliveryDate && (
                <li>
                  {t("orders.delivery", "Delivery by")}:{" "}
                  {formatDay(pending.before.deliveryDate)} →{" "}
                  {formatDay(pending.after.deliveryDate)}
                </li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
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
                o.tender && `${o.tender.number} — ${o.tender.title}`,
              ],
              [
                t("orders.issued", "Issued"),
                o.issuedAt && formatStamp(o.issuedAt),
              ],
              [
                t("orders.acknowledged", "Acknowledged by the vendor"),
                o.acknowledgedAt && formatStamp(o.acknowledgedAt),
              ],
              [
                t("orders.instructions", "Delivery instructions"),
                o.instructions,
              ],
            ]}
          />
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {o.lines.map((l) => (
                <TableRow key={l.lineNo}>
                  <TableCell>{l.lineNo}</TableCell>
                  <TableCell>
                    {l.productName}
                    <div className="text-xs text-muted-foreground">
                      {[l.brand, l.model].filter(Boolean).join(" · ")}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {l.quantity} {l.unit}
                  </TableCell>
                  <TableCell className="text-right">
                    {tzs(l.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right">
                    {tzs(l.lineExclVat)}
                  </TableCell>
                  <TableCell className="text-right">{tzs(l.lineVat)}</TableCell>
                  <TableCell className="text-right">
                    {tzs(l.lineTotal)}
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
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
