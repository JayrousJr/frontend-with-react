import { useState } from "react"
import { Link, useNavigate } from "react-router"
import { useTranslation } from "react-i18next"
import { BanknoteIcon, GavelIcon, RouteIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldLabel } from "@/components/ui/field"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
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
import { P, hasPermission } from "@/lib/permissions"
import { ROUTES, withId } from "@/routes/routeConstants"
import type { UploadedFile } from "@/services/products"
import {
  createTender,
  fetchQueue,
  fetchVendors,
  recordCashPurchase,
  setRoute,
  type QueueLine,
  type Route,
} from "@/services/procurement"
import { FileUpload, FormDialog, Loading } from "./shared"
import { tzs, useLoad } from "./shared-utils"

const key = (l: QueueLine) => `${l.purchaseRequestUniqueId}#${l.lineNo}`
const ref = (l: QueueLine) => ({
  purchaseRequestUniqueId: l.purchaseRequestUniqueId,
  lineNo: l.lineNo,
})
const inDays = (d: number) => {
  const x = new Date(Date.now() + d * 864e5)
  x.setHours(12, 0, 0, 0)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T12:00`
}

/** Approved request lines waiting for Purchasing (tender spec §6.3). */
const QueuePage = () => {
  const { t } = useTranslation()
  const label = useCodeLabel()
  const run = useRun()
  const navigate = useNavigate()
  const { user } = useAuth()
  const q = useLoad(fetchQueue)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [routing, setRouting] = useState<{
    route: Route
    justification: string
    files: UploadedFile[]
  } | null>(null)
  const [tender, setTender] = useState<{
    title: string
    closingAt: string
    bidValidityDays: string
    description: string
    deliveryTerms: string
    terms: string
  } | null>(null)
  const [cash, setCash] = useState<{
    vendor: string
    shop: string
    date: string
    files: UploadedFile[]
    prices: Record<string, string>
    qty: Record<string, string>
  } | null>(null)
  const vendors = useLoad(() =>
    hasPermission(user, P.CASH_PURCHASE) ? fetchVendors() : Promise.resolve([])
  )
  if (!q.data) return <Loading error={q.error} />
  const lines = q.data
  const chosen = lines.filter((l) => sel.has(key(l)))
  const allOpen =
    chosen.length > 0 && chosen.every((l) => l.sourcingStatus === "OPEN")
  const sameRoute =
    allOpen && chosen.every((l) => l.route && l.route === chosen[0].route)
  const tenderable = sameRoute && chosen[0].route !== "CASH"
  const cashable = sameRoute && chosen[0].route === "CASH"
  const done = (d: QueueLine[]) => {
    q.set(d)
    setSel(new Set())
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("purchasing.title", "Purchasing")}
        description={t(
          "purchasing.subtitle",
          "Approved purchase request lines. Set the route per line (cash below the threshold, single source with CEO justification, or quotation), then combine quotation lines into a tender or record a cash purchase."
        )}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={!allOpen}
          onClick={() =>
            setRouting({
              route: chosen[0]?.suggestedRoute ?? "QUOTATION",
              justification: "",
              files: [],
            })
          }
        >
          <RouteIcon />
          {t("purchasing.set_route", "Set route")}
        </Button>
        {hasPermission(user, P.TENDER_CREATE) && (
          <Button
            disabled={!tenderable}
            onClick={() =>
              setTender({
                title: chosen
                  .map((l) => l.productName)
                  .filter((v, i, a) => a.indexOf(v) === i)
                  .join(", ")
                  .slice(0, 120),
                closingAt: inDays(7),
                bidValidityDays: "90",
                description: "",
                deliveryTerms: t(
                  "purchasing.default_delivery",
                  "Delivery to the AzamTV Main Store. Quote the full quantity of each item, VAT inclusive (TZS)."
                ),
                terms: "",
              })
            }
          >
            <GavelIcon />
            {t("purchasing.create_tender", "Create tender")}
          </Button>
        )}
        {hasPermission(user, P.CASH_PURCHASE) && (
          <Button
            variant="outline"
            disabled={!cashable}
            onClick={() =>
              setCash({
                vendor: "",
                shop: "",
                date: new Date().toISOString().slice(0, 10),
                files: [],
                prices: Object.fromEntries(
                  chosen.map((l) => [
                    key(l),
                    l.referencePrice ? String(l.referencePrice) : "",
                  ])
                ),
                qty: Object.fromEntries(
                  chosen.map((l) => [key(l), String(l.quantity)])
                ),
              })
            }
          >
            <BanknoteIcon />
            {t("purchasing.record_cash", "Record cash purchase")}
          </Button>
        )}
        <span className="self-center text-xs text-muted-foreground">
          {t(
            "purchasing.hint",
            "Tick lines with the same route to combine them."
          )}
        </span>
      </div>
      <Card className="py-0">
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>{t("purchasing.request", "Request")}</TableHead>
                <TableHead>{t("products.product", "Product")}</TableHead>
                <TableHead className="text-right">
                  {t("common.quantity", "Qty")}
                </TableHead>
                <TableHead className="text-right">
                  {t("purchasing.estimate", "Estimate")}
                </TableHead>
                <TableHead>{t("purchasing.route", "Route")}</TableHead>
                <TableHead>{t("common.status", "Status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">
                    {t("purchasing.empty", "No approved lines are waiting.")}
                  </TableCell>
                </TableRow>
              )}
              {lines.map((l) => (
                <TableRow key={key(l)}>
                  <TableCell>
                    <Checkbox
                      checked={sel.has(key(l))}
                      onCheckedChange={() =>
                        setSel((p) => {
                          const n = new Set(p)
                          if (n.has(key(l))) n.delete(key(l))
                          else n.add(key(l))
                          return n
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Link
                      className="font-mono text-sm hover:underline"
                      to={withId(
                        ROUTES.PURCHASE_REQUEST_DETAILS,
                        l.purchaseRequestUniqueId
                      )}
                    >
                      {l.purchaseRequestNumber}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {t("purchasing.line", "line")} {l.lineNo} · {l.department}
                    </div>
                  </TableCell>
                  <TableCell>
                    {l.productName}
                    <div className="text-xs text-muted-foreground">
                      {l.productCode} · {l.categoryName}
                      {l.singleSourceVendor &&
                        ` · ${t("purchasing.single_source_vendor", "single source")}: ${l.singleSourceVendor.name}`}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {l.quantity} {l.unit}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {tzs(l.estimate)}
                  </TableCell>
                  <TableCell>
                    {l.route ? (
                      <ToneBadge code={l.route} />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {t("purchasing.suggested", "suggested")}:{" "}
                        {label(l.suggestedRoute)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {l.sourcingStatus === "JUSTIFICATION" ? (
                      <Link
                        className="text-xs underline"
                        to={withId(
                          ROUTES.APPROVAL_DETAILS,
                          l.justificationApprovalUniqueId ?? ""
                        )}
                      >
                        {t(
                          "purchasing.awaiting_ceo",
                          "Waiting for the CEO's justification approval"
                        )}
                      </Link>
                    ) : (
                      <ToneBadge code={l.sourcingStatus} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {routing && (
        <FormDialog
          title={t("purchasing.set_route", "Set route")}
          confirmLabel={t("actions.save", "Save")}
          canConfirm={
            routing.route !== "SINGLE_SOURCE" ||
            routing.justification.trim().length >= 10
          }
          onClose={() => setRouting(null)}
          onConfirm={() =>
            run(
              async () =>
                done(
                  await setRoute(
                    chosen.map(ref),
                    routing.route,
                    routing.justification,
                    routing.files[0]?.uniqueId
                  )
                ),
              t("common.saved", "Saved")
            )
          }
        >
          <NativeSelect
            className="w-full"
            value={routing.route}
            onChange={(e) =>
              setRouting({ ...routing, route: e.target.value as Route })
            }
          >
            <NativeSelectOption value="QUOTATION">
              {t(
                "route.quotation",
                "Quotation (tender / RFQ on the vendor portal)"
              )}
            </NativeSelectOption>
            <NativeSelectOption value="SINGLE_SOURCE">
              {t(
                "route.single_source",
                "Single source (designated vendor, CEO justification)"
              )}
            </NativeSelectOption>
            <NativeSelectOption value="CASH">
              {t("route.cash", "Cash purchase (below the cash threshold)")}
            </NativeSelectOption>
          </NativeSelect>
          {routing.route === "SINGLE_SOURCE" && (
            <>
              <Textarea
                rows={4}
                placeholder={t(
                  "purchasing.justification",
                  "Why only this vendor? (sent to the CEO)"
                )}
                value={routing.justification}
                onChange={(e) =>
                  setRouting({ ...routing, justification: e.target.value })
                }
              />
              <FileUpload
                multiple={false}
                files={routing.files}
                onChange={(files) => setRouting({ ...routing, files })}
              />
            </>
          )}
        </FormDialog>
      )}

      {tender && (
        <FormDialog
          wide
          title={t("purchasing.create_tender", "Create tender")}
          description={t(
            "purchasing.tender_hint",
            "Lines of the same product are combined into one tender line (full quantity). You appoint the committee and publish on the next page."
          )}
          confirmLabel={t("actions.create", "Create")}
          canConfirm={tender.title.trim().length > 2}
          onClose={() => setTender(null)}
          onConfirm={async () => {
            let id = ""
            const ok = await run(async () => {
              id = (
                await createTender(chosen.map(ref), chosen[0].route!, {
                  title: tender.title,
                  closingAt: tender.closingAt
                    ? new Date(tender.closingAt).toISOString()
                    : null,
                  bidValidityDays: Number(tender.bidValidityDays) || null,
                  description: tender.description,
                  deliveryTerms: tender.deliveryTerms,
                  terms: tender.terms,
                })
              ).uniqueId
            })
            if (ok) navigate(withId(ROUTES.TENDER_DETAILS, id))
            return ok
          }}
        >
          <TenderFields value={tender} onChange={setTender} />
        </FormDialog>
      )}

      {cash && (
        <FormDialog
          wide
          title={t("purchasing.record_cash", "Record cash purchase")}
          description={t(
            "purchasing.cash_hint",
            "The goods still go through receiving and inspection at the main store."
          )}
          confirmLabel={t("actions.save", "Save")}
          canConfirm={
            (!!cash.vendor || !!cash.shop.trim()) &&
            cash.files.length > 0 &&
            chosen.every(
              (l) =>
                Number(cash.prices[key(l)]) > 0 && Number(cash.qty[key(l)]) > 0
            )
          }
          onClose={() => setCash(null)}
          onConfirm={async () => {
            let id = ""
            const ok = await run(
              async () => {
                id = (
                  await recordCashPurchase({
                    vendorUniqueId: cash.vendor || null,
                    shopName: cash.vendor ? null : cash.shop,
                    purchaseDate: cash.date,
                    receiptFileUniqueIds: cash.files.map((f) => f.uniqueId),
                    lines: chosen.map((l) => ({
                      ...ref(l),
                      quantity: Number(cash.qty[key(l)]),
                      unitPrice: Number(cash.prices[key(l)]),
                    })),
                  })
                ).uniqueId
              },
              t("purchasing.cash_recorded", "Cash purchase recorded")
            )
            if (ok) navigate(withId(ROUTES.ORDER_DETAILS, id))
            return ok
          }}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Field>
              <FieldLabel>{t("vendors.vendor", "Vendor")}</FieldLabel>
              <NativeSelect
                className="w-full"
                value={cash.vendor}
                onChange={(e) => setCash({ ...cash, vendor: e.target.value })}
              >
                <NativeSelectOption value="">
                  {t("purchasing.shop", "— Shop (not registered) —")}
                </NativeSelectOption>
                {(vendors.data ?? []).map((v) => (
                  <NativeSelectOption key={v.uniqueId} value={v.uniqueId}>
                    {v.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="cp-shop">
                {t("purchasing.shop_name", "Shop name")}
              </FieldLabel>
              <Input
                id="cp-shop"
                disabled={!!cash.vendor}
                value={cash.shop}
                onChange={(e) => setCash({ ...cash, shop: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="cp-date">
                {t("purchasing.purchase_date", "Purchase date")}
              </FieldLabel>
              <Input
                id="cp-date"
                type="date"
                value={cash.date}
                onChange={(e) => setCash({ ...cash, date: e.target.value })}
              />
            </Field>
          </div>
          {chosen.map((l) => (
            <div
              key={key(l)}
              className="grid items-end gap-2 sm:grid-cols-[1fr_7rem_10rem]"
            >
              <div className="text-sm">
                {l.productName}{" "}
                <span className="text-muted-foreground">
                  ({l.purchaseRequestNumber})
                </span>
              </div>
              <Input
                type="number"
                min={1}
                max={l.quantity}
                aria-label={t("common.quantity", "Qty")}
                value={cash.qty[key(l)]}
                onChange={(e) =>
                  setCash({
                    ...cash,
                    qty: { ...cash.qty, [key(l)]: e.target.value },
                  })
                }
              />
              <Input
                type="number"
                min={0}
                placeholder={t("purchasing.unit_price", "Unit price incl. VAT")}
                value={cash.prices[key(l)]}
                onChange={(e) =>
                  setCash({
                    ...cash,
                    prices: { ...cash.prices, [key(l)]: e.target.value },
                  })
                }
              />
            </div>
          ))}
          <Field>
            <FieldLabel>
              {t("purchasing.receipts", "Receipts (required)")}
            </FieldLabel>
            <FileUpload
              files={cash.files}
              folder="receipts"
              onChange={(files) => setCash({ ...cash, files })}
            />
          </Field>
        </FormDialog>
      )}
    </div>
  )
}

export type TenderFieldsValue = {
  title: string
  closingAt: string
  bidValidityDays: string
  description: string
  deliveryTerms: string
  terms: string
}

export function TenderFields({
  value,
  onChange,
}: {
  value: TenderFieldsValue
  onChange: (v: TenderFieldsValue) => void
}) {
  const { t } = useTranslation()
  const set = (k: keyof TenderFieldsValue, v: string) =>
    onChange({ ...value, [k]: v })
  return (
    <div className="space-y-3">
      <Field>
        <FieldLabel htmlFor="tf-title">
          {t("tenders.title_field", "Title")}
        </FieldLabel>
        <Input
          id="tf-title"
          value={value.title}
          onChange={(e) => set("title", e.target.value)}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="tf-close">
            {t("tenders.closing", "Closing (server time, EAT)")}
          </FieldLabel>
          <Input
            id="tf-close"
            type="datetime-local"
            value={value.closingAt}
            onChange={(e) => set("closingAt", e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="tf-valid">
            {t("tenders.validity", "Bid validity (days)")}
          </FieldLabel>
          <Input
            id="tf-valid"
            type="number"
            min={1}
            value={value.bidValidityDays}
            onChange={(e) => set("bidValidityDays", e.target.value)}
          />
        </Field>
      </div>
      {(["description", "deliveryTerms", "terms"] as const).map((k) => (
        <Field key={k}>
          <FieldLabel htmlFor={`tf-${k}`}>
            {k === "description"
              ? t("tenders.description", "Description")
              : k === "deliveryTerms"
                ? t("tenders.delivery_terms", "Delivery requirements")
                : t("tenders.terms", "Terms")}
          </FieldLabel>
          <Textarea
            id={`tf-${k}`}
            rows={2}
            value={value[k]}
            onChange={(e) => set(k, e.target.value)}
          />
        </Field>
      ))}
    </div>
  )
}

export default QueuePage
