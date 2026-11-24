import { Link, useParams } from "react-router"
import { useTranslation } from "react-i18next"
import { PrinterIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import { formatDay, formatStamp } from "@/lib/format"
import { ROUTES, withId } from "@/routes/routeConstants"
import { fetchGrn, fetchGrns } from "@/services/procurement"
import { Files, Info, Loading } from "./shared"
import { useLoad } from "./shared-utils"
import { Documents } from "./documents"

export const GrnsPage = () => {
  const { t } = useTranslation()
  const rows = useLoad(fetchGrns)
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("grn.title", "Goods received")}
        description={t(
          "grn.subtitle",
          "Deliveries recorded at the main store against LPOs, with their inspection status."
        )}
      />
      <Card className="py-0">
        <CardContent className="divide-y p-0">
          {!rows.data && (
            <div className="p-6">
              <Loading error={rows.error} />
            </div>
          )}
          {rows.data?.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground">
              {t("grn.none", "Nothing received yet.")}
            </p>
          )}
          {rows.data?.map((g) => (
            <Link
              key={g.uniqueId}
              to={withId(ROUTES.GRN_DETAILS, g.uniqueId)}
              className="block px-4 py-3 hover:bg-muted sm:px-6"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-medium">{g.number}</span>
                <span>{g.vendor}</span>
                <ToneBadge code={g.status} />
              </div>
              <div className="text-xs text-muted-foreground">
                {g.order.number} ·{" "}
                {g.lines
                  .map((l) => `${l.productName} ${l.receivedQty}`)
                  .join(", ")}{" "}
                · {formatStamp(g.receivedAt)}
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

/** GRN / Receiving report (printable). */
export const GrnDetailsPage = () => {
  const { t } = useTranslation()
  const { uniqueId = "" } = useParams()
  const g = useLoad(() => fetchGrn(uniqueId), [uniqueId])
  if (!g.data) return <Loading error={g.error} />
  const d = g.data
  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          title={
            <span className="flex items-center gap-2">
              <span className="font-mono">{d.number}</span>
              <ToneBadge code={d.status} />
            </span>
          }
          description={`${d.vendor} · ${d.order.number}`}
          actions={
            <Button variant="outline" onClick={() => window.print()}>
              <PrinterIcon />
              {t("grn.print", "Print GRN / receiving report")}
            </Button>
          }
        />
      </div>
      <div className="hidden print:block">
        <div className="text-xs uppercase">
          AzamTV — {t("grn.long", "Goods Received Note")}
        </div>
        <div className="font-mono text-2xl font-bold">{d.number}</div>
      </div>
      <Card>
        <CardContent>
          <Info
            items={[
              [
                "LPO",
                <Link
                  className="underline print:no-underline"
                  to={withId(ROUTES.ORDER_DETAILS, d.order.uniqueId)}
                >
                  {d.order.number}
                </Link>,
              ],
              [t("vendors.vendor", "Vendor"), d.vendor],
              [t("stores.store", "Store"), d.store],
              [
                t("grn.delivery_note", "Delivery note number"),
                d.deliveryNoteNo,
              ],
              [
                t("grn.received_by", "Received by"),
                `${d.receivedBy} · ${formatStamp(d.receivedAt)}`,
              ],
              [t("common.note", "Note"), d.note],
            ]}
          />
          {d.deliveryNote && (
            <div className="mt-2 text-sm">
              <Files files={[d.deliveryNote]} />
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
                  {t("grn.ordered", "Ordered")}
                </TableHead>
                <TableHead className="text-right">
                  {t("grn.delivered", "Delivered")}
                </TableHead>
                <TableHead className="text-right">
                  {t("grn.refused", "Refused (wrong / damaged)")}
                </TableHead>
                <TableHead className="text-right">
                  {t("grn.to_quarantine", "To quarantine")}
                </TableHead>
                <TableHead>{t("grn.inspection", "Inspection")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.lines.map((l) => (
                <TableRow key={l.lineNo}>
                  <TableCell>{l.lineNo}</TableCell>
                  <TableCell>
                    {l.productName}
                    <div className="text-xs text-muted-foreground">
                      {l.serialNumbers.length > 0 &&
                        `${t("grn.serials_short", "Serials")}: ${l.serialNumbers.join(", ")}`}
                      {l.batchNumber &&
                        ` ${t("grn.batch", "Batch number")} ${l.batchNumber} · ${formatDay(l.expiryDate)}`}
                    </div>
                    {l.rejectReason && (
                      <div className="text-xs text-destructive">
                        {l.rejectReason}
                      </div>
                    )}
                    <Files files={l.photos} />
                  </TableCell>
                  <TableCell className="text-right">{l.ordered}</TableCell>
                  <TableCell className="text-right">{l.deliveredQty}</TableCell>
                  <TableCell className="text-right">{l.rejectedQty}</TableCell>
                  <TableCell className="text-right">{l.receivedQty}</TableCell>
                  <TableCell>
                    {l.inspection && (
                      <Link
                        className="flex items-center gap-1 text-sm underline print:no-underline"
                        to={withId(
                          ROUTES.GOODS_INSPECTION_DETAILS,
                          l.inspection.uniqueId
                        )}
                      >
                        {l.inspection.number}{" "}
                        <ToneBadge code={l.inspection.status} />
                        {l.inspection.passedQty + l.inspection.failedQty > 0 &&
                          ` ${l.inspection.passedQty}/${l.inspection.failedQty}`}
                      </Link>
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
          {t("grn.sign_store", "Storekeeper (name, signature, date)")}
        </div>
        <div className="border-t pt-2">
          {t(
            "grn.sign_vendor",
            "Vendor's delivery person (name, signature, date)"
          )}
        </div>
      </div>
      <div className="print:hidden">
        <Documents type="Grn" id={d.uniqueId} />
      </div>
    </div>
  )
}
