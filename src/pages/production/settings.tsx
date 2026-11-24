import { useState } from "react"
import { useTranslation } from "react-i18next"
import { PencilIcon, PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/app/page-header"
import { ToneBadge } from "@/components/app/tone-badge"
import { useRun } from "@/components/app/use-run"
import {
  fetchConfig,
  saveCategory,
  saveCrewRole,
  saveTemplate,
  saveVenue,
  type Category,
  type CrewRole,
  type Template,
  type Venue,
} from "@/services/production"
import { FormDialog, Loading, Section, SimpleTable } from "./ui"
import { useLoad } from "./utils"
import { AllowanceSettings } from "./allowance-settings"
import { useAuth } from "@/context/auth-context"
import { P, hasPermission } from "@/lib/permissions"

const AUTO_KEYS = [
  "",
  "CREW",
  "EQUIPMENT",
  "TRANSPORT",
  "RUNNING_ORDER",
  "DEPARTMENTS",
  "EQUIPMENT_RETURNED",
  "CONSUMABLES_RETURNED",
  "EQUIPMENT_REPORTS",
  "TRIPS_COMPLETED",
  "ATTENDANCE",
  "INCIDENTS",
]

const active = (on: boolean) => <ToneBadge code={on ? "ACTIVE" : "INACTIVE"} />

/** Production setup data: categories, crew roles, venues, checklists. */
const ProductionSettingsPage = () => {
  const { t } = useTranslation()
  const run = useRun()
  const { user } = useAuth()
  const cfg = useLoad(fetchConfig)
  const [cat, setCat] = useState<Partial<Category> | null>(null)
  const [role, setRole] = useState<
    (Partial<CrewRole> & { skillsText?: string }) | null
  >(null)
  const [venue, setVenue] = useState<Partial<Venue> | null>(null)
  const [tpl, setTpl] = useState<Partial<Template> | null>(null)
  if (!cfg.data) return <Loading error={cfg.error} />
  const d = cfg.data
  const save = (fn: () => Promise<unknown>) =>
    run(
      async () => {
        await fn()
        cfg.reload()
      },
      t("common.saved", "Saved")
    )
  const editBtn = (onClick: () => void) => (
    <Button size="icon" variant="ghost" onClick={onClick}>
      <PencilIcon />
    </Button>
  )
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("prod_settings.title", "Production settings")}
        description={t(
          "prod_settings.subtitle",
          "Setup data for the production modules. Changes apply to new records; existing checklists are kept."
        )}
      />
      <Tabs defaultValue="categories">
        <TabsList variant="line">
          <TabsTrigger value="categories">
            {t("prod_settings.categories", "Categories")}
          </TabsTrigger>
          <TabsTrigger value="roles">
            {t("prod_settings.roles", "Crew roles")}
          </TabsTrigger>
          <TabsTrigger value="venues">
            {t("prod_settings.venues", "Venues")}
          </TabsTrigger>
          <TabsTrigger value="templates">
            {t("prod_settings.templates", "Checklist templates")}
          </TabsTrigger>
          <TabsTrigger value="allowances">
            {t("allowance.title", "Crew allowance rates")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="categories">
          <Section
            title={t("prod_settings.categories", "Categories")}
            actions={
              <Button
                size="sm"
                onClick={() => setCat({ code: "", name: "", isActive: true })}
              >
                <PlusIcon />
                {t("actions.add", "Add")}
              </Button>
            }
          >
            <SimpleTable
              head={[
                "Code",
                t("common.name", "Name"),
                t("common.status", "Status"),
                "",
              ]}
              rows={d.categories.map((c) => [
                c.code,
                c.name,
                active(c.isActive),
                editBtn(() => setCat(c)),
              ])}
            />
          </Section>
        </TabsContent>
        <TabsContent value="roles">
          <Section
            title={t("prod_settings.roles", "Crew roles")}
            actions={
              <Button
                size="sm"
                onClick={() =>
                  setRole({
                    code: "",
                    name: "",
                    departmentId: d.departments[0]?.id,
                    skillsText: "",
                    isActive: true,
                  })
                }
              >
                <PlusIcon />
                {t("actions.add", "Add")}
              </Button>
            }
          >
            <SimpleTable
              head={[
                "Code",
                t("common.name", "Name"),
                t("productions.department", "Department"),
                t("prod_settings.skills", "Skills"),
                t("common.status", "Status"),
                "",
              ]}
              rows={d.crewRoles.map((r) => [
                r.code,
                r.name,
                r.departmentName,
                r.skills.join(", "),
                active(r.isActive),
                editBtn(() =>
                  setRole({ ...r, skillsText: r.skills.join(", ") })
                ),
              ])}
            />
          </Section>
        </TabsContent>
        <TabsContent value="venues">
          <Section
            title={t("prod_settings.venues", "Venues")}
            actions={
              <Button
                size="sm"
                onClick={() =>
                  setVenue({ name: "", location: "", isActive: true })
                }
              >
                <PlusIcon />
                {t("actions.add", "Add")}
              </Button>
            }
          >
            <SimpleTable
              head={[
                t("common.name", "Name"),
                t("productions.venue_location", "Location"),
                t("prod_settings.contact", "Contact"),
                t("common.status", "Status"),
                "",
              ]}
              rows={d.venues.map((v) => [
                v.name,
                v.location,
                [v.contactName, v.contactPhone].filter(Boolean).join(" · "),
                active(v.isActive),
                editBtn(() => setVenue(v)),
              ])}
            />
          </Section>
        </TabsContent>
        <TabsContent value="allowances">
          <AllowanceSettings
            canEdit={hasPermission(user, P.ALLOWANCE_MANAGE)}
          />
        </TabsContent>
        <TabsContent value="templates">
          <Section
            title={t("prod_settings.templates", "Checklist templates")}
            description={t(
              "prod_settings.templates_hint",
              "Automatic keys complete items from other modules; DOCUMENT:<category> checks a document; DEPARTMENTS creates one item per participating department."
            )}
            actions={
              <Button
                size="sm"
                onClick={() =>
                  setTpl({
                    kind: "READINESS",
                    text: "",
                    critical: false,
                    autoKey: null,
                    dueDays: null,
                    sortOrder: 50,
                    isActive: true,
                  })
                }
              >
                <PlusIcon />
                {t("actions.add", "Add")}
              </Button>
            }
          >
            <SimpleTable
              head={[
                t("prod_settings.kind", "Checklist"),
                t("prod_settings.item", "Item"),
                t("productions.category", "Category"),
                t("productions.department", "Department"),
                t("prod_settings.auto", "Automatic"),
                t("prod_settings.due", "Due (days)"),
                t("common.status", "Status"),
                "",
              ]}
              rows={d.templates.map((x) => [
                t(`codes.${x.kind}`, x.kind),
                <span>
                  {x.text} {x.critical && <ToneBadge code="CRITICAL" />}
                </span>,
                x.categoryId
                  ? (d.categories.find((c) => c.id === x.categoryId)?.name ??
                    "")
                  : t("prod_settings.every", "All"),
                x.departmentName ??
                  t("prod_settings.producer_or_each", "Producer / each"),
                x.autoKey ?? "",
                x.dueDays ?? "",
                active(x.isActive),
                editBtn(() => setTpl(x)),
              ])}
            />
          </Section>
        </TabsContent>
      </Tabs>

      {cat && (
        <FormDialog
          title={t("prod_settings.category", "Category")}
          confirmLabel={t("actions.save", "Save")}
          canConfirm={!!cat.code?.trim() && !!cat.name?.trim()}
          onClose={() => setCat(null)}
          onConfirm={() => save(() => saveCategory(cat))}
        >
          <Input
            placeholder="Code"
            value={cat.code ?? ""}
            onChange={(e) => setCat({ ...cat, code: e.target.value })}
          />
          <Input
            placeholder={t("common.name", "Name")}
            value={cat.name ?? ""}
            onChange={(e) => setCat({ ...cat, name: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={cat.isActive ?? true}
              onCheckedChange={(v) => setCat({ ...cat, isActive: v === true })}
            />
            {t("common.active", "Active")}
          </label>
        </FormDialog>
      )}
      {role && (
        <FormDialog
          title={t("prod_settings.role", "Crew role")}
          confirmLabel={t("actions.save", "Save")}
          canConfirm={
            !!role.code?.trim() && !!role.name?.trim() && !!role.departmentId
          }
          onClose={() => setRole(null)}
          onConfirm={() =>
            save(() =>
              saveCrewRole({
                id: role.id,
                code: role.code,
                name: role.name,
                departmentId: role.departmentId,
                isActive: role.isActive,
                skills: (role.skillsText ?? "")
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            )
          }
        >
          <Input
            placeholder="Code"
            value={role.code ?? ""}
            onChange={(e) => setRole({ ...role, code: e.target.value })}
          />
          <Input
            placeholder={t("common.name", "Name")}
            value={role.name ?? ""}
            onChange={(e) => setRole({ ...role, name: e.target.value })}
          />
          <NativeSelect
            className="w-full"
            value={String(role.departmentId ?? "")}
            onChange={(e) =>
              setRole({ ...role, departmentId: Number(e.target.value) })
            }
          >
            {d.departments.map((x) => (
              <NativeSelectOption key={x.id} value={String(x.id)}>
                {x.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Input
            placeholder={t(
              "prod_settings.skills_hint",
              "Expected skills, comma separated"
            )}
            value={role.skillsText ?? ""}
            onChange={(e) => setRole({ ...role, skillsText: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={role.isActive ?? true}
              onCheckedChange={(v) =>
                setRole({ ...role, isActive: v === true })
              }
            />
            {t("common.active", "Active")}
          </label>
        </FormDialog>
      )}
      {venue && (
        <FormDialog
          title={t("prod_settings.venue", "Venue")}
          confirmLabel={t("actions.save", "Save")}
          canConfirm={!!venue.name?.trim() && !!venue.location?.trim()}
          onClose={() => setVenue(null)}
          onConfirm={() => save(() => saveVenue(venue))}
        >
          <Input
            placeholder={t("common.name", "Name")}
            value={venue.name ?? ""}
            onChange={(e) => setVenue({ ...venue, name: e.target.value })}
          />
          <Input
            placeholder={t("productions.venue_location", "Location")}
            value={venue.location ?? ""}
            onChange={(e) => setVenue({ ...venue, location: e.target.value })}
          />
          <Input
            placeholder={t("prod_settings.contact_name", "Contact name")}
            value={venue.contactName ?? ""}
            onChange={(e) =>
              setVenue({ ...venue, contactName: e.target.value })
            }
          />
          <Input
            placeholder={t("prod_settings.contact_phone", "Contact phone")}
            value={venue.contactPhone ?? ""}
            onChange={(e) =>
              setVenue({ ...venue, contactPhone: e.target.value })
            }
          />
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={venue.isActive ?? true}
              onCheckedChange={(v) =>
                setVenue({ ...venue, isActive: v === true })
              }
            />
            {t("common.active", "Active")}
          </label>
        </FormDialog>
      )}
      {tpl && (
        <FormDialog
          wide
          title={t("prod_settings.template", "Checklist item")}
          confirmLabel={t("actions.save", "Save")}
          canConfirm={!!tpl.text?.trim()}
          onClose={() => setTpl(null)}
          onConfirm={() => save(() => saveTemplate(tpl))}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel>{t("prod_settings.kind", "Checklist")}</FieldLabel>
              <NativeSelect
                className="w-full"
                value={tpl.kind}
                onChange={(e) =>
                  setTpl({ ...tpl, kind: e.target.value as Template["kind"] })
                }
              >
                <NativeSelectOption value="READINESS">
                  {t("codes.READINESS", "Readiness")}
                </NativeSelectOption>
                <NativeSelectOption value="CLOSURE">
                  {t("codes.CLOSURE", "Closure")}
                </NativeSelectOption>
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel>{t("productions.category", "Category")}</FieldLabel>
              <NativeSelect
                className="w-full"
                value={String(tpl.categoryId ?? "")}
                onChange={(e) =>
                  setTpl({
                    ...tpl,
                    categoryId: e.target.value ? Number(e.target.value) : null,
                  })
                }
              >
                <NativeSelectOption value="">
                  {t("prod_settings.every", "All")}
                </NativeSelectOption>
                {d.categories.map((c) => (
                  <NativeSelectOption key={c.id} value={String(c.id)}>
                    {c.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel>{t("prod_settings.item", "Item")}</FieldLabel>
              <Input
                value={tpl.text ?? ""}
                onChange={(e) => setTpl({ ...tpl, text: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel>
                {t("productions.department", "Department")}
              </FieldLabel>
              <NativeSelect
                className="w-full"
                value={String(tpl.departmentId ?? "")}
                onChange={(e) =>
                  setTpl({
                    ...tpl,
                    departmentId: e.target.value
                      ? Number(e.target.value)
                      : null,
                  })
                }
              >
                <NativeSelectOption value="">
                  {t("prod_settings.producer_or_each", "Producer / each")}
                </NativeSelectOption>
                {d.departments.map((x) => (
                  <NativeSelectOption key={x.id} value={String(x.id)}>
                    {x.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel>{t("prod_settings.auto", "Automatic")}</FieldLabel>
              <NativeSelect
                className="w-full"
                value={
                  tpl.autoKey?.startsWith("DOCUMENT:")
                    ? "DOC"
                    : (tpl.autoKey ?? "")
                }
                onChange={(e) =>
                  setTpl({
                    ...tpl,
                    autoKey:
                      e.target.value === "DOC"
                        ? `DOCUMENT:${d.documentCategories[0]}`
                        : e.target.value || null,
                  })
                }
              >
                {AUTO_KEYS.map((k) => (
                  <NativeSelectOption key={k} value={k}>
                    {k || t("prod_settings.manual", "Manual")}
                  </NativeSelectOption>
                ))}
                <NativeSelectOption value="DOC">DOCUMENT:…</NativeSelectOption>
              </NativeSelect>
            </Field>
            {tpl.autoKey?.startsWith("DOCUMENT:") && (
              <Field>
                <FieldLabel>
                  {t("docs.category", "Document category")}
                </FieldLabel>
                <NativeSelect
                  className="w-full"
                  value={tpl.autoKey.slice(9)}
                  onChange={(e) =>
                    setTpl({ ...tpl, autoKey: `DOCUMENT:${e.target.value}` })
                  }
                >
                  {d.documentCategories.map((c) => (
                    <NativeSelectOption key={c} value={c}>
                      {c}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            )}
            <Field>
              <FieldLabel>
                {t(
                  "prod_settings.due",
                  "Due (days before start / after completion)"
                )}
              </FieldLabel>
              <Input
                type="number"
                min={0}
                value={tpl.dueDays ?? ""}
                onChange={(e) =>
                  setTpl({
                    ...tpl,
                    dueDays:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field>
              <FieldLabel>{t("prod_settings.order", "Order")}</FieldLabel>
              <Input
                type="number"
                value={tpl.sortOrder ?? 0}
                onChange={(e) =>
                  setTpl({ ...tpl, sortOrder: Number(e.target.value) })
                }
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={!!tpl.critical}
              onCheckedChange={(v) => setTpl({ ...tpl, critical: v === true })}
            />
            {t("checklist.critical", "Critical")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={tpl.isActive ?? true}
              onCheckedChange={(v) => setTpl({ ...tpl, isActive: v === true })}
            />
            {t("common.active", "Active")}
          </label>
        </FormDialog>
      )}
    </div>
  )
}

export default ProductionSettingsPage
