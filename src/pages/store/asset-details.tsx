import { useEffect, useState } from "react"
import { Link, useLoaderData, useRevalidator } from "react-router"
import { useTranslation } from "react-i18next"
import { MoveIcon, PencilIcon, PrinterIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { PageHeader } from "@/components/app/page-header"
import { ToneBadge } from "@/components/app/tone-badge"
import { useCodeLabel } from "@/components/app/use-code-label"
import { useRun } from "@/components/app/use-run"
import { useAuth } from "@/context/auth-context"
import { formatCurrency, formatDay, toDateInput } from "@/lib/format"
import { P, hasPermission } from "@/lib/permissions"
import { ROUTES, withId } from "@/routes/routeConstants"
import {
  fetchMovements,
  fetchStore,
  moveAssetLocation,
  updateAsset,
  type Asset,
  type Movement,
  type Store,
} from "@/services/store"
import { MovementsTable } from "./stock"
import { TagLabel } from "./tag-label"
import { AssetActions, AssetMaintenance } from "./asset-actions"
import { AssetCustody } from "../custody/custody-history"

function EditDialog({
  asset,
  onClose,
  onSaved,
}: {
  asset: Asset
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const run = useRun()
  const v = asset.vehicle
  const [f, setF] = useState({
    serialNumber: asset.serialNumber ?? "",
    brand: asset.brand ?? "",
    model: asset.model ?? "",
    warrantyExpiry: toDateInput(asset.warrantyExpiry),
    notes: asset.notes ?? "",
    reg: v?.registrationNumber ?? "",
    chassis: v?.chassisNumber ?? "",
    engine: v?.engineNumber ?? "",
    fuel: v?.fuelType ?? "",
    seats: v?.seatingCapacity != null ? String(v.seatingCapacity) : "",
    insurance: toDateInput(v?.insuranceExpiry),
    licence: toDateInput(v?.roadLicenceExpiry),
    km: v?.serviceIntervalKm != null ? String(v.serviceIntervalKm) : "",
    months:
      v?.serviceIntervalMonths != null ? String(v.serviceIntervalMonths) : "",
    reason: "",
  })
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF((p) => ({ ...p, [k]: e.target.value }))
  const field = (k: keyof typeof f, labelText: string, type = "text") => (
    <Field>
      <FieldLabel htmlFor={`ae-${k}`}>{labelText}</FieldLabel>
      <Input id={`ae-${k}`} type={type} value={f[k]} onChange={set(k)} />
    </Field>
  )
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("assets.edit", "Correct asset details")}</DialogTitle>
          <DialogDescription>
            {t(
              "assets.edit_hint",
              "Descriptive data only; location, holder and status change through transactions. Audited."
            )}
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-3">
            {field("serialNumber", t("assets.serial", "Serial number"))}
            {field("brand", t("assets.brand", "Brand"))}
            {field("model", t("assets.model", "Model"))}
          </div>
          {field(
            "warrantyExpiry",
            t("assets.warranty", "Warranty expiry"),
            "date"
          )}
          {asset.product.isVehicle && (
            <div className="grid gap-4 rounded-md border p-3 sm:grid-cols-2">
              {field("reg", t("vehicle.registration", "Registration number"))}
              {field("chassis", t("vehicle.chassis", "Chassis number"))}
              {field("engine", t("vehicle.engine", "Engine number"))}
              {field("fuel", t("vehicle.fuel", "Fuel type"))}
              {field("seats", t("vehicle.seats", "Seats"), "number")}
              {field(
                "insurance",
                t("vehicle.insurance", "Insurance expiry"),
                "date"
              )}
              {field(
                "licence",
                t("vehicle.licence", "Road licence expiry"),
                "date"
              )}
              {field(
                "km",
                t("vehicle.service_km", "Service every (km)"),
                "number"
              )}
              {field(
                "months",
                t("vehicle.service_months", "Service every (months)"),
                "number"
              )}
            </div>
          )}
          <Field>
            <FieldLabel htmlFor="ae-notes">
              {t("assets.notes", "Notes")}
            </FieldLabel>
            <Textarea
              id="ae-notes"
              rows={2}
              value={f.notes}
              onChange={set("notes")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="ae-reason">
              {t("common.reason", "Reason")}
            </FieldLabel>
            <Input id="ae-reason" value={f.reason} onChange={set("reason")} />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("actions.cancel", "Cancel")}
          </Button>
          <Button
            disabled={
              busy ||
              f.reason.trim().length < 3 ||
              (asset.product.isVehicle && f.reg.trim().length < 2)
            }
            onClick={async () => {
              setBusy(true)
              const num = (s: string) => (s ? Number(s) : null)
              const ok = await run(
                () =>
                  updateAsset({
                    uniqueId: asset.uniqueId,
                    serialNumber: f.serialNumber || null,
                    brand: f.brand || null,
                    model: f.model || null,
                    warrantyExpiry: f.warrantyExpiry || null,
                    notes: f.notes || null,
                    vehicle: asset.product.isVehicle
                      ? {
                          registrationNumber: f.reg,
                          chassisNumber: f.chassis || null,
                          engineNumber: f.engine || null,
                          fuelType: f.fuel || null,
                          seatingCapacity: num(f.seats),
                          insuranceExpiry: f.insurance || null,
                          roadLicenceExpiry: f.licence || null,
                          serviceIntervalKm: num(f.km),
                          serviceIntervalMonths: num(f.months),
                        }
                      : null,
                    reason: f.reason.trim(),
                  }),
                t("common.saved", "Saved")
              )
              setBusy(false)
              if (ok) onSaved()
            }}
          >
            {t("common.save", "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MoveDialog({
  asset,
  onClose,
  onSaved,
}: {
  asset: Asset
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const run = useRun()
  const [store, setStore] = useState<Store | null>(null)
  const [loc, setLoc] = useState("")
  useEffect(() => {
    if (asset.store) void fetchStore(asset.store.uniqueId).then(setStore)
  }, [asset.store])
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("assets.move", "Move within the store")}</DialogTitle>
          <DialogDescription>
            {asset.isKit
              ? t(
                  "assets.move_kit",
                  "Kit components in the store move with the kit."
                )
              : t("assets.move_hint", "Recorded as a location move.")}
          </DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="mv-loc">
            {t("locations.path", "Location")}
          </FieldLabel>
          <NativeSelect
            id="mv-loc"
            className="w-full"
            value={loc}
            onChange={(e) => setLoc(e.target.value)}
          >
            <NativeSelectOption value="">
              {t("common.choose", "— Choose —")}
            </NativeSelectOption>
            {store?.locations
              .filter(
                (l) =>
                  l.kind === "GENERAL" &&
                  l.isActive &&
                  l.uniqueId !== asset.location?.uniqueId
              )
              .map((l) => (
                <NativeSelectOption key={l.uniqueId} value={l.uniqueId}>
                  {l.path}
                </NativeSelectOption>
              ))}
          </NativeSelect>
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("actions.cancel", "Cancel")}
          </Button>
          <Button
            disabled={!loc}
            onClick={async () => {
              const ok = await run(
                () => moveAssetLocation(asset.uniqueId, loc),
                t("assets.moved", "Moved")
              )
              if (ok) onSaved()
            }}
          >
            {t("assets.move_button", "Move")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const AssetDetailsPage = () => {
  const { t } = useTranslation()
  const label = useCodeLabel()
  const { user } = useAuth()
  const { revalidate } = useRevalidator()
  const { asset: a } = useLoaderData() as { asset: Asset }
  const [dialog, setDialog] = useState<null | "edit" | "move">(null)
  const [history, setHistory] = useState<Movement[]>([])
  useEffect(
    () =>
      void fetchMovements({ assetUniqueId: a.uniqueId }, 1, 200).then(
        setHistory
      ),
    [a]
  )

  const canMove =
    (a.status === "IN_STORE" || a.status === "RESERVED") &&
    (hasPermission(user, P.STOCK_ISSUE) || hasPermission(user, P.STOCK_ADJUST))
  const done = () => {
    setDialog(null)
    revalidate()
  }
  const rows: [string, React.ReactNode][] = [
    [t("assets.serial", "Serial number"), a.serialNumber],
    [
      t("assets.brand_model", "Brand / model"),
      [a.brand, a.model].filter(Boolean).join(" ") || null,
    ],
    [t("products.owner", "Owning department"), a.owningDepartment.name],
    [t("assets.source", "Source"), label(a.source)],
    [
      t("assets.price", "Purchase price (excl. VAT)"),
      a.purchasePrice != null
        ? `${formatCurrency(a.purchasePrice)}${a.priceEstimated ? ` (${t("assets.estimated", "estimated")})` : ""}`
        : null,
    ],
    [
      t("assets.purchase_date", "Purchase date"),
      a.purchaseDate ? formatDay(a.purchaseDate) : null,
    ],
    [
      t("assets.warranty", "Warranty expiry"),
      a.warrantyExpiry ? formatDay(a.warrantyExpiry) : null,
    ],
    [
      t("assets.references", "LPO / GRN / inspection"),
      [a.lpoRef, a.grnRef, a.inspectionRef].filter(Boolean).join(" · ") || null,
    ],
    [t("assets.notes", "Notes"), a.notes],
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{a.tag}</span>
            <ToneBadge code={a.status} />
            <ToneBadge code={a.condition} />
          </span>
        }
        description={
          <>
            <Link
              className="underline"
              to={withId(ROUTES.PRODUCT_DETAILS, a.product.uniqueId)}
            >
              {a.product.name}
            </Link>{" "}
            · <span className="font-mono">{a.product.code}</span> ·{" "}
            {t("assets.product_version", "version {{v}}", {
              v: a.product.version,
            })}
          </>
        }
        actions={
          <>
            <AssetActions asset={a} onChanged={revalidate} />
            {hasPermission(user, P.ASSET_TAG_PRINT) && (
              <Button variant="outline" asChild>
                <Link
                  to={`${ROUTES.ASSET_TAGS}?tags=${encodeURIComponent(a.tag)}&captions=${encodeURIComponent(a.product.name)}`}
                >
                  <PrinterIcon />
                  {t("assets.print_tag", "Print tag")}
                </Link>
              </Button>
            )}
            {canMove && a.store && (
              <Button variant="outline" onClick={() => setDialog("move")}>
                <MoveIcon />
                {t("assets.move", "Move within the store")}
              </Button>
            )}
            {a.canEdit && (
              <Button onClick={() => setDialog("edit")}>
                <PencilIcon />
                {t("actions.edit", "Edit")}
              </Button>
            )}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("assets.details", "Details")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {rows.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v ?? "—"}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("assets.where", "Where")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {a.custodian ? (
                <div>
                  <div className="text-muted-foreground">
                    {t("assets.held_by", "Held by")}
                  </div>
                  <Link
                    className="font-medium underline"
                    to={withId(ROUTES.EMPLOYEE_DETAILS, a.custodian.uniqueId)}
                  >
                    {a.custodian.fullName}
                  </Link>{" "}
                  <span className="font-mono text-xs">
                    {a.custodian.employeeNumber}
                  </span>
                </div>
              ) : null}
              <div>
                <div className="text-muted-foreground">
                  {t("stores.store", "Store")}
                </div>
                {a.store ? (
                  <Link
                    className="font-medium underline"
                    to={withId(ROUTES.STORE_DETAILS, a.store.uniqueId)}
                  >
                    {a.store.name}
                  </Link>
                ) : (
                  "—"
                )}
                {a.location && (
                  <div className="text-muted-foreground">{a.location.path}</div>
                )}
              </div>
            </CardContent>
          </Card>
          <div className="max-w-xs">
            <TagLabel tag={a.tag} caption={a.product.name} />
          </div>
        </div>
      </div>

      {(a.isKit || a.parent) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {a.isKit
                ? t("assets.kit_components", "Kit components")
                : t("assets.part_of_kit", "Part of kit")}
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y text-sm">
            {(a.isKit ? a.components : a.parent ? [a.parent] : []).map((c) => (
              <Link
                key={c.uniqueId}
                to={withId(ROUTES.ASSET_DETAILS, c.uniqueId)}
                className="flex flex-wrap items-center gap-2 py-2 hover:bg-muted"
              >
                <span className="font-mono">{c.tag}</span>
                <span className="flex-1">{c.productName}</span>
                <ToneBadge code={c.condition} />
                <ToneBadge code={c.status} />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {a.vehicle && (
        <Card>
          <CardHeader>
            <CardTitle>{t("vehicle.title", "Vehicle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              {(
                [
                  [
                    t("vehicle.registration", "Registration number"),
                    a.vehicle.registrationNumber,
                  ],
                  [
                    t("vehicle.chassis", "Chassis number"),
                    a.vehicle.chassisNumber,
                  ],
                  [
                    t("vehicle.engine", "Engine number"),
                    a.vehicle.engineNumber,
                  ],
                  [t("vehicle.fuel", "Fuel type"), a.vehicle.fuelType],
                  [t("vehicle.seats", "Seats"), a.vehicle.seatingCapacity],
                  [
                    t("vehicle.insurance", "Insurance expiry"),
                    a.vehicle.insuranceExpiry &&
                      formatDay(a.vehicle.insuranceExpiry),
                  ],
                  [
                    t("vehicle.licence", "Road licence expiry"),
                    a.vehicle.roadLicenceExpiry &&
                      formatDay(a.vehicle.roadLicenceExpiry),
                  ],
                  [
                    t("vehicle.service", "Service interval"),
                    [
                      a.vehicle.serviceIntervalKm &&
                        `${a.vehicle.serviceIntervalKm} km`,
                      a.vehicle.serviceIntervalMonths &&
                        `${a.vehicle.serviceIntervalMonths} ${t("vehicle.months", "months")}`,
                    ]
                      .filter(Boolean)
                      .join(" / ") || null,
                  ],
                ] as const
              ).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v ?? "—"}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      )}

      <AssetCustody
        assetUniqueId={a.uniqueId}
        tag={a.tag}
        onChanged={revalidate}
      />
      <AssetMaintenance assetUniqueId={a.uniqueId} />

      <Card>
        <CardHeader>
          <CardTitle>{t("assets.history", "History")}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <MovementsTable rows={history} />
        </CardContent>
      </Card>

      {dialog === "edit" && (
        <EditDialog asset={a} onClose={() => setDialog(null)} onSaved={done} />
      )}
      {dialog === "move" && (
        <MoveDialog asset={a} onClose={() => setDialog(null)} onSaved={done} />
      )}
    </div>
  )
}

export default AssetDetailsPage
