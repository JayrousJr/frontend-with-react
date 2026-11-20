import { useState } from "react"
import { Link, useLoaderData, useNavigate } from "react-router"
import { useTranslation } from "react-i18next"
import { PlusIcon, SendIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { PageHeader } from "@/components/app/page-header"
import { AsyncPicker, type PickerOption } from "@/components/app/async-picker"
import { useCodeLabel } from "@/components/app/use-code-label"
import { useRun } from "@/components/app/use-run"
import { ROUTES, withId } from "@/routes/routeConstants"
import { fetchProduct, fetchProducts, type Product } from "@/services/products"
import {
  CONDITIONS,
  createAdjustment,
  type AdjustmentLineInput,
  type AdjustmentType,
  type AssetCondition,
  type Store,
} from "@/services/store"

type Line = {
  key: number
  option: PickerOption | null
  product: Product | null
  location: string
  quantity: string
  batch: string
  expiry: string
  tag: string
  serial: string
  brand: string
  model: string
  condition: AssetCondition
  reg: string
}

let seq = 0
const newLine = (): Line => ({
  key: ++seq,
  option: null,
  product: null,
  location: "",
  quantity: "1",
  batch: "",
  expiry: "",
  tag: "",
  serial: "",
  brand: "",
  model: "",
  condition: "GOOD",
  reg: "",
})

/** Manual adjustment: found / donated items or a quantity correction. */
const AdjustmentFormPage = () => {
  const { t } = useTranslation()
  const label = useCodeLabel()
  const run = useRun()
  const navigate = useNavigate()
  const { stores } = useLoaderData() as { stores: Store[] }
  const [storeId, setStoreId] = useState(
    stores.length === 1 ? stores[0].uniqueId : ""
  )
  const [type, setType] = useState<AdjustmentType>("FOUND")
  const [reason, setReason] = useState("")
  const [lines, setLines] = useState<Line[]>([newLine()])
  const [busy, setBusy] = useState(false)
  const store = stores.find((s) => s.uniqueId === storeId)
  const locations =
    store?.locations.filter((l) => l.kind === "GENERAL" && l.isActive) ?? []

  const set = (key: number, patch: Partial<Line>) =>
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch } : l))
    )

  const serialised = (l: Line) => l.product?.trackingType === "SERIALISED"
  const valid = (l: Line) =>
    !!l.product &&
    !!l.location &&
    (serialised(l)
      ? type !== "CORRECTION" &&
        (!l.product.isVehicle || l.reg.trim().length >= 2)
      : Number(l.quantity) !== 0 &&
        (type === "CORRECTION" || Number(l.quantity) > 0) &&
        (l.product.trackingType !== "BATCH" || !!l.batch.trim()))
  const canSubmit =
    !!store &&
    reason.trim().length >= 3 &&
    lines.length > 0 &&
    lines.every(valid)

  function toInput(l: Line): AdjustmentLineInput {
    const base = {
      productUniqueId: l.product!.uniqueId,
      locationUniqueId: l.location,
    }
    if (serialised(l)) {
      return {
        ...base,
        quantity: 1,
        asset: {
          tag: l.tag.trim() || null,
          serialNumber: l.serial.trim() || null,
          brand: l.brand.trim() || null,
          model: l.model.trim() || null,
          condition: l.condition,
          vehicle: l.product!.isVehicle
            ? { registrationNumber: l.reg.trim() }
            : undefined,
        },
      }
    }
    return {
      ...base,
      quantity: Number(l.quantity),
      batchNumber: l.product!.trackingType === "BATCH" ? l.batch.trim() : null,
      expiryDate:
        l.product!.trackingType === "BATCH" && l.expiry ? l.expiry : null,
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("adjustments.new", "New adjustment")}
        description={t(
          "adjustments.form_hint",
          "Goes to Store Managers for approval; you cannot approve your own. Use the opening balance import for the tagging campaign."
        )}
        actions={
          <Button variant="outline" asChild>
            <Link to={ROUTES.ADJUSTMENTS}>{t("actions.cancel", "Cancel")}</Link>
          </Button>
        }
      />
      <Card>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="ad-store">
                  {t("stores.store", "Store")}
                </FieldLabel>
                <NativeSelect
                  id="ad-store"
                  className="w-full"
                  value={storeId}
                  onChange={(e) => {
                    setStoreId(e.target.value)
                    setLines((prev) =>
                      prev.map((l) => ({ ...l, location: "" }))
                    )
                  }}
                >
                  <NativeSelectOption value="">
                    {t("common.choose", "— Choose —")}
                  </NativeSelectOption>
                  {stores.map((s) => (
                    <NativeSelectOption key={s.uniqueId} value={s.uniqueId}>
                      {s.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="ad-type">
                  {t("adjustments.type", "Type")}
                </FieldLabel>
                <NativeSelect
                  id="ad-type"
                  className="w-full"
                  value={type}
                  onChange={(e) => setType(e.target.value as AdjustmentType)}
                >
                  {(
                    [
                      "FOUND",
                      "DONATED",
                      "CORRECTION",
                      "OPENING_BALANCE",
                    ] as const
                  ).map((x) => (
                    <NativeSelectOption key={x} value={x}>
                      {label(x)}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="ad-reason">
                {t("common.reason", "Reason")}
              </FieldLabel>
              <Textarea
                id="ad-reason"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("adjustments.lines", "Lines")}</CardTitle>
          <CardDescription>
            {type === "CORRECTION"
              ? t(
                  "adjustments.correction_hint",
                  "Corrections change quantities only (negative to reduce). Asset losses go through counts or disposal."
                )
              : t(
                  "adjustments.lines_hint",
                  "Assets: one line per unit; leave the tag blank to issue a new one. Consumables: the quantity."
                )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {lines.map((l, i) => (
            <div key={l.key} className="space-y-3 rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">#{i + 1}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("actions.remove", "Remove")}
                  disabled={lines.length === 1}
                  onClick={() =>
                    setLines((prev) => prev.filter((x) => x.key !== l.key))
                  }
                >
                  <Trash2Icon />
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <AsyncPicker
                  selected={l.option}
                  placeholder={t("products.product", "Product")}
                  onChange={async (o) => {
                    set(l.key, { option: o, product: null })
                    if (o) {
                      const p = await fetchProduct(o.value)
                      set(l.key, { product: p })
                    }
                  }}
                  search={async (q) =>
                    (
                      await fetchProducts(
                        { search: q || undefined, statuses: ["ACTIVE"] },
                        1,
                        20
                      )
                    ).data
                      .filter((p) => p.trackingType)
                      .map((p) => ({
                        value: p.uniqueId,
                        label: p.name,
                        hint: `${p.code ?? ""} · ${p.trackingType ? label(p.trackingType) : ""}`,
                      }))
                  }
                />
                <NativeSelect
                  className="w-full"
                  aria-label={t("locations.path", "Location")}
                  value={l.location}
                  disabled={!store}
                  onChange={(e) => set(l.key, { location: e.target.value })}
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
              </div>
              {l.product && serialised(l) && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input
                    placeholder={t(
                      "adjustments.tag_optional",
                      "Pre-printed tag (optional)"
                    )}
                    value={l.tag}
                    onChange={(e) =>
                      set(l.key, { tag: e.target.value.toUpperCase() })
                    }
                  />
                  <Input
                    placeholder={t("assets.serial", "Serial number")}
                    value={l.serial}
                    onChange={(e) => set(l.key, { serial: e.target.value })}
                  />
                  <NativeSelect
                    className="w-full"
                    aria-label={t("assets.condition", "Condition")}
                    value={l.condition}
                    onChange={(e) =>
                      set(l.key, {
                        condition: e.target.value as AssetCondition,
                      })
                    }
                  >
                    {CONDITIONS.map((c) => (
                      <NativeSelectOption key={c} value={c}>
                        {label(c)}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <Input
                    placeholder={t("assets.brand", "Brand")}
                    value={l.brand}
                    onChange={(e) => set(l.key, { brand: e.target.value })}
                  />
                  <Input
                    placeholder={t("assets.model", "Model")}
                    value={l.model}
                    onChange={(e) => set(l.key, { model: e.target.value })}
                  />
                  {l.product.isVehicle && (
                    <Input
                      placeholder={t(
                        "vehicle.registration",
                        "Registration number"
                      )}
                      value={l.reg}
                      onChange={(e) =>
                        set(l.key, { reg: e.target.value.toUpperCase() })
                      }
                    />
                  )}
                </div>
              )}
              {l.product && !serialised(l) && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input
                    type="number"
                    aria-label={t("movements.qty", "Qty")}
                    value={l.quantity}
                    onChange={(e) => set(l.key, { quantity: e.target.value })}
                  />
                  {l.product.trackingType === "BATCH" && (
                    <>
                      <Input
                        placeholder={t(
                          "adjustments.batch_number",
                          "Batch number"
                        )}
                        value={l.batch}
                        onChange={(e) => set(l.key, { batch: e.target.value })}
                      />
                      <Input
                        type="date"
                        aria-label={t("adjustments.expiry", "Expiry date")}
                        value={l.expiry}
                        onChange={(e) => set(l.key, { expiry: e.target.value })}
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLines((p) => [...p, newLine()])}
          >
            <PlusIcon />
            {t("adjustments.add_line", "Add line")}
          </Button>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button
          disabled={busy || !canSubmit}
          onClick={async () => {
            setBusy(true)
            let id = ""
            const ok = await run(
              async () => {
                const a = await createAdjustment({
                  storeUniqueId: storeId,
                  type,
                  reason: reason.trim(),
                  lines: lines.map(toInput),
                })
                id = a.uniqueId
              },
              t("adjustments.created", "Sent for approval")
            )
            setBusy(false)
            if (ok) navigate(withId(ROUTES.ADJUSTMENT_DETAILS, id))
          }}
        >
          <SendIcon />
          {t("adjustments.submit", "Send for approval")}
        </Button>
      </div>
    </div>
  )
}

export default AdjustmentFormPage
