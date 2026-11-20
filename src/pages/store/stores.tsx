import { useEffect, useState } from "react"
import { Link, useLoaderData, useRevalidator } from "react-router"
import { useTranslation } from "react-i18next"
import { MapPinIcon, PlusIcon, UserIcon, WarehouseIcon } from "lucide-react"
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { PageHeader } from "@/components/app/page-header"
import { ActiveBadge } from "@/components/app/status-badge"
import { useRun } from "@/components/app/use-run"
import { useAuth } from "@/context/auth-context"
import { P, hasPermission } from "@/lib/permissions"
import { ROUTES, withId } from "@/routes/routeConstants"
import { fetchDepartments, type Department } from "@/services/org"
import { saveStore, type Store, type StoreType } from "@/services/store"

export function StoreDialog({
  store,
  hasMain,
  onClose,
  onSaved,
}: {
  store: Store | null
  hasMain: boolean
  onClose: () => void
  onSaved: (s: Store) => void
}) {
  const { t } = useTranslation()
  const run = useRun()
  const [code, setCode] = useState(store?.code ?? "")
  const [name, setName] = useState(store?.name ?? "")
  const [type, setType] = useState<StoreType>(
    store?.type ?? (hasMain ? "SUB" : "MAIN")
  )
  const [dept, setDept] = useState(store?.managingDepartment.uniqueId ?? "")
  const [address, setAddress] = useState(store?.address ?? "")
  const [active, setActive] = useState(store?.isActive ?? true)
  const [departments, setDepartments] = useState<Department[]>([])
  const [busy, setBusy] = useState(false)
  useEffect(() => void fetchDepartments().then(setDepartments), [])
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {store
              ? t("stores.edit", "Edit store")
              : t("stores.new", "New store")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "stores.hint",
              "One main store receives every delivery; sub-stores are supplied by transfers. Storekeepers are users given the Storekeeper role for this store."
            )}
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="s-code">
                {t("common.code", "Code")}
              </FieldLabel>
              <Input
                id="s-code"
                value={code}
                disabled={!!store}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="s-name">
                {t("common.name", "Name")}
              </FieldLabel>
              <Input
                id="s-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="s-type">
                {t("stores.type", "Type")}
              </FieldLabel>
              <NativeSelect
                id="s-type"
                className="w-full"
                value={type}
                disabled={!!store}
                onChange={(e) => setType(e.target.value as StoreType)}
              >
                <NativeSelectOption
                  value="MAIN"
                  disabled={hasMain && store?.type !== "MAIN"}
                >
                  {t("stores.main", "Main store")}
                </NativeSelectOption>
                <NativeSelectOption value="SUB">
                  {t("stores.sub", "Sub-store")}
                </NativeSelectOption>
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="s-dept">
                {t("stores.managing_department", "Managing department")}
              </FieldLabel>
              <NativeSelect
                id="s-dept"
                className="w-full"
                value={dept}
                onChange={(e) => setDept(e.target.value)}
              >
                <NativeSelectOption value="">
                  {t("common.choose", "— Choose —")}
                </NativeSelectOption>
                {departments.map((d) => (
                  <NativeSelectOption key={d.uniqueId} value={d.uniqueId}>
                    {d.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="s-addr">
              {t("stores.address", "Address")}
            </FieldLabel>
            <Input
              id="s-addr"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </Field>
          {store && (
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
            disabled={
              busy || code.length < 2 || name.trim().length < 2 || !dept
            }
            onClick={async () => {
              setBusy(true)
              let saved: Store | null = null
              const ok = await run(
                async () => {
                  saved = await saveStore({
                    uniqueId: store?.uniqueId,
                    code,
                    name: name.trim(),
                    type,
                    managingDepartmentUniqueId: dept,
                    address: address.trim() || null,
                    isActive: active,
                  })
                },
                t("common.saved", "Saved")
              )
              setBusy(false)
              if (ok && saved) onSaved(saved)
            }}
          >
            {t("common.save", "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const StoresPage = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { revalidate } = useRevalidator()
  const { stores } = useLoaderData() as { stores: Store[] }
  const [creating, setCreating] = useState(false)
  const canManage = hasPermission(user, P.STORE_MANAGE)
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("stores.title", "Stores")}
        description={t(
          "stores.subtitle",
          "Where AzamTV's equipment, vehicles and consumables are kept."
        )}
        actions={
          canManage && (
            <Button onClick={() => setCreating(true)}>
              <PlusIcon />
              {t("stores.new", "New store")}
            </Button>
          )
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stores.map((s) => (
          <Link
            key={s.uniqueId}
            to={withId(ROUTES.STORE_DETAILS, s.uniqueId)}
            className="group"
          >
            <Card className="h-full transition-colors group-hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  <WarehouseIcon className="size-4" />
                  {s.name}
                  <Badge variant={s.type === "MAIN" ? "default" : "secondary"}>
                    {s.type === "MAIN"
                      ? t("stores.main", "Main store")
                      : t("stores.sub", "Sub-store")}
                  </Badge>
                  {!s.isActive && <ActiveBadge active={false} />}
                </CardTitle>
                <CardDescription className="font-mono">
                  {s.code}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                {s.address && (
                  <div className="flex items-center gap-2">
                    <MapPinIcon className="size-4" />
                    {s.address}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <UserIcon className="size-4" />
                  {s.storekeepers.length
                    ? s.storekeepers.map((k) => k.fullName).join(", ")
                    : t("stores.no_keepers", "No storekeeper assigned")}
                </div>
                <div>
                  {t("stores.summary", "{{n}} assets · {{l}} locations", {
                    n: s.assetCount,
                    l: s.locations.filter((l) => l.kind === "GENERAL").length,
                  })}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      {creating && (
        <StoreDialog
          store={null}
          hasMain={stores.some((s) => s.type === "MAIN")}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false)
            revalidate()
          }}
        />
      )}
    </div>
  )
}

export default StoresPage
