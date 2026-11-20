import { useEffect, useState } from "react"
import { Link, useLoaderData, useRevalidator } from "react-router"
import { useTranslation } from "react-i18next"
import {
  BoxesIcon,
  FileSpreadsheetIcon,
  PackageIcon,
  PencilIcon,
  PlusIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
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
import { ActiveBadge } from "@/components/app/status-badge"
import { AsyncPicker, type PickerOption } from "@/components/app/async-picker"
import { useCodeLabel } from "@/components/app/use-code-label"
import { useRun } from "@/components/app/use-run"
import { useAuth } from "@/context/auth-context"
import { P, hasPermission } from "@/lib/permissions"
import { ROUTES } from "@/routes/routeConstants"
import { fetchProducts } from "@/services/products"
import {
  fetchStockSettings,
  saveLocation,
  saveStockSetting,
  type StockSetting,
  type Store,
  type StoreLocation,
} from "@/services/store"
import { StoreDialog } from "./stores"

function LocationDialog({
  store,
  location,
  onClose,
  onSaved,
}: {
  store: Store
  location: StoreLocation | null
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const run = useRun()
  const [code, setCode] = useState(location?.code ?? "")
  const [name, setName] = useState(location?.name ?? "")
  const [parent, setParent] = useState(location?.parentUniqueId ?? "")
  const [active, setActive] = useState(location?.isActive ?? true)
  const [busy, setBusy] = useState(false)
  const parents = store.locations.filter(
    (l) => l.kind === "GENERAL" && l.uniqueId !== location?.uniqueId
  )
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {location
              ? t("locations.edit", "Edit location")
              : t("locations.new", "New location")}
          </DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="l-code">
                {t("common.code", "Code")}
              </FieldLabel>
              <Input
                id="l-code"
                value={code}
                placeholder="A-01"
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="l-name">
                {t("common.name", "Name")}
              </FieldLabel>
              <Input
                id="l-name"
                value={name}
                placeholder={t("locations.name_hint", "Shelf 1")}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="l-parent">
              {t("locations.parent", "Inside (optional)")}
            </FieldLabel>
            <NativeSelect
              id="l-parent"
              className="w-full"
              value={parent}
              onChange={(e) => setParent(e.target.value)}
            >
              <NativeSelectOption value="">
                {t("locations.top", "— Directly in the store —")}
              </NativeSelectOption>
              {parents.map((l) => (
                <NativeSelectOption key={l.uniqueId} value={l.uniqueId}>
                  {l.path}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          {location && (
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={active} onCheckedChange={setActive} />
              {t("common.active", "Active")}
            </label>
          )}
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("actions.cancel", "Cancel")}
          </Button>
          <Button
            disabled={busy || !code || !name.trim()}
            onClick={async () => {
              setBusy(true)
              const ok = await run(
                () =>
                  saveLocation({
                    storeUniqueId: store.uniqueId,
                    uniqueId: location?.uniqueId,
                    parentUniqueId: parent || null,
                    code,
                    name: name.trim(),
                    isActive: active,
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

function SettingDialog({
  store,
  setting,
  onClose,
  onSaved,
}: {
  store: Store
  setting: StockSetting | null
  onClose: () => void
  onSaved: (rows: StockSetting[]) => void
}) {
  const { t } = useTranslation()
  const run = useRun()
  const [product, setProduct] = useState<PickerOption | null>(
    setting
      ? { value: setting.productUniqueId, label: setting.productName }
      : null
  )
  const [min, setMin] = useState(String(setting?.minLevel ?? 0))
  const [reorder, setReorder] = useState(String(setting?.reorderLevel ?? 0))
  const [max, setMax] = useState(
    setting?.maxLevel != null ? String(setting.maxLevel) : ""
  )
  const [loc, setLoc] = useState(setting?.defaultLocationUniqueId ?? "")
  const [busy, setBusy] = useState(false)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("settings_stock.title", "Stock levels")}</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel>{t("products.product", "Product")}</FieldLabel>
            <AsyncPicker
              selected={product}
              onChange={setProduct}
              disabled={!!setting}
              search={async (q) =>
                (
                  await fetchProducts(
                    { search: q || undefined, statuses: ["ACTIVE"] },
                    1,
                    20
                  )
                ).data.map((p) => ({
                  value: p.uniqueId,
                  label: p.name,
                  hint: `${p.code ?? ""} · ${p.unit}`,
                }))
              }
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="st-min">
                {t("settings_stock.min", "Minimum")}
              </FieldLabel>
              <Input
                id="st-min"
                type="number"
                min={0}
                value={min}
                onChange={(e) => setMin(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="st-re">
                {t("settings_stock.reorder", "Reorder level")}
              </FieldLabel>
              <Input
                id="st-re"
                type="number"
                min={0}
                value={reorder}
                onChange={(e) => setReorder(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="st-max">
                {t("settings_stock.max", "Maximum")}
              </FieldLabel>
              <Input
                id="st-max"
                type="number"
                min={0}
                value={max}
                onChange={(e) => setMax(e.target.value)}
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="st-loc">
              {t("settings_stock.default_location", "Default location")}
            </FieldLabel>
            <NativeSelect
              id="st-loc"
              className="w-full"
              value={loc}
              onChange={(e) => setLoc(e.target.value)}
            >
              <NativeSelectOption value="">—</NativeSelectOption>
              {store.locations
                .filter((l) => l.kind === "GENERAL" && l.isActive)
                .map((l) => (
                  <NativeSelectOption key={l.uniqueId} value={l.uniqueId}>
                    {l.path}
                  </NativeSelectOption>
                ))}
            </NativeSelect>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("actions.cancel", "Cancel")}
          </Button>
          <Button
            disabled={busy || !product}
            onClick={async () => {
              setBusy(true)
              let rows: StockSetting[] = []
              const ok = await run(
                async () => {
                  rows = await saveStockSetting({
                    storeUniqueId: store.uniqueId,
                    productUniqueId: product!.value,
                    minLevel: Number(min || 0),
                    reorderLevel: Number(reorder || 0),
                    maxLevel: max === "" ? null : Number(max),
                    defaultLocationUniqueId: loc || null,
                  })
                },
                t("common.saved", "Saved")
              )
              setBusy(false)
              if (ok) onSaved(rows)
            }}
          >
            {t("common.save", "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const StoreDetailsPage = () => {
  const { t } = useTranslation()
  const label = useCodeLabel()
  const { user } = useAuth()
  const { revalidate } = useRevalidator()
  const { store, stores } = useLoaderData() as { store: Store; stores: Store[] }
  const [editing, setEditing] = useState(false)
  const [loc, setLoc] = useState<StoreLocation | null | "new">(null)
  const [settings, setSettings] = useState<StockSetting[]>([])
  const [setting, setSetting] = useState<StockSetting | null | "new">(null)
  const canManage = hasPermission(user, P.STORE_MANAGE)
  const locById = new Map(store.locations.map((l) => [l.uniqueId, l]))

  useEffect(() => {
    void fetchStockSettings(store.uniqueId)
      .then(setSettings)
      .catch(() => setSettings([]))
  }, [store.uniqueId])

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {store.name}
            <Badge variant={store.type === "MAIN" ? "default" : "secondary"}>
              {store.type === "MAIN"
                ? t("stores.main", "Main store")
                : t("stores.sub", "Sub-store")}
            </Badge>
            {!store.isActive && <ActiveBadge active={false} />}
          </span>
        }
        description={[store.code, store.address, store.managingDepartment.name]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <>
            {hasPermission(user, P.STOCK_VIEW) && (
              <Button variant="outline" asChild>
                <Link to={`${ROUTES.STOCK}?store=${store.uniqueId}`}>
                  <PackageIcon />
                  {t("nav.stock", "Stock")}
                </Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link to={`${ROUTES.ASSETS}?store=${store.uniqueId}`}>
                <BoxesIcon />
                {t("nav.assets", "Assets")}
              </Link>
            </Button>
            {hasPermission(user, P.STOCK_ADJUST) && (
              <Button variant="outline" asChild>
                <Link to={`${ROUTES.OPENING_BALANCE}?store=${store.uniqueId}`}>
                  <FileSpreadsheetIcon />
                  {t("nav.opening_balance", "Opening balance")}
                </Link>
              </Button>
            )}
            {canManage && (
              <Button onClick={() => setEditing(true)}>
                <PencilIcon />
                {t("actions.edit", "Edit")}
              </Button>
            )}
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("stores.storekeepers", "Storekeepers")}</CardTitle>
          <CardDescription>
            {t(
              "stores.storekeepers_hint",
              "Users with a role assigned for this store (Users → roles, store context). They act only on the stores assigned to them."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          {store.storekeepers.length === 0 ? (
            <span className="text-muted-foreground">
              {t("stores.no_keepers", "No storekeeper assigned")}
            </span>
          ) : (
            <ul className="space-y-1">
              {store.storekeepers.map((k) => (
                <li key={k.uniqueId}>
                  {k.fullName}{" "}
                  <span className="text-muted-foreground">· {k.email}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="locations">
        <TabsList variant="line">
          <TabsTrigger value="locations">
            {t("locations.title", "Locations")}
          </TabsTrigger>
          <TabsTrigger value="levels">
            {t("settings_stock.title", "Stock levels")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="locations">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <CardDescription>
                {t(
                  "locations.hint",
                  "Sections, shelves and bins. Receiving, Rejected and In transit are system locations."
                )}
              </CardDescription>
              {canManage && (
                <Button size="sm" onClick={() => setLoc("new")}>
                  <PlusIcon />
                  {t("locations.new", "New location")}
                </Button>
              )}
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.code", "Code")}</TableHead>
                    <TableHead>{t("locations.path", "Location")}</TableHead>
                    <TableHead>{t("locations.kind", "Kind")}</TableHead>
                    <TableHead>{t("common.status", "Status")}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {store.locations.map((l) => (
                    <TableRow key={l.uniqueId}>
                      <TableCell className="font-mono text-xs">
                        {l.code}
                      </TableCell>
                      <TableCell>{l.path}</TableCell>
                      <TableCell>{label(l.kind)}</TableCell>
                      <TableCell>
                        <ActiveBadge active={l.isActive} />
                      </TableCell>
                      <TableCell className="text-right">
                        {canManage && l.kind === "GENERAL" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t("actions.edit", "Edit")}
                            onClick={() => setLoc(l)}
                          >
                            <PencilIcon />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="levels">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <CardDescription>
                {t(
                  "settings_stock.hint",
                  "Minimum, reorder and maximum per product in this store. Reaching the reorder level alerts the owning department."
                )}
              </CardDescription>
              {canManage && (
                <Button size="sm" onClick={() => setSetting("new")}>
                  <PlusIcon />
                  {t("settings_stock.add", "Set levels")}
                </Button>
              )}
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("products.product", "Product")}</TableHead>
                    <TableHead className="text-right">
                      {t("settings_stock.min", "Minimum")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("settings_stock.reorder", "Reorder level")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("settings_stock.max", "Maximum")}
                    </TableHead>
                    <TableHead>
                      {t("settings_stock.default_location", "Default location")}
                    </TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settings.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground">
                        {t("settings_stock.none", "No levels set yet.")}
                      </TableCell>
                    </TableRow>
                  )}
                  {settings.map((s) => (
                    <TableRow key={s.productUniqueId}>
                      <TableCell>
                        {s.productName}
                        <div className="font-mono text-xs text-muted-foreground">
                          {s.productCode}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {s.minLevel}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {s.reorderLevel}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {s.maxLevel ?? "—"}
                      </TableCell>
                      <TableCell>
                        {s.defaultLocationUniqueId
                          ? locById.get(s.defaultLocationUniqueId)?.path
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t("actions.edit", "Edit")}
                            onClick={() => setSetting(s)}
                          >
                            <PencilIcon />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {editing && (
        <StoreDialog
          store={store}
          hasMain={stores.some((s) => s.type === "MAIN")}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false)
            revalidate()
          }}
        />
      )}
      {loc && (
        <LocationDialog
          store={store}
          location={loc === "new" ? null : loc}
          onClose={() => setLoc(null)}
          onSaved={() => {
            setLoc(null)
            revalidate()
          }}
        />
      )}
      {setting && (
        <SettingDialog
          store={store}
          setting={setting === "new" ? null : setting}
          onClose={() => setSetting(null)}
          onSaved={(rows) => {
            setSetting(null)
            setSettings(rows)
          }}
        />
      )}
    </div>
  )
}

export default StoreDetailsPage
