import { useEffect, useState } from "react"
import { Link, useLoaderData, useSearchParams } from "react-router"
import { useTranslation } from "react-i18next"
import { AlertTriangleIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { formatStamp } from "@/lib/format"
import { cn } from "@/lib/utils"
import { ROUTES, withId } from "@/routes/routeConstants"
import {
  fetchMovements,
  type Movement,
  type StockLevel,
  type Store,
} from "@/services/store"

export function MovementsTable({ rows }: { rows: Movement[] }) {
  const { t } = useTranslation()
  const label = useCodeLabel()
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("audit.when", "When")}</TableHead>
          <TableHead>{t("movements.type", "Movement")}</TableHead>
          <TableHead>{t("products.product", "Product")}</TableHead>
          <TableHead>{t("movements.where", "Store / location")}</TableHead>
          <TableHead className="text-right">
            {t("movements.qty", "Qty")}
          </TableHead>
          <TableHead>{t("movements.reference", "Reference")}</TableHead>
          <TableHead>{t("import.by", "By")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={7} className="text-muted-foreground">
              {t("movements.none", "No movements.")}
            </TableCell>
          </TableRow>
        )}
        {rows.map((m) => (
          <TableRow key={m.uniqueId}>
            <TableCell className="whitespace-nowrap">
              {formatStamp(m.at)}
            </TableCell>
            <TableCell>
              {label(m.type)}
              {m.toStatus && m.fromStatus !== m.toStatus && (
                <div className="mt-1">
                  <ToneBadge code={m.toStatus} />
                </div>
              )}
            </TableCell>
            <TableCell>
              {m.productName}
              <div className="font-mono text-xs text-muted-foreground">
                {m.assetUniqueId ? (
                  <Link
                    className="underline"
                    to={withId(ROUTES.ASSET_DETAILS, m.assetUniqueId)}
                  >
                    {m.assetTag}
                  </Link>
                ) : (
                  [m.productCode, m.batchNumber].filter(Boolean).join(" · ")
                )}
              </div>
            </TableCell>
            <TableCell>
              {m.store.name}
              <div className="text-xs text-muted-foreground">
                {[m.location, m.toLocation].filter(Boolean).join(" → ")}
              </div>
            </TableCell>
            <TableCell
              className={cn(
                "text-right tabular-nums",
                m.quantity > 0 && "text-emerald-700 dark:text-emerald-400",
                m.quantity < 0 && "text-destructive"
              )}
            >
              {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
            </TableCell>
            <TableCell className="text-sm">
              {m.referenceId ?? "—"}
              {m.reason && (
                <div className="text-xs text-muted-foreground">{m.reason}</div>
              )}
            </TableCell>
            <TableCell className="text-sm">{m.user ?? "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

const StockPage = () => {
  const { t } = useTranslation()
  const { levels, stores } = useLoaderData() as {
    levels: StockLevel[]
    stores: Store[]
  }
  const [params, setParams] = useSearchParams()
  const [movements, setMovements] = useState<Movement[]>([])
  const [search, setSearch] = useState(params.get("q") ?? "")
  const store = params.get("store") ?? ""
  const tab = params.get("tab") ?? "levels"

  const update = (patch: Record<string, string>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [k, v] of Object.entries(patch)) {
          if (v) next.set(k, v)
          else next.delete(k)
        }
        return next
      },
      { replace: true }
    )

  useEffect(() => {
    if (tab !== "movements") return
    void fetchMovements({ storeUniqueId: store || undefined }, 1, 200).then(
      setMovements
    )
  }, [tab, store])

  useEffect(() => {
    const h = setTimeout(() => {
      if (search !== (params.get("q") ?? "")) update({ q: search })
    }, 400)
    return () => clearTimeout(h)
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("stock.title", "Stock")}
        description={t(
          "stock.subtitle",
          "Available = on hand − reserved. Out = with employees, productions or at repair. Stock never goes negative."
        )}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <NativeSelect
          className="sm:w-56"
          value={store}
          aria-label={t("stores.store", "Store")}
          onChange={(e) => update({ store: e.target.value })}
        >
          <NativeSelectOption value="">
            {t("stock.all_stores", "All stores")}
          </NativeSelectOption>
          {stores.map((s) => (
            <NativeSelectOption key={s.uniqueId} value={s.uniqueId}>
              {s.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {tab === "levels" && (
          <>
            <Input
              className="sm:max-w-xs"
              placeholder={t("products.search", "Search name or code")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={params.get("below") === "yes"}
                onCheckedChange={(v) => update({ below: v ? "yes" : "" })}
              />
              {t("stock.below_only", "Below reorder level only")}
            </label>
          </>
        )}
      </div>
      <Tabs
        value={tab}
        onValueChange={(v) => update({ tab: v === "levels" ? "" : v })}
      >
        <TabsList variant="line">
          <TabsTrigger value="levels">
            {t("stock.levels", "Levels")}
          </TabsTrigger>
          <TabsTrigger value="movements">
            {t("stock.movements", "Movements")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="levels">
          <Card>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("products.product", "Product")}</TableHead>
                    <TableHead>{t("stores.store", "Store")}</TableHead>
                    <TableHead className="text-right">
                      {t("stock.on_hand", "On hand")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("stock.reserved", "Reserved")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("stock.available", "Available")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("stock.quarantine", "Quarantine")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("stock.out", "Out")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("stock.in_transit", "In transit")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {levels.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-muted-foreground">
                        {t("stock.none", "No stock recorded yet.")}
                      </TableCell>
                    </TableRow>
                  )}
                  {levels.map((l) => (
                    <TableRow key={`${l.store.uniqueId}:${l.productUniqueId}`}>
                      <TableCell>
                        <Link
                          className="font-medium hover:underline"
                          to={
                            l.serialised
                              ? `${ROUTES.ASSETS}?product=${l.productUniqueId}&store=${l.store.uniqueId}`
                              : withId(
                                  ROUTES.PRODUCT_DETAILS,
                                  l.productUniqueId
                                )
                          }
                        >
                          {l.productName}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          <span className="font-mono">{l.productCode}</span> ·{" "}
                          {l.categoryName} · {l.departmentName}
                        </div>
                      </TableCell>
                      <TableCell>{l.store.name}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {l.onHand}{" "}
                        <span className="text-xs text-muted-foreground">
                          {l.unit}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {l.reserved}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        <span className="inline-flex items-center gap-1">
                          {l.belowReorder && (
                            <AlertTriangleIcon
                              className="size-4 text-amber-600"
                              aria-label={t(
                                "stock.below_reorder",
                                "At or below reorder level ({{n}})",
                                { n: l.reorderLevel }
                              )}
                            />
                          )}
                          {l.available}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {l.quarantine}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {l.out}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {l.inTransit}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="movements">
          <Card>
            <CardContent className="overflow-x-auto">
              <MovementsTable rows={movements} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default StockPage
