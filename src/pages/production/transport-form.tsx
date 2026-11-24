import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldLabel } from "@/components/ui/field"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"

export type TripForm = {
  departmentId: string
  pickup: string
  destination: string
  route: string
  departAt: string
  returnAt: string
  passengers: string
  equipmentNote: string
  instructions: string
}

/** Trip request fields (production transport tab and trip page). */
export function TripFields({
  f,
  onChange,
  departments,
}: {
  f: TripForm
  onChange: (f: TripForm) => void
  departments?: { departmentId: number; name: string }[]
}) {
  const { t } = useTranslation()
  const set = (patch: Partial<TripForm>) => onChange({ ...f, ...patch })
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {departments && (
        <Field className="sm:col-span-2">
          <FieldLabel>
            {t("transport.for_department", "For department (optional)")}
          </FieldLabel>
          <NativeSelect
            className="w-full"
            value={f.departmentId}
            onChange={(e) => set({ departmentId: e.target.value })}
          >
            <NativeSelectOption value="">
              {t("transport.whole_production", "Whole production")}
            </NativeSelectOption>
            {departments.map((d) => (
              <NativeSelectOption
                key={d.departmentId}
                value={String(d.departmentId)}
              >
                {d.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      )}
      <Field>
        <FieldLabel>{t("transport.pickup", "Pickup point")}</FieldLabel>
        <Input
          value={f.pickup}
          onChange={(e) => set({ pickup: e.target.value })}
        />
      </Field>
      <Field>
        <FieldLabel>{t("transport.destination", "Destination")}</FieldLabel>
        <Input
          value={f.destination}
          onChange={(e) => set({ destination: e.target.value })}
        />
      </Field>
      <Field>
        <FieldLabel>{t("transport.depart", "Departure")}</FieldLabel>
        <Input
          type="datetime-local"
          value={f.departAt}
          onChange={(e) => set({ departAt: e.target.value })}
        />
      </Field>
      <Field>
        <FieldLabel>{t("transport.return", "Expected return")}</FieldLabel>
        <Input
          type="datetime-local"
          value={f.returnAt}
          onChange={(e) => set({ returnAt: e.target.value })}
        />
      </Field>
      <Field>
        <FieldLabel>{t("transport.passengers", "Passengers")}</FieldLabel>
        <Input
          type="number"
          min={0}
          value={f.passengers}
          onChange={(e) => set({ passengers: e.target.value })}
        />
      </Field>
      <Field>
        <FieldLabel>{t("transport.route", "Route")}</FieldLabel>
        <Input
          value={f.route}
          onChange={(e) => set({ route: e.target.value })}
        />
      </Field>
      <Field className="sm:col-span-2">
        <FieldLabel>
          {t("transport.equipment", "Equipment to carry")}
        </FieldLabel>
        <Input
          value={f.equipmentNote}
          onChange={(e) => set({ equipmentNote: e.target.value })}
        />
      </Field>
      <Field className="sm:col-span-2">
        <FieldLabel>
          {t("transport.instructions", "Special instructions")}
        </FieldLabel>
        <Textarea
          rows={2}
          value={f.instructions}
          onChange={(e) => set({ instructions: e.target.value })}
        />
      </Field>
    </div>
  )
}
