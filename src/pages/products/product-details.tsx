import { useEffect, useState } from "react"
import { Link, useLoaderData, useNavigate, useRevalidator } from "react-router"
import { useTranslation } from "react-i18next"
import {
  ArrowRightLeftIcon,
  BoxesIcon,
  CopyPlusIcon,
  GitMergeIcon,
  PaperclipIcon,
  PencilIcon,
  SendIcon,
  Settings2Icon,
  ShieldCheckIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
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
import { ReasonDialog } from "@/components/app/reason-dialog"
import { ConfirmDialog } from "@/components/app/confirm-dialog"
import { AsyncPicker, type PickerOption } from "@/components/app/async-picker"
import { useRun } from "@/components/app/use-run"
import { useAuth } from "@/context/auth-context"
import {
  formatCurrency,
  formatDay,
  formatStamp,
  resolveImageUrl,
} from "@/lib/format"
import { P, hasPermission } from "@/lib/permissions"
import { ROUTES, withId } from "@/routes/routeConstants"
import { fetchDepartments, type Department } from "@/services/org"
import {
  fetchProducts,
  fetchProductVersions,
  mergeProduct,
  reviseProduct,
  setProductActivation,
  setProductStatus,
  submitProduct,
  transferProductOwnership,
  type AcquisitionMethod,
  type Product,
  type ProductVersion,
  type Spec,
  type StoreItemType,
  type TrackingType,
} from "@/services/products"

function specText(s: Spec, label: (c: string) => string) {
  const unit = s.unit ? ` ${s.unit}` : ""
  switch (s.rule) {
    case "MIN":
      return `≥ ${s.value}${unit}`
    case "MAX":
      return `≤ ${s.value}${unit}`
    case "RANGE":
      return `${s.value} – ${s.valueMax}${unit}`
    case "ONE_OF":
      return `${label("ONE_OF")}: ${s.value}`
    default:
      return `${s.value}${unit}`
  }
}

function VersionBody({ v }: { v: ProductVersion }) {
  const { t } = useTranslation()
  const label = useCodeLabel()
  return (
    <div className="space-y-4">
      <p className="text-sm whitespace-pre-line">{v.description}</p>
      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">
            {t("products.category", "Category")}
          </dt>
          <dd>{v.category.name}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">
            {t("products.unit", "Unit of measure")}
          </dt>
          <dd>{v.unit}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">
            {t("products.reference_price_short", "Reference price")}
          </dt>
          <dd>
            {v.referencePrice != null ? formatCurrency(v.referencePrice) : "—"}
          </dd>
        </div>
      </dl>
      <div>
        <h3 className="mb-2 text-sm font-medium">
          {t("products.specifications", "Specifications")}
        </h3>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableBody>
              {v.specs.map((s, i) => (
                <TableRow key={i}>
                  <TableCell className="w-1/3 font-medium">
                    {s.attribute}
                  </TableCell>
                  <TableCell>{specText(s, label)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-medium">
          {t("products.criteria", "Receiving criteria")}
        </h3>
        <ul className="list-inside list-disc space-y-1 text-sm">
          {v.criteria.map((c, i) => (
            <li key={i}>
              {c.text}
              {!c.fromLibrary && (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({t("products.department_specific", "department-specific")})
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
      {v.attachments.length > 0 && (
        <div className="space-y-1">
          <h3 className="text-sm font-medium">
            {t("products.attachments", "Attachments")}
          </h3>
          {v.attachments.map((a) => (
            <a
              key={a.uniqueId}
              href={resolveImageUrl(a.uri)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-sm underline"
            >
              <PaperclipIcon className="size-4" />
              {a.filename}
            </a>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {t("products.version_meta", "Version {{v}} by {{author}}", {
          v: v.version,
          author: v.author,
        })}
        {v.activatedAt &&
          ` · ${t("products.activated_on", "active since {{d}}", {
            d: formatStamp(v.activatedAt),
          })}`}
      </p>
    </div>
  )
}

function ActivationDialog({
  product,
  onClose,
  onSaved,
}: {
  product: Product
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const label = useCodeLabel()
  const run = useRun()
  const [code, setCode] = useState(product.code ?? "")
  const [itemType, setItemType] = useState<StoreItemType>(
    product.itemType ?? "FIXED_ASSET"
  )
  const [tracking, setTracking] = useState<TrackingType>(
    product.trackingType ?? "SERIALISED"
  )
  const [method, setMethod] = useState<AcquisitionMethod>(
    product.acquisitionMethod ?? "QUOTATION"
  )
  const [vendor, setVendor] = useState(product.singleSourceVendor ?? "")
  const [vat, setVat] = useState(String(product.vatRate ?? 18))
  const [vehicle, setVehicle] = useState(product.isVehicle)
  const [busy, setBusy] = useState(false)
  const trackings: TrackingType[] =
    itemType === "FIXED_ASSET" ? ["SERIALISED"] : ["QUANTITY", "BATCH"]
  const effectiveTracking = trackings.includes(tracking)
    ? tracking
    : trackings[0]

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("products.activation", "Activation fields")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "products.activation_hint",
              "Set by Procurement before the final approval. Leave the code blank to get the next code of the category series."
            )}
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="a-code">
                {t("products.code", "Product code")}
              </FieldLabel>
              <Input
                id="a-code"
                value={code}
                placeholder={t("products.auto", "Automatic")}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="a-vat">
                {t("products.vat", "VAT rate (%)")}
              </FieldLabel>
              <Input
                id="a-vat"
                type="number"
                min={0}
                max={100}
                value={vat}
                onChange={(e) => setVat(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="a-type">
                {t("products.item_type", "Store item type")}
              </FieldLabel>
              <NativeSelect
                id="a-type"
                className="w-full"
                value={itemType}
                onChange={(e) => {
                  const next = e.target.value as StoreItemType
                  setItemType(next)
                  if (next !== "FIXED_ASSET") setVehicle(false)
                }}
              >
                {(["FIXED_ASSET", "CONSUMABLE", "SPARE"] as const).map((x) => (
                  <NativeSelectOption key={x} value={x}>
                    {label(x)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="a-track">
                {t("products.tracking", "Tracking")}
              </FieldLabel>
              <NativeSelect
                id="a-track"
                className="w-full"
                value={effectiveTracking}
                onChange={(e) => setTracking(e.target.value as TrackingType)}
              >
                {trackings.map((x) => (
                  <NativeSelectOption key={x} value={x}>
                    {label(x)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="a-method">
                {t("products.acquisition", "Acquisition method")}
              </FieldLabel>
              <NativeSelect
                id="a-method"
                className="w-full"
                value={method}
                onChange={(e) => setMethod(e.target.value as AcquisitionMethod)}
              >
                {(["QUOTATION", "SINGLE_SOURCE"] as const).map((x) => (
                  <NativeSelectOption key={x} value={x}>
                    {label(x)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            {method === "SINGLE_SOURCE" && (
              <Field>
                <FieldLabel htmlFor="a-vendor">
                  {t("products.vendor", "Vendor")}
                </FieldLabel>
                <Input
                  id="a-vendor"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                />
              </Field>
            )}
          </div>
          {itemType === "FIXED_ASSET" && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={vehicle}
                onCheckedChange={(v) => setVehicle(v === true)}
              />
              {t(
                "products.is_vehicle",
                "This product is a vehicle (registration, insurance, road licence)"
              )}
            </label>
          )}
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("actions.cancel", "Cancel")}
          </Button>
          <Button
            disabled={
              busy ||
              vat === "" ||
              (method === "SINGLE_SOURCE" && vendor.trim().length < 2)
            }
            onClick={async () => {
              setBusy(true)
              const ok = await run(
                () =>
                  setProductActivation({
                    productUniqueId: product.uniqueId,
                    code: code.trim() || null,
                    itemType,
                    trackingType: effectiveTracking,
                    acquisitionMethod: method,
                    singleSourceVendor:
                      method === "SINGLE_SOURCE" ? vendor.trim() : null,
                    vatRate: Number(vat),
                    isVehicle: vehicle,
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

type DialogKind = null | "activation" | "status" | "owner" | "merge" | "submit"

const ProductDetailsPage = () => {
  const { t } = useTranslation()
  const label = useCodeLabel()
  const run = useRun()
  const navigate = useNavigate()
  const { revalidate } = useRevalidator()
  const { user } = useAuth()
  const { product: p } = useLoaderData() as { product: Product }
  const [dialog, setDialog] = useState<DialogKind>(null)
  const [nextStatus, setNextStatus] = useState<
    "ACTIVE" | "INACTIVE" | "RETIRED"
  >("INACTIVE")
  const [versions, setVersions] = useState<ProductVersion[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [ownerId, setOwnerId] = useState("")
  const [mergeInto, setMergeInto] = useState<PickerOption | null>(null)

  useEffect(() => void fetchProductVersions(p.uniqueId).then(setVersions), [p])
  useEffect(() => {
    if (dialog === "owner" && !departments.length)
      void fetchDepartments().then(setDepartments)
  }, [dialog, departments.length])

  const done = () => {
    setDialog(null)
    revalidate()
  }
  const pending = p.pending
  const current = p.current
  const isProcurement = p.can.manage

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {p.name}
            <ToneBadge code={p.status} />
          </span>
        }
        description={
          <>
            <span className="font-mono">
              {p.code ?? t("products.no_code", "No code yet")}
            </span>
            {" · "}
            {t("products.owned_by", "Owned by {{dept}}", {
              dept: p.owningDepartment.name,
            })}
            {p.mergedInto && (
              <>
                {" · "}
                {t("products.merged_into", "Merged into")}{" "}
                <Link
                  className="underline"
                  to={withId(ROUTES.PRODUCT_DETAILS, p.mergedInto.uniqueId)}
                >
                  {p.mergedInto.code} {p.mergedInto.name}
                </Link>
              </>
            )}
          </>
        }
        actions={
          <>
            {p.can.edit && (
              <Button variant="outline" asChild>
                <Link to={withId(ROUTES.PRODUCT_EDIT, p.uniqueId)}>
                  <PencilIcon />
                  {t("actions.edit", "Edit")}
                </Link>
              </Button>
            )}
            {p.can.submit && (
              <Button onClick={() => setDialog("submit")}>
                <SendIcon />
                {t("products.submit", "Submit for activation")}
              </Button>
            )}
            {p.can.revise && (
              <Button
                variant="outline"
                onClick={async () => {
                  const ok = await run(
                    () => reviseProduct(p.uniqueId),
                    t("products.revision_started", "New version started")
                  )
                  if (ok) navigate(withId(ROUTES.PRODUCT_EDIT, p.uniqueId))
                }}
              >
                <CopyPlusIcon />
                {t("products.revise", "New version")}
              </Button>
            )}
            {p.current &&
              hasPermission(user, P.ASSET_VIEW) &&
              p.trackingType === "SERIALISED" && (
                <Button variant="outline" asChild>
                  <Link to={`${ROUTES.ASSETS}?product=${p.uniqueId}`}>
                    <BoxesIcon />
                    {t("products.assets", "Assets ({{n}})", {
                      n: p.assetCount,
                    })}
                  </Link>
                </Button>
              )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {pending && (
            <Card className="border-amber-500/40">
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    {current
                      ? t(
                          "products.pending_version",
                          "Version {{v}} in progress",
                          {
                            v: pending.version,
                          }
                        )
                      : t("products.draft_version", "Version {{v}}", {
                          v: pending.version,
                        })}
                    <ToneBadge code={pending.status} />
                  </CardTitle>
                  <CardDescription>
                    {pending.status === "IN_APPROVAL"
                      ? t(
                          "products.in_approval_hint",
                          "Waiting for activation (owning-department HOD, then Procurement)."
                        )
                      : current
                        ? t(
                            "products.revision_hint",
                            "The version in force stays in use until this one is approved."
                          )
                        : t(
                            "products.draft_hint",
                            "Not visible to other departments until it is activated."
                          )}
                  </CardDescription>
                </div>
                {pending.approvalRequestUniqueId && (
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      to={withId(
                        ROUTES.APPROVAL_DETAILS,
                        pending.approvalRequestUniqueId
                      )}
                    >
                      <ShieldCheckIcon />
                      {t("products.open_approval", "Approval")}
                    </Link>
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <VersionBody v={pending} />
              </CardContent>
            </Card>
          )}
          {current ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {t("products.in_force", "Version {{v}} (in force)", {
                    v: current.version,
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VersionBody v={current} />
              </CardContent>
            </Card>
          ) : null}
          {versions.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {t("products.history", "Version history")}
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("products.version", "Version")}</TableHead>
                      <TableHead>{t("common.name", "Name")}</TableHead>
                      <TableHead>{t("common.status", "Status")}</TableHead>
                      <TableHead>{t("products.author", "Author")}</TableHead>
                      <TableHead>
                        {t("products.activated", "Activated")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {versions.map((v) => (
                      <TableRow key={v.uniqueId}>
                        <TableCell>{v.version}</TableCell>
                        <TableCell>{v.name}</TableCell>
                        <TableCell>
                          <ToneBadge code={v.status} />
                        </TableCell>
                        <TableCell>{v.author}</TableCell>
                        <TableCell>
                          {v.activatedAt ? formatDay(v.activatedAt) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="h-fit">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>{t("products.procurement", "Procurement")}</CardTitle>
              <CardDescription>
                {t("products.procurement_hint", "Set at activation (§5.3).")}
              </CardDescription>
            </div>
            {isProcurement && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDialog("activation")}
              >
                <Settings2Icon />
                {t("actions.edit", "Edit")}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              {(
                [
                  [t("products.code", "Product code"), p.code],
                  [
                    t("products.item_type", "Store item type"),
                    p.itemType && label(p.itemType),
                  ],
                  [
                    t("products.tracking", "Tracking"),
                    p.trackingType && label(p.trackingType),
                  ],
                  [
                    t("products.acquisition", "Acquisition method"),
                    p.acquisitionMethod &&
                      `${label(p.acquisitionMethod)}${p.singleSourceVendor ? ` — ${p.singleSourceVendor}` : ""}`,
                  ],
                  [
                    t("products.vat", "VAT rate (%)"),
                    p.vatRate != null ? `${p.vatRate}%` : null,
                  ],
                  [
                    t("products.vehicle", "Vehicle"),
                    p.isVehicle ? t("common.yes", "Yes") : t("common.no", "No"),
                  ],
                ] as const
              ).map(([k, val]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right font-medium">{val ?? "—"}</dd>
                </div>
              ))}
            </dl>
            {(isProcurement || p.can.merge) && (
              <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                {isProcurement && p.current && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNextStatus(
                        p.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
                      )
                      setDialog("status")
                    }}
                  >
                    {p.status === "ACTIVE"
                      ? t("products.deactivate", "Deactivate / retire")
                      : t("products.reactivate", "Change status")}
                  </Button>
                )}
                {isProcurement && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDialog("owner")}
                  >
                    <ArrowRightLeftIcon />
                    {t("products.transfer_owner", "Transfer ownership")}
                  </Button>
                )}
                {p.can.merge && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDialog("merge")}
                  >
                    <GitMergeIcon />
                    {t("products.merge", "Merge as duplicate")}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {dialog === "activation" && (
        <ActivationDialog
          product={p}
          onClose={() => setDialog(null)}
          onSaved={done}
        />
      )}
      <ConfirmDialog
        open={dialog === "submit"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={t("products.submit_title", "Submit for activation?")}
        description={t(
          "products.submit_hint",
          "The HOD of the owning department reviews it, then Procurement sets the code and store fields and activates it."
        )}
        confirmLabel={t("products.submit", "Submit for activation")}
        onConfirm={async () => {
          const ok = await run(
            () => submitProduct(p.uniqueId),
            t("products.submitted", "Submitted for activation")
          )
          if (ok) done()
        }}
      />
      {dialog === "status" && (
        <ReasonDialog
          title={t("products.status_title", "Change product status")}
          description={t(
            "products.status_hint",
            "Inactive products cannot be requested; retired products are kept for history only."
          )}
          confirmLabel={t("common.save", "Save")}
          destructive={nextStatus === "RETIRED"}
          onClose={() => setDialog(null)}
          onConfirm={async (reason) => {
            const ok = await run(
              () => setProductStatus(p.uniqueId, nextStatus, reason),
              t("common.saved", "Saved")
            )
            if (ok) revalidate()
            return ok
          }}
        >
          <Field>
            <FieldLabel htmlFor="next-status">
              {t("common.status", "Status")}
            </FieldLabel>
            <NativeSelect
              id="next-status"
              className="w-full"
              value={nextStatus}
              onChange={(e) =>
                setNextStatus(e.target.value as typeof nextStatus)
              }
            >
              {(["ACTIVE", "INACTIVE", "RETIRED"] as const)
                .filter((s) => s !== p.status)
                .map((s) => (
                  <NativeSelectOption key={s} value={s}>
                    {label(s)}
                  </NativeSelectOption>
                ))}
            </NativeSelect>
          </Field>
        </ReasonDialog>
      )}
      {dialog === "owner" && (
        <ReasonDialog
          title={t("products.transfer_owner", "Transfer ownership")}
          description={t(
            "products.transfer_hint",
            "The new owning department orders and inspects this product from now on."
          )}
          confirmLabel={t("products.transfer", "Transfer")}
          canConfirm={!!ownerId}
          onClose={() => setDialog(null)}
          onConfirm={async (reason) => {
            const ok = await run(
              () => transferProductOwnership(p.uniqueId, ownerId, reason),
              t("common.saved", "Saved")
            )
            if (ok) revalidate()
            return ok
          }}
        >
          <Field>
            <FieldLabel htmlFor="new-owner">
              {t("products.owner", "Owning department")}
            </FieldLabel>
            <NativeSelect
              id="new-owner"
              className="w-full"
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
            >
              <NativeSelectOption value="">
                {t("common.choose", "— Choose —")}
              </NativeSelectOption>
              {departments
                .filter(
                  (d) =>
                    d.isActive && d.uniqueId !== p.owningDepartment.uniqueId
                )
                .map((d) => (
                  <NativeSelectOption key={d.uniqueId} value={d.uniqueId}>
                    {d.name}
                  </NativeSelectOption>
                ))}
            </NativeSelect>
          </Field>
        </ReasonDialog>
      )}
      {dialog === "merge" && (
        <ReasonDialog
          title={t("products.merge", "Merge as duplicate")}
          description={t(
            "products.merge_hint",
            "This product is retired and points to the one you choose. Only products without stock can be merged."
          )}
          confirmLabel={t("products.merge_confirm", "Merge")}
          destructive
          canConfirm={!!mergeInto}
          onClose={() => setDialog(null)}
          onConfirm={async (reason) => {
            const ok = await run(
              () => mergeProduct(p.uniqueId, mergeInto!.value, reason),
              t("products.merged", "Merged")
            )
            if (ok) revalidate()
            return ok
          }}
        >
          <Field>
            <FieldLabel>
              {t("products.merge_into", "Keep this product")}
            </FieldLabel>
            <AsyncPicker
              selected={mergeInto}
              onChange={setMergeInto}
              search={async (q) =>
                (
                  await fetchProducts(
                    { search: q || undefined, statuses: ["ACTIVE"] },
                    1,
                    20
                  )
                ).data
                  .filter((x) => x.uniqueId !== p.uniqueId)
                  .map((x) => ({
                    value: x.uniqueId,
                    label: x.name,
                    hint: `${x.code} · ${x.departmentName}`,
                  }))
              }
            />
          </Field>
        </ReasonDialog>
      )}
    </div>
  )
}

export default ProductDetailsPage
