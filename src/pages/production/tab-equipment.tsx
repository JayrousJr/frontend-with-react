import { useState } from "react"
import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import { PackagePlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { ToneBadge } from "@/components/app/tone-badge"
import { useRun } from "@/components/app/use-run"
import { useAuth } from "@/context/auth-context"
import { formatStamp } from "@/lib/format"
import { P, hasPermission } from "@/lib/permissions"
import { ROUTES, withId } from "@/routes/routeConstants"
import {
  createBooking,
  fetchAvailability,
  fetchBookings,
  fetchConfig,
  type Production,
} from "@/services/production"
import { FormDialog, Loading, Section, SimpleTable } from "./ui"
import { useLoad } from "./utils"

function BookDialog({
  p,
  onClose,
  onDone,
}: {
  p: Production
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation()
  const run = useRun()
  const cfg = useLoad(fetchConfig)
  const [storeId, setStoreId] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [search, setSearch] = useState("")
  const [departmentId, setDepartmentId] = useState(
    String(p.departments[0]?.departmentId ?? "")
  )
  const [use, setUse] = useState("")
  const [assets, setAssets] = useState<number[]>([])
  const [qty, setQty] = useState<Record<number, string>>({})
  const avail = useLoad(
    () =>
      fetchAvailability(p.uniqueId, {
        storeId: storeId ? Number(storeId) : undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
        search: search || undefined,
      }),
    [storeId, categoryId, search]
  )
  const chosenQty = Object.entries(qty).filter(([, v]) => Number(v) > 0)
  return (
    <FormDialog
      wide
      title={t("bookings.book", "Book equipment from the Store")}
      description={t(
        "bookings.book_hint",
        "Pick one store per booking. The storekeeper of that store confirms; the items are then reserved for the production period."
      )}
      confirmLabel={t("bookings.send", "Send booking")}
      canConfirm={
        !!storeId &&
        !!departmentId &&
        (assets.length > 0 || chosenQty.length > 0)
      }
      onClose={onClose}
      onConfirm={async () => {
        const ok = await run(
          () =>
            createBooking({
              productionUniqueId: p.uniqueId,
              departmentId: Number(departmentId),
              storeId: Number(storeId),
              intendedUse: use || null,
              lines: [
                ...assets.map((assetId) => ({ assetId })),
                ...chosenQty.map(([productId, v]) => ({
                  productId: Number(productId),
                  quantity: Number(v),
                })),
              ],
            }),
          t("bookings.sent", "Booking sent to the storekeeper")
        )
        if (ok) onDone()
        return ok
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel>{t("productions.department", "Department")}</FieldLabel>
          <NativeSelect
            className="w-full"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
          >
            {p.departments.map((d) => (
              <NativeSelectOption
                key={d.departmentId}
                value={String(d.departmentId)}
              >
                {d.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel>{t("bookings.store", "Store")}</FieldLabel>
          <NativeSelect
            className="w-full"
            value={storeId}
            onChange={(e) => {
              setStoreId(e.target.value)
              setAssets([])
              setQty({})
            }}
          >
            <NativeSelectOption value="">
              {t("bookings.all_stores", "All stores (pick one to book)")}
            </NativeSelectOption>
            {cfg.data?.stores.map((s) => (
              <NativeSelectOption key={s.id} value={String(s.id)}>
                {s.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel>{t("productions.category", "Category")}</FieldLabel>
          <NativeSelect
            className="w-full"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <NativeSelectOption value="">
              {t("productions.all_categories", "All categories")}
            </NativeSelectOption>
            {cfg.data?.productCategories.map((c) => (
              <NativeSelectOption key={c.id} value={String(c.id)}>
                {c.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel>{t("common.search", "Search")}</FieldLabel>
          <Input
            value={search}
            placeholder={t("bookings.search", "Tag or name")}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel>{t("bookings.intended_use", "Intended use")}</FieldLabel>
          <Input value={use} onChange={(e) => setUse(e.target.value)} />
        </Field>
      </div>
      {!avail.data && <Loading error={avail.error} />}
      {avail.data && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {t("bookings.period", "Period")}:{" "}
            {formatStamp(avail.data.window.from)} –{" "}
            {formatStamp(avail.data.window.to)}
            {avail.data.unavailableCount > 0 &&
              ` · ${avail.data.unavailableCount} ${t("bookings.not_available", "matching unit(s) under maintenance, in custody, in transit or checked out")}`}
          </p>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {avail.data.assets.map((a) => {
              const wrongStore = !!storeId && String(a.storeId) !== storeId
              return (
                <label
                  key={a.assetId}
                  className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${!a.available || wrongStore ? "opacity-60" : ""}`}
                >
                  <Checkbox
                    disabled={!a.available || !storeId || wrongStore}
                    checked={assets.includes(a.assetId)}
                    onCheckedChange={(c) =>
                      setAssets(
                        c === true
                          ? [...assets, a.assetId]
                          : assets.filter((x) => x !== a.assetId)
                      )
                    }
                  />
                  <span className="min-w-0 flex-1">
                    <span className="font-mono">{a.tag}</span> {a.name}
                    <span className="block text-xs text-muted-foreground">
                      {a.category} · {a.store} {a.location && `· ${a.location}`}{" "}
                      · {t(`codes.${a.condition}`, a.condition)}
                      {a.isKit &&
                        ` · ${t("bookings.kit", "kit")}: ${a.components.join(", ")}`}
                    </span>
                    {a.conflicts.map((c, i) => (
                      <span
                        key={i}
                        className="block text-xs text-amber-700 dark:text-amber-400"
                      >
                        {c}
                      </span>
                    ))}
                  </span>
                  <ToneBadge code={a.available ? a.status : "BLOCKED"} />
                </label>
              )
            })}
            {avail.data.quantities.map((q) => {
              const wrongStore = !!storeId && String(q.storeId) !== storeId
              return (
                <div
                  key={`${q.storeId}-${q.productId}`}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${wrongStore ? "opacity-60" : ""}`}
                >
                  <span className="min-w-0 flex-1">
                    {q.name}
                    <span className="block text-xs text-muted-foreground">
                      {q.category} · {q.store} · {q.available}{" "}
                      {t("bookings.available", "available")}
                      {q.consumable &&
                        ` · ${t("bookings.consumable", "consumable (issued, unused returned)")}`}
                    </span>
                  </span>
                  <Input
                    className="w-24"
                    type="number"
                    min={0}
                    max={q.available}
                    disabled={!storeId || wrongStore}
                    value={qty[q.productId] ?? ""}
                    onChange={(e) =>
                      setQty({ ...qty, [q.productId]: e.target.value })
                    }
                  />
                </div>
              )
            })}
            {!avail.data.assets.length && !avail.data.quantities.length && (
              <p className="text-sm text-muted-foreground">
                {t("bookings.nothing", "Nothing available with these filters.")}
              </p>
            )}
          </div>
        </div>
      )}
    </FormDialog>
  )
}

export function EquipmentTab({ p }: { p: Production }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const rows = useLoad(
    () => fetchBookings({ production: p.uniqueId }),
    [p.uniqueId]
  )
  const [book, setBook] = useState(false)
  const canBook =
    hasPermission(user, P.BOOKING_CREATE) &&
    [
      "SCHEDULED",
      "PREPARING",
      "READY",
      "IN_PROGRESS",
      "ON_HOLD",
      "DELAYED",
    ].includes(p.status)
  return (
    <div className="space-y-6">
      <Section
        title={t("bookings.title", "Equipment bookings")}
        description={t(
          "bookings.tab_hint",
          "Booked from any store, returned to any store. Missing or damaged items at return create an asset report."
        )}
        actions={
          canBook && (
            <Button size="sm" onClick={() => setBook(true)}>
              <PackagePlusIcon />
              {t("bookings.book_short", "Book equipment")}
            </Button>
          )
        }
      >
        {!rows.data ? (
          <Loading error={rows.error} />
        ) : (
          <SimpleTable
            head={[
              t("bookings.number", "Booking"),
              t("bookings.store", "Store"),
              t("productions.department", "Department"),
              t("bookings.items", "Items"),
              t("bookings.requested_by", "Requested by"),
              t("common.status", "Status"),
            ]}
            rows={rows.data.map((b) => [
              <Link
                className="font-mono underline"
                to={withId(ROUTES.EQUIPMENT_BOOKING_DETAILS, b.uniqueId)}
              >
                {b.number}
              </Link>,
              b.store,
              b.department,
              b.items,
              b.requestedBy,
              <ToneBadge code={b.status} />,
            ])}
            empty={t("bookings.none", "No bookings yet.")}
          />
        )}
      </Section>
      <Section title={t("productions.equipment", "Preliminary equipment")}>
        <SimpleTable
          head={[
            t("productions.category", "Category"),
            t("productions.quantity", "Qty"),
            t("common.note", "Note"),
          ]}
          rows={p.equipment.map((e) => [e.category, e.quantity, e.note ?? ""])}
        />
      </Section>
      {book && (
        <BookDialog p={p} onClose={() => setBook(false)} onDone={rows.reload} />
      )}
    </div>
  )
}
