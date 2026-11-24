import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { formatDay } from "@/lib/format"
import { ROUTES, withId } from "@/routes/routeConstants"
import { fetchOrders } from "@/services/procurement"
import { Loading } from "./shared"
import { tzs, useLoad } from "./shared-utils"

const OrdersPage = () => {
  const { t } = useTranslation()
  const rows = useLoad(() => fetchOrders())
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("orders.title", "LPOs")}
        description={t(
          "orders.subtitle",
          "One LPO per winning vendor per tender, delivered to the main store; cash purchases are listed here too."
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
                  <TableHead>LPO</TableHead>
                  <TableHead>{t("vendors.vendor", "Vendor")}</TableHead>
                  <TableHead className="text-right">
                    {t("orders.total", "Total incl. VAT")}
                  </TableHead>
                  <TableHead>{t("orders.delivery", "Delivery by")}</TableHead>
                  <TableHead>{t("common.status", "Status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      {t("orders.none", "No LPOs yet.")}
                    </TableCell>
                  </TableRow>
                )}
                {rows.data.map((o) => (
                  <TableRow key={o.uniqueId}>
                    <TableCell>
                      <Link
                        className="font-mono hover:underline"
                        to={withId(ROUTES.ORDER_DETAILS, o.uniqueId)}
                      >
                        {o.number}
                      </Link>
                      {o.revision > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {" "}
                          rev {o.revision}
                        </span>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {o.kind === "CASH"
                          ? t("orders.cash", "Cash purchase")
                          : o.tender?.number}
                      </div>
                    </TableCell>
                    <TableCell>{o.vendor?.name ?? o.shopName}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {tzs(o.totalInclVat)}
                    </TableCell>
                    <TableCell className={o.overdue ? "text-destructive" : ""}>
                      {formatDay(o.deliveryDate)}
                    </TableCell>
                    <TableCell className="space-x-1">
                      <ToneBadge code={o.status} />
                      {o.overdue && (
                        <Badge variant="destructive">
                          {t("orders.overdue", "Overdue")}
                        </Badge>
                      )}
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

export default OrdersPage
