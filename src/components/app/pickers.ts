import { searchEmployees, type EmployeeFilter } from "@/services/employees"
import { fetchUsers } from "@/services/users"
import type { EmployeeRef } from "@/services/types"
import type { PickerOption } from "./async-picker"

export const employeeOption = (e: EmployeeRef): PickerOption => ({
  value: e.uniqueId,
  label: e.fullName,
  hint: `${e.employeeNumber} · ${e.companyEmail}`,
})

export const searchEmployeeOptions =
  (filter: EmployeeFilter = {}) =>
  async (q: string): Promise<PickerOption[]> =>
    (await searchEmployees(q, filter)).map(employeeOption)

export async function searchUserOptions(q: string): Promise<PickerOption[]> {
  const page = await fetchUsers(
    { search: q || undefined, statuses: ["ACTIVE", "PENDING_ACTIVATION"] },
    { page: 1, limit: 20 }
  )
  return page.data.map((u) => ({
    value: u.uniqueId,
    label: u.employee.fullName,
    hint: `${u.email} · ${u.department.name}`,
  }))
}
