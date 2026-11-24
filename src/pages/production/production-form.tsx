import { useState } from "react"
import { useNavigate, useParams } from "react-router"
import { useTranslation } from "react-i18next"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldLabel } from "@/components/ui/field"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { PageHeader } from "@/components/app/page-header"
import { useRun } from "@/components/app/use-run"
import { ROUTES, withId } from "@/routes/routeConstants"
import {
  createProduction,
  fetchConfig,
  fetchProduction,
  submitProduction,
  updateProduction,
  type Production,
  type ProductionConfig,
  type ProductionInput,
} from "@/services/production"
import { Loading, Section } from "./ui"
import { fromLocal, toLocal, useLoad } from "./utils"

type VenueRow = { venueId: string; name: string; location: string }
type CrewRow = {
  departmentId: string
  crewRoleId: string
  quantity: string
  note: string
}
type EquipRow = { categoryId: string; quantity: string; note: string }
type Form = {
  title: string
  categoryId: string
  description: string
  objectives: string
  startAt: string
  endAt: string
  venues: VenueRow[]
  departmentIds: number[]
  crew: CrewRow[]
  equipment: EquipRow[]
}

const empty: Form = {
  title: "",
  categoryId: "",
  description: "",
  objectives: "",
  startAt: "",
  endAt: "",
  venues: [{ venueId: "", name: "", location: "" }],
  departmentIds: [],
  crew: [],
  equipment: [],
}

const fromProduction = (p: Production): Form => ({
  title: p.title,
  categoryId: String(p.categoryId),
  description: p.description ?? "",
  objectives: p.objectives ?? "",
  startAt: toLocal(p.startAt),
  endAt: toLocal(p.endAt),
  venues: p.venues.length
    ? p.venues.map((v) => ({
        venueId: v.venueId ? String(v.venueId) : "",
        name: v.venueId ? "" : v.name,
        location: v.venueId ? "" : (v.location ?? ""),
      }))
    : [{ venueId: "", name: "", location: "" }],
  departmentIds: p.departments.map((d) => d.departmentId),
  crew: p.crew.map((c) => ({
    departmentId: String(c.departmentId),
    crewRoleId: String(c.crewRoleId),
    quantity: String(c.quantity),
    note: c.note ?? "",
  })),
  equipment: p.equipment.map((e) => ({
    categoryId: String(e.categoryId),
    quantity: String(e.quantity),
    note: e.note ?? "",
  })),
})

function toInput(f: Form): ProductionInput {
  return {
    title: f.title.trim(),
    categoryId: Number(f.categoryId),
    description: f.description || null,
    objectives: f.objectives || null,
    startAt: fromLocal(f.startAt) ?? "",
    endAt: fromLocal(f.endAt) ?? "",
    venues: f.venues
      .filter((v) => v.venueId || v.name.trim())
      .map((v) =>
        v.venueId
          ? { venueId: Number(v.venueId) }
          : { name: v.name.trim(), location: v.location.trim() || null }
      ),
    departmentIds: f.departmentIds,
    crew: f.crew
      .filter((c) => c.crewRoleId && Number(c.quantity) > 0)
      .map((c) => ({
        departmentId: Number(c.departmentId),
        crewRoleId: Number(c.crewRoleId),
        quantity: Number(c.quantity),
        note: c.note || null,
      })),
    equipment: f.equipment
      .filter((e) => e.categoryId && Number(e.quantity) > 0)
      .map((e) => ({
        categoryId: Number(e.categoryId),
        quantity: Number(e.quantity),
        note: e.note || null,
      })),
  }
}

