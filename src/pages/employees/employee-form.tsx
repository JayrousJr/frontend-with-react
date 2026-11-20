import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { TFunction } from "i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field"
import { AsyncPicker, type PickerOption } from "@/components/app/async-picker"
import { employeeOption, searchEmployeeOptions } from "@/components/app/pickers"
import { useRun } from "@/components/app/use-run"
import { toDateInput } from "@/lib/format"
import {
  createEmployee,
  updateEmployee,
  type Employee,
} from "@/services/employees"
import {
  fetchDepartments,
  fetchLookups,
  type Department,
  type EmploymentType,
  type JobTitle,
} from "@/services/org"

const list = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)

function schemaFor(t: TFunction, isNew: boolean) {
  const required = t("validation.required")
  return z.object({
    employeeNumber: isNew
      ? z
          .string()
          .trim()
          .min(1, required)
          .regex(
            /^[A-Za-z0-9/_-]+$/,
            t("employees.number_format", "Letters, numbers, / _ - only")
          )
      : z.string(),
    firstName: z.string().trim().min(1, required),
    middleName: z.string().trim(),
    lastName: z.string().trim().min(1, required),
    gender: z.enum(["MALE", "FEMALE"]),
    companyEmail: z.email(t("validation.email")),
    phone: z
      .string()
      .trim()
      .regex(
        /^\+?[0-9 ]{9,16}$/,
        t("employees.phone_format", "Use a phone number like +255 700 000 000")
      ),
    departmentUniqueId: z.string().min(1, required),
    jobTitleUniqueId: z.string().min(1, required),
    employmentTypeUniqueId: z.string().min(1, required),
    startDate: z.string().min(1, required),
    contractEndDate: z.string(),
    workLocation: z.string().trim(),
    skills: z.string(),
    qualifications: z.string(),
    professionalRoles: z.string(),
    effectiveDate: z.string(),
    reason: z.string().trim(),
  })
}

type Values = z.infer<ReturnType<typeof schemaFor>>

