import { useState } from "react"
import { useTranslation } from "react-i18next"
import { PencilIcon, PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { ToneBadge } from "@/components/app/tone-badge"
import { useRun } from "@/components/app/use-run"
import {
  fetchBudgetSettings,
  saveAllowanceRate,
  saveBudgetItem,
  type AllowanceRate,
  type BudgetItem,
} from "@/services/production"
import { FormDialog, Loading, Section, SimpleTable } from "./ui"
import { money, useLoad } from "./utils"

/** Crew allowance rates and the expense lines offered on a cost estimate. */
export function AllowanceSettings({ canEdit }: { canEdit: boolean }) {
  const { t } = useTranslation()
  const run = useRun()
  const s = useLoad(fetchBudgetSettings)
  const [rate, setRate] = useState<Partial<AllowanceRate> | null>(null)
  const [item, setItem] = useState<Partial<BudgetItem> | null>(null)
  if (!s.data) return <Loading error={s.error} />
  return (
    <div className="space-y-6">
      <Section
        title={t("allowance.title", "Crew allowance rates")}
        description={t(
          "allowance.hint",
          "Per person per day. Picked on each production's cost estimate (one rate for the crew, changeable per person with a reason)."
        )}
        actions={
          canEdit && (
            <Button
              size="sm"
              onClick={() =>
                setRate({
                  code: "",
                  name: "",
                  amount: 0,
                  currency: "TZS",
                  isActive: true,
                  sortOrder: 10,
                })
              }
            >
              <PlusIcon />
              {t("actions.add", "Add")}
            </Button>
          )
        }
      >
        <SimpleTable
          head={[
            "Code",
            t("common.name", "Name"),
            t("allowance.per_day", "Per day"),
            t("allowance.description", "When it applies"),
            t("common.status", "Status"),
            "",
          ]}
          rows={s.data.rates.map((r) => [
            r.code,
            r.name,
            money(r.amount, r.currency),
            r.description ?? "",
            <ToneBadge code={r.isActive ? "ACTIVE" : "INACTIVE"} />,
            canEdit && (
              <Button size="icon" variant="ghost" onClick={() => setRate(r)}>
                <PencilIcon />
              </Button>
            ),
          ])}
        />
      </Section>
      <Section
        title={t("allowance.items", "Cost estimate expense lines")}
        description={t(
          "allowance.items_hint",
          "Lines a new cost estimate starts with. Fuel lines carry kilometres and litres."
        )}
        actions={
          canEdit && (
            <Button
              size="sm"
              onClick={() =>
                setItem({
                  name: "",
                  kind: "CASH",
                  isActive: true,
                  sortOrder: 50,
                })
              }
            >
              <PlusIcon />
              {t("actions.add", "Add")}
            </Button>
          )
        }
      >
        <SimpleTable
          head={[
            t("common.name", "Name"),
            t("allowance.kind", "Kind"),
            t("prod_settings.order", "Order"),
            t("common.status", "Status"),
            "",
          ]}
          rows={s.data.items.map((i) => [
            i.name,
            i.kind === "FUEL"
              ? t("allowance.fuel", "Fuel (km / litres)")
              : t("allowance.cash", "Cash"),
            i.sortOrder,
            <ToneBadge code={i.isActive ? "ACTIVE" : "INACTIVE"} />,
            canEdit && (
              <Button size="icon" variant="ghost" onClick={() => setItem(i)}>
                <PencilIcon />
              </Button>
            ),
          ])}
        />
      </Section>
      {rate && (
        <FormDialog
          title={t("allowance.rate", "Allowance rate")}
          confirmLabel={t("actions.save", "Save")}
          canConfirm={
            !!rate.code?.trim() &&
            !!rate.name?.trim() &&
            (rate.amount ?? -1) >= 0
          }
          onClose={() => setRate(null)}
          onConfirm={() =>
            run(
              async () => s.set(await saveAllowanceRate(rate)),
              t("common.saved", "Saved")
            )
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="Code (e.g. IN_TZ)"
              value={rate.code ?? ""}
              onChange={(e) => setRate({ ...rate, code: e.target.value })}
            />
            <Input
              placeholder={t("common.name", "Name")}
              value={rate.name ?? ""}
              onChange={(e) => setRate({ ...rate, name: e.target.value })}
            />
            <Field>
              <FieldLabel>{t("allowance.per_day", "Per day")}</FieldLabel>
              <Input
                type="number"
                min={0}
                value={rate.amount ?? 0}
                onChange={(e) =>
                  setRate({ ...rate, amount: Number(e.target.value) })
                }
              />
            </Field>
            <Field>
              <FieldLabel>{t("budget.currency", "Currency")}</FieldLabel>
              <NativeSelect
                className="w-full"
                value={rate.currency}
                onChange={(e) =>
                  setRate({
                    ...rate,
                    currency: e.target.value as "TZS" | "USD",
                  })
                }
              >
                <NativeSelectOption value="TZS">TZS</NativeSelectOption>
                <NativeSelectOption value="USD">USD</NativeSelectOption>
              </NativeSelect>
            </Field>
            <Input
              className="sm:col-span-2"
              placeholder={t("allowance.description", "When it applies")}
              value={rate.description ?? ""}
              onChange={(e) =>
                setRate({ ...rate, description: e.target.value })
              }
            />
            <Input
              type="number"
              placeholder={t("prod_settings.order", "Order")}
              value={rate.sortOrder ?? 0}
              onChange={(e) =>
                setRate({ ...rate, sortOrder: Number(e.target.value) })
              }
            />
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={rate.isActive ?? true}
                onCheckedChange={(v) =>
                  setRate({ ...rate, isActive: v === true })
                }
              />
              {t("common.active", "Active")}
            </label>
          </div>
        </FormDialog>
      )}
      {item && (
        <FormDialog
          title={t("allowance.item", "Expense line")}
          confirmLabel={t("actions.save", "Save")}
          canConfirm={!!item.name?.trim()}
          onClose={() => setItem(null)}
          onConfirm={() =>
            run(
              async () => s.set(await saveBudgetItem(item)),
              t("common.saved", "Saved")
            )
          }
        >
          <Input
            placeholder={t("common.name", "Name")}
            value={item.name ?? ""}
            onChange={(e) => setItem({ ...item, name: e.target.value })}
          />
          <NativeSelect
            className="w-full"
            value={item.kind}
            onChange={(e) =>
              setItem({ ...item, kind: e.target.value as "CASH" | "FUEL" })
            }
          >
            <NativeSelectOption value="CASH">
              {t("allowance.cash", "Cash")}
            </NativeSelectOption>
            <NativeSelectOption value="FUEL">
              {t("allowance.fuel", "Fuel (km / litres)")}
            </NativeSelectOption>
          </NativeSelect>
          <Input
            type="number"
            placeholder={t("prod_settings.order", "Order")}
            value={item.sortOrder ?? 0}
            onChange={(e) =>
              setItem({ ...item, sortOrder: Number(e.target.value) })
            }
          />
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={item.isActive ?? true}
              onCheckedChange={(v) =>
                setItem({ ...item, isActive: v === true })
              }
            />
            {t("common.active", "Active")}
          </label>
        </FormDialog>
      )}
    </div>
  )
}