function FormBody({
  cfg,
  initial,
  editId,
}: {
  cfg: ProductionConfig
  initial: Form
  editId?: string
}) {
  const { t } = useTranslation()
  const run = useRun()
  const navigate = useNavigate()
  const [f, setF] = useState<Form>(initial)
  const set = (patch: Partial<Form>) => setF({ ...f, ...patch })
  const valid =
    f.title.trim() &&
    f.categoryId &&
    f.startAt &&
    f.endAt &&
    f.departmentIds.length > 0
  const deptsInCrew = (id: string) =>
    cfg.crewRoles.filter((r) => String(r.departmentId) === id && r.isActive)

  const save = async (submit: boolean) => {
    let id = editId
    const ok = await run(
      async () => {
        const p = editId
          ? await updateProduction(editId, toInput(f))
          : await createProduction(toInput(f))
        id = p.uniqueId
        if (submit) await submitProduction(p.uniqueId)
      },
      submit
        ? t(
            "productions.submitted",
            "Request submitted to the Production Manager"
          )
        : t("common.saved", "Saved")
    )
    if (ok && id) navigate(withId(ROUTES.PRODUCTION_DETAILS, id))
  }

  return (
    <div className="space-y-6">
      <Section title={t("productions.basics", "Production")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field className="sm:col-span-2">
            <FieldLabel>{t("productions.title_field", "Title")}</FieldLabel>
            <Input
              value={f.title}
              placeholder="e.g. Kariakoo Derby"
              onChange={(e) => set({ title: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel>{t("productions.category", "Category")}</FieldLabel>
            <NativeSelect
              className="w-full"
              value={f.categoryId}
              onChange={(e) => set({ categoryId: e.target.value })}
            >
              <NativeSelectOption value="">—</NativeSelectOption>
              {cfg.categories
                .filter((c) => c.isActive)
                .map((c) => (
                  <NativeSelectOption key={c.id} value={String(c.id)}>
                    {c.name}
                  </NativeSelectOption>
                ))}
            </NativeSelect>
          </Field>
          <div />
          <Field>
            <FieldLabel>{t("productions.start", "Start")}</FieldLabel>
            <Input
              type="datetime-local"
              value={f.startAt}
              onChange={(e) => set({ startAt: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel>{t("productions.end", "End")}</FieldLabel>
            <Input
              type="datetime-local"
              value={f.endAt}
              onChange={(e) => set({ endAt: e.target.value })}
            />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel>
              {t("productions.description", "Description")}
            </FieldLabel>
            <Textarea
              rows={3}
              value={f.description}
              onChange={(e) => set({ description: e.target.value })}
            />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel>{t("productions.objectives", "Objectives")}</FieldLabel>
            <Textarea
              rows={2}
              value={f.objectives}
              onChange={(e) => set({ objectives: e.target.value })}
            />
          </Field>
        </div>
      </Section>

      <Section
        title={t("productions.venues", "Location and venues")}
        description={t(
          "productions.venues_hint",
          "Pick from the venue list, or type a one-off venue."
        )}
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              set({
                venues: [...f.venues, { venueId: "", name: "", location: "" }],
              })
            }
          >
            <PlusIcon />
            {t("productions.add_venue", "Add venue")}
          </Button>
        }
      >
        <div className="space-y-2">
          {f.venues.map((v, i) => {
            const upd = (patch: Partial<VenueRow>) =>
              set({
                venues: f.venues.map((x, j) =>
                  j === i ? { ...x, ...patch } : x
                ),
              })
            return (
              <div
                key={i}
                className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]"
              >
                <NativeSelect
                  className="w-full"
                  value={v.venueId}
                  onChange={(e) => upd({ venueId: e.target.value })}
                >
                  <NativeSelectOption value="">
                    {t("productions.other_venue", "Other (type below)")}
                  </NativeSelectOption>
                  {cfg.venues
                    .filter((x) => x.isActive)
                    .map((x) => (
                      <NativeSelectOption key={x.id} value={String(x.id)}>
                        {x.name} — {x.location}
                      </NativeSelectOption>
                    ))}
                </NativeSelect>
                <Input
                  disabled={!!v.venueId}
                  placeholder={t("productions.venue_name", "Venue name")}
                  value={v.name}
                  onChange={(e) => upd({ name: e.target.value })}
                />
                <Input
                  disabled={!!v.venueId}
                  placeholder={t("productions.venue_location", "Location")}
                  value={v.location}
                  onChange={(e) => upd({ location: e.target.value })}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    set({ venues: f.venues.filter((_, j) => j !== i) })
                  }
                >
                  <Trash2Icon />
                </Button>
              </div>
            )
          })}
        </div>
      </Section>

      <Section
        title={t("productions.departments", "Participating departments")}
      >
        <div className="grid gap-2 sm:grid-cols-3">
          {cfg.departments.map((d) => (
            <label key={d.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={f.departmentIds.includes(d.id)}
                onCheckedChange={(c) =>
                  set({
                    departmentIds:
                      c === true
                        ? [...f.departmentIds, d.id]
                        : f.departmentIds.filter((x) => x !== d.id),
                  })
                }
              />
              {d.name}
            </label>
          ))}
        </div>
      </Section>

      <Section
        title={t("productions.crew", "Crew numbers and roles")}
        description={t(
          "productions.crew_hint",
          "HODs assign the actual people after scheduling."
        )}
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              set({
                crew: [
                  ...f.crew,
                  {
                    departmentId: String(f.departmentIds[0] ?? ""),
                    crewRoleId: "",
                    quantity: "1",
                    note: "",
                  },
                ],
              })
            }
          >
            <PlusIcon />
            {t("productions.add_crew", "Add role")}
          </Button>
        }
      >
        <div className="space-y-2">
          {f.crew.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t("productions.no_crew", "No crew roles yet.")}
            </p>
          )}
          {f.crew.map((c, i) => {
            const upd = (patch: Partial<CrewRow>) =>
              set({
                crew: f.crew.map((x, j) => (j === i ? { ...x, ...patch } : x)),
              })
            return (
              <div
                key={i}
                className="grid gap-2 sm:grid-cols-[1fr_1fr_6rem_1fr_auto]"
              >
                <NativeSelect
                  className="w-full"
                  value={c.departmentId}
                  onChange={(e) =>
                    upd({ departmentId: e.target.value, crewRoleId: "" })
                  }
                >
                  <NativeSelectOption value="">
                    {t("productions.department", "Department")}
                  </NativeSelectOption>
                  {cfg.departments
                    .filter((d) => f.departmentIds.includes(d.id))
                    .map((d) => (
                      <NativeSelectOption key={d.id} value={String(d.id)}>
                        {d.name}
                      </NativeSelectOption>
                    ))}
                </NativeSelect>
                <NativeSelect
                  className="w-full"
                  value={c.crewRoleId}
                  onChange={(e) => upd({ crewRoleId: e.target.value })}
                >
                  <NativeSelectOption value="">
                    {t("productions.role", "Role")}
                  </NativeSelectOption>
                  {deptsInCrew(c.departmentId).map((r) => (
                    <NativeSelectOption key={r.id} value={String(r.id)}>
                      {r.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <Input
                  type="number"
                  min={1}
                  value={c.quantity}
                  onChange={(e) => upd({ quantity: e.target.value })}
                />
                <Input
                  placeholder={t("common.note", "Note")}
                  value={c.note}
                  onChange={(e) => upd({ note: e.target.value })}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    set({ crew: f.crew.filter((_, j) => j !== i) })
                  }
                >
                  <Trash2Icon />
                </Button>
              </div>
            )
          })}
        </div>
      </Section>

      <Section
        title={t("productions.equipment", "Preliminary equipment")}
        description={t(
          "productions.equipment_hint",
          "By product category (e.g. camera kits × 3). Actual units are booked from the Store after scheduling."
        )}
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              set({
                equipment: [
                  ...f.equipment,
                  { categoryId: "", quantity: "1", note: "" },
                ],
              })
            }
          >
            <PlusIcon />
            {t("productions.add_equipment", "Add equipment")}
          </Button>
        }
      >
        <div className="space-y-2">
          {f.equipment.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t("productions.no_equipment", "No equipment yet.")}
            </p>
          )}
          {f.equipment.map((e, i) => {
            const upd = (patch: Partial<EquipRow>) =>
              set({
                equipment: f.equipment.map((x, j) =>
                  j === i ? { ...x, ...patch } : x
                ),
              })
            return (
              <div
                key={i}
                className="grid gap-2 sm:grid-cols-[1fr_6rem_1fr_auto]"
              >
                <NativeSelect
                  className="w-full"
                  value={e.categoryId}
                  onChange={(ev) => upd({ categoryId: ev.target.value })}
                >
                  <NativeSelectOption value="">
                    {t("productions.category", "Category")}
                  </NativeSelectOption>
                  {cfg.productCategories.map((c) => (
                    <NativeSelectOption key={c.id} value={String(c.id)}>
                      {c.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <Input
                  type="number"
                  min={1}
                  value={e.quantity}
                  onChange={(ev) => upd({ quantity: ev.target.value })}
                />
                <Input
                  placeholder={t("common.note", "Note")}
                  value={e.note}
                  onChange={(ev) => upd({ note: ev.target.value })}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    set({ equipment: f.equipment.filter((_, j) => j !== i) })
                  }
                >
                  <Trash2Icon />
                </Button>
              </div>
            )
          })}
        </div>
      </Section>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => navigate(-1)}>
          {t("actions.cancel", "Cancel")}
        </Button>
        <Button variant="outline" disabled={!valid} onClick={() => save(false)}>
          {t("productions.save_draft", "Save draft")}
        </Button>
        <Button disabled={!valid} onClick={() => save(true)}>
          {t("productions.save_submit", "Save and submit")}
        </Button>
      </div>
    </div>
  )
}

const ProductionFormPage = () => {
  const { t } = useTranslation()
  const { uniqueId } = useParams()
  const cfg = useLoad(fetchConfig)
  const existing = useLoad(
    () => (uniqueId ? fetchProduction(uniqueId) : Promise.resolve(null)),
    [uniqueId]
  )
  if (!cfg.data || (uniqueId && !existing.data))
    return <Loading error={cfg.error ?? existing.error} />
  return (
    <div className="space-y-6">
      <PageHeader
        title={
          uniqueId
            ? t("productions.edit", "Edit {{number}}", {
                number: existing.data?.number,
              })
            : t("productions.new", "New production request")
        }
        description={t(
          "productions.form_hint",
          "Save as draft, then submit to the Production Manager. No budget is captured."
        )}
      />
      <FormBody
        cfg={cfg.data}
        initial={existing.data ? fromProduction(existing.data) : empty}
        editId={uniqueId}
      />
    </div>
  )
}

export default ProductionFormPage