/** Create (employee null) or edit an employee record. */
export function EmployeeFormSheet({
  employee,
  onClose,
  onSaved,
}: {
  employee: Employee | null
  onClose: () => void
  onSaved: (e: Employee) => void
}) {
  const { t } = useTranslation()
  const run = useRun()
  const isNew = employee === null
  const schema = useMemo(() => schemaFor(t, isNew), [t, isNew])
  const [departments, setDepartments] = useState<Department[]>([])
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([])
  const [types, setTypes] = useState<EmploymentType[]>([])
  const [supervisor, setSupervisor] = useState<PickerOption | null>(
    employee?.supervisor ? employeeOption(employee.supervisor) : null
  )
  const searchSupervisor = useMemo(() => searchEmployeeOptions(), [])

  useEffect(() => {
    void fetchDepartments().then(setDepartments)
    void fetchLookups().then((l) => {
      setJobTitles(l.jobTitles)
      setTypes(l.employmentTypes)
    })
  }, [])

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      employeeNumber: employee?.employeeNumber ?? "",
      firstName: employee?.firstName ?? "",
      middleName: employee?.middleName ?? "",
      lastName: employee?.lastName ?? "",
      gender: employee?.gender ?? "FEMALE",
      companyEmail: employee?.companyEmail ?? "",
      phone: employee?.phone ?? "",
      departmentUniqueId: employee?.department.uniqueId ?? "",
      jobTitleUniqueId: employee?.jobTitle.uniqueId ?? "",
      employmentTypeUniqueId: employee?.employmentType.uniqueId ?? "",
      startDate: toDateInput(employee?.startDate),
      contractEndDate: toDateInput(employee?.contractEndDate),
      workLocation: employee?.workLocation ?? "",
      skills: employee?.skills.join(", ") ?? "",
      qualifications: employee?.qualifications.join(", ") ?? "",
      professionalRoles: employee?.professionalRoles.join(", ") ?? "",
      effectiveDate: "",
      reason: "",
    },
  })
  const { register, formState, watch, handleSubmit } = form
  const err = formState.errors
  const typeId = watch("employmentTypeUniqueId")
  const needsEnd = types.find((x) => x.uniqueId === typeId)?.requiresEndDate

  // Changing department, job title, type or supervisor is tracked history.
  const tracked =
    !isNew &&
    (watch("departmentUniqueId") !== employee.department.uniqueId ||
      watch("jobTitleUniqueId") !== employee.jobTitle.uniqueId ||
      typeId !== employee.employmentType.uniqueId ||
      (supervisor?.value ?? null) !== (employee.supervisor?.uniqueId ?? null))

  async function onSubmit(v: Values) {
    if (needsEnd && !v.contractEndDate) {
      form.setError("contractEndDate", {
        message: t(
          "employees.contract_end_required",
          "Required for this employment type"
        ),
      })
      return
    }
    let saved: Employee | null = null
    const common = {
      firstName: v.firstName,
      middleName: v.middleName || undefined,
      lastName: v.lastName,
      gender: v.gender,
      companyEmail: v.companyEmail.toLowerCase(),
      phone: v.phone,
      departmentUniqueId: v.departmentUniqueId,
      jobTitleUniqueId: v.jobTitleUniqueId,
      employmentTypeUniqueId: v.employmentTypeUniqueId,
      workLocation: v.workLocation || undefined,
      skills: list(v.skills),
      qualifications: list(v.qualifications),
      professionalRoles: list(v.professionalRoles),
    }
    const ok = await run(
      async () => {
        saved = isNew
          ? await createEmployee({
              ...common,
              employeeNumber: v.employeeNumber,
              startDate: v.startDate,
              contractEndDate: v.contractEndDate || undefined,
              supervisorUniqueId: supervisor?.value,
            })
          : await updateEmployee({
              ...common,
              uniqueId: employee.uniqueId,
              middleName: v.middleName,
              workLocation: v.workLocation,
              ...(v.contractEndDate
                ? { contractEndDate: v.contractEndDate }
                : { clearContractEndDate: true }),
              ...(supervisor
                ? { supervisorUniqueId: supervisor.value }
                : { clearSupervisor: !!employee.supervisor }),
              effectiveDate: v.effectiveDate || undefined,
              reason: v.reason || undefined,
            })
      },
      t("common.saved", "Saved")
    )
    if (ok && saved) onSaved(saved)
  }

  const text = (
    name: keyof Values,
    label: string,
    props: React.ComponentProps<typeof Input> = {}
  ) => (
    <Field data-invalid={!!err[name] || undefined}>
      <FieldLabel htmlFor={`emp-${name}`}>{label}</FieldLabel>
      <Input
        id={`emp-${name}`}
        aria-invalid={!!err[name] || undefined}
        {...register(name)}
        {...props}
      />
      <FieldError errors={[err[name]]} />
    </Field>
  )

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>
            {isNew
              ? t("employees.new", "New employee")
              : t("employees.edit", "Edit {{name}}", {
                  name: employee.fullName,
                })}
          </SheetTitle>
          <SheetDescription>
            {t(
              "employees.form_hint",
              "The company email must use an allowed AzamTV domain; it becomes the login email if a user is created."
            )}
          </SheetDescription>
        </SheetHeader>
        <form
          id="employee-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6 px-4"
        >
          <FieldSet>
            <FieldLegend>{t("employees.identity", "Identity")}</FieldLegend>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                {text("employeeNumber", t("employees.number", "Employee no."), {
                  disabled: !isNew,
                })}
                <Field>
                  <FieldLabel htmlFor="emp-gender">
                    {t("employees.gender", "Gender")}
                  </FieldLabel>
                  <NativeSelect
                    id="emp-gender"
                    className="w-full"
                    {...register("gender")}
                  >
                    <NativeSelectOption value="FEMALE">
                      {t("employees.female", "Female")}
                    </NativeSelectOption>
                    <NativeSelectOption value="MALE">
                      {t("employees.male", "Male")}
                    </NativeSelectOption>
                  </NativeSelect>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {text("firstName", t("employees.first_name", "First name"))}
                {text("middleName", t("employees.middle_name", "Middle name"))}
                {text("lastName", t("employees.last_name", "Last name"))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {text(
                  "companyEmail",
                  t("employees.company_email", "Company email"),
                  {
                    type: "email",
                    placeholder: "name@azamtv.co.tz",
                  }
                )}
                {text("phone", t("employees.phone", "Phone"), {
                  placeholder: "+255 700 000 000",
                })}
              </div>
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>{t("employees.employment", "Employment")}</FieldLegend>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={!!err.departmentUniqueId || undefined}>
                  <FieldLabel htmlFor="emp-dept">
                    {t("employees.department", "Department")}
                  </FieldLabel>
                  <NativeSelect
                    id="emp-dept"
                    className="w-full"
                    {...register("departmentUniqueId")}
                  >
                    <NativeSelectOption value="">—</NativeSelectOption>
                    {departments.map((d) => (
                      <NativeSelectOption key={d.uniqueId} value={d.uniqueId}>
                        {d.parent ? `${d.parent.name} › ${d.name}` : d.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldError errors={[err.departmentUniqueId]} />
                </Field>
                <Field data-invalid={!!err.jobTitleUniqueId || undefined}>
                  <FieldLabel htmlFor="emp-title">
                    {t("employees.job_title", "Job title")}
                  </FieldLabel>
                  <NativeSelect
                    id="emp-title"
                    className="w-full"
                    {...register("jobTitleUniqueId")}
                  >
                    <NativeSelectOption value="">—</NativeSelectOption>
                    {jobTitles.map((j) => (
                      <NativeSelectOption key={j.uniqueId} value={j.uniqueId}>
                        {j.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldError errors={[err.jobTitleUniqueId]} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field data-invalid={!!err.employmentTypeUniqueId || undefined}>
                  <FieldLabel htmlFor="emp-type">
                    {t("employees.employment_type", "Employment type")}
                  </FieldLabel>
                  <NativeSelect
                    id="emp-type"
                    className="w-full"
                    {...register("employmentTypeUniqueId")}
                  >
                    <NativeSelectOption value="">—</NativeSelectOption>
                    {types.map((x) => (
                      <NativeSelectOption key={x.uniqueId} value={x.uniqueId}>
                        {x.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldError errors={[err.employmentTypeUniqueId]} />
                </Field>
                {text("startDate", t("employees.start_date", "Start date"), {
                  type: "date",
                  disabled: !isNew,
                })}
                {text(
                  "contractEndDate",
                  needsEnd
                    ? t("employees.contract_end", "Contract end date")
                    : t(
                        "employees.contract_end_optional",
                        "Contract end (optional)"
                      ),
                  { type: "date" }
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>
                    {t("employees.supervisor", "Reporting supervisor")}
                  </FieldLabel>
                  <AsyncPicker
                    selected={supervisor}
                    onChange={setSupervisor}
                    search={searchSupervisor}
                    placeholder={t("common.none", "None")}
                  />
                </Field>
                {text(
                  "workLocation",
                  t("employees.work_location", "Work location")
                )}
              </div>
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>
              {t("employees.skills_section", "Skills (used for crew)")}
            </FieldLegend>
            <FieldDescription>
              {t(
                "employees.comma_hint",
                "Separate several values with commas."
              )}
            </FieldDescription>
            <FieldGroup>
              {text("skills", t("employees.skills", "Skills"))}
              {text(
                "qualifications",
                t("employees.qualifications", "Qualifications")
              )}
              {text(
                "professionalRoles",
                t("employees.professional_roles", "Professional roles")
              )}
            </FieldGroup>
          </FieldSet>

          {tracked && (
            <FieldSet className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4">
              <FieldLegend>
                {t("employees.change_record", "Change record")}
              </FieldLegend>
              <FieldDescription>
                {t(
                  "employees.change_record_hint",
                  "Department, job title, employment type and supervisor changes are kept in the employee's history."
                )}
              </FieldDescription>
              <FieldGroup>
                {text(
                  "effectiveDate",
                  t("employees.effective_date", "Effective date"),
                  {
                    type: "date",
                  }
                )}
                <Field>
                  <FieldLabel htmlFor="emp-reason">
                    {t("common.reason", "Reason")}
                  </FieldLabel>
                  <Textarea id="emp-reason" {...register("reason")} />
                </Field>
              </FieldGroup>
            </FieldSet>
          )}
        </form>
        <SheetFooter className="flex-row justify-end">
          <Button variant="outline" onClick={onClose}>
            {t("actions.cancel", "Cancel")}
          </Button>
          <Button
            type="submit"
            form="employee-form"
            disabled={formState.isSubmitting}
          >
            {t("common.save", "Save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
