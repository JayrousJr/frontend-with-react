import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { AsyncPicker } from "@/components/app/async-picker"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Input } from "@/components/ui/input"
import { formatDay } from "@/lib/format"
import { fetchProducts } from "@/services/products"
import { fetchBalances, type Balance } from "@/services/store"
import type { QtyLine } from "./stock-line-utils"

/** Quantity products of a store: pick product, then location / batch with what is available. */
export function QuantityLineEditor({
  storeUniqueId,
  line,
  onChange,
}: {
  storeUniqueId: string
  line: QtyLine
  onChange: (patch: Partial<QtyLine>) => void
}) {
  const { t } = useTranslation()
  const [balances, setBalances] = useState<Balance[]>([])
  const productId = line.product?.value

  useEffect(() => {
    if (!storeUniqueId || !productId) return
    let live = true
    void fetchBalances(storeUniqueId, productId).then((b) => {
      if (live) setBalances(b)
    })
    return () => {
      live = false
    }
  }, [storeUniqueId, productId])
  const shown = productId ? balances : []
  const chosen = shown.find(
    (b) => `${b.locationUniqueId}|${b.batchNumber ?? ""}` === line.source
  )

  return (
    <div className="grid gap-2 sm:grid-cols-[1.4fr_1.4fr_0.6fr]">
      <AsyncPicker
        selected={line.product}
        placeholder={t("products.product", "Product")}
        disabled={!storeUniqueId}
        onChange={(o) => onChange({ product: o, source: "" })}
        search={async (q) =>
          (
            await fetchProducts(
              { search: q || undefined, statuses: ["ACTIVE"] },
              1,
              20
            )
          ).data
            .filter((p) => p.trackingType && p.trackingType !== "SERIALISED")
            .map((p) => ({
              value: p.uniqueId,
              label: p.name,
              hint: `${p.code ?? ""} · ${p.unit}`,
            }))
        }
      />
      <NativeSelect
        className="w-full"
        aria-label={t("stock_line.source", "Location / batch")}
        value={line.source}
        disabled={!productId}
        onChange={(e) => onChange({ source: e.target.value })}
      >
        <NativeSelectOption value="">
          {shown.length
            ? t("stock_line.choose", "Location / batch…")
            : t("stock_line.none", "No stock in this store")}
        </NativeSelectOption>
        {shown.map((b) => (
          <NativeSelectOption
            key={`${b.locationUniqueId}|${b.batchNumber ?? ""}`}
            value={`${b.locationUniqueId}|${b.batchNumber ?? ""}`}
            disabled={b.available <= 0}
          >
            {b.location}
            {b.batchNumber ? ` · ${b.batchNumber}` : ""}
            {b.expiryDate ? ` · ${formatDay(b.expiryDate)}` : ""} —{" "}
            {t("stock_line.available_n", "{{n}} available", { n: b.available })}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <Input
        type="number"
        min={1}
        max={chosen?.available}
        aria-label={t("movements.qty", "Qty")}
        value={line.quantity}
        onChange={(e) => onChange({ quantity: e.target.value })}
      />
    </div>
  )
}
