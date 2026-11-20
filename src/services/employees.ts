import { gql } from "./api"
import {
  EMPLOYEE_REF,
  PAGE_FIELDS,
  type DepartmentRef,
  type EmployeeRef,
  type Page,
  type PageInput,
} from "./types"

export type EmployeeStatus = "ACTIVE" | "ON_LEAVE" | "SUSPENDED" | "EXITED"
export type Gender = "MALE" | "FEMALE"
export type UserStatus =
  "PENDING_ACTIVATION" | "ACTIVE" | "LOCKED" | "DEACTIVATED"

export const EMPLOYEE_STATUSES: EmployeeStatus[] = [
  "ACTIVE",
  "ON_LEAVE",
  "SUSPENDED",
  "EXITED",
]

export type Employee = {
  uniqueId: string
  employeeNumber: string
  firstName: string
  middleName: string | null
  lastName: string
  fullName: string
  gender: Gender
  companyEmail: string
  phone: string | null
  department: DepartmentRef
  jobTitle: { uniqueId: string; code: string; name: string }
  employmentType: { uniqueId: string; code: string; name: string }
  startDate: string
  contractEndDate: string | null
  supervisor: EmployeeRef | null
  workLocation: string | null
  status: EmployeeStatus
  skills: string[]
  qualifications: string[]
  professionalRoles: string[]
  driverProfile: {
    licenceNumber: string
    licenceClass: string
    licenceExpiry: string
  } | null
  user: { uniqueId: string; status: UserStatus } | null
  personalVisible: boolean
}

const EMPLOYEE = /* GraphQL */ `
  uniqueId
  employeeNumber
  firstName
  middleName
  lastName
  fullName
  gender
  companyEmail
  phone
  department { uniqueId code name }
  jobTitle { uniqueId code name }
  employmentType { uniqueId code name }
  startDate
  contractEndDate
  supervisor { ${EMPLOYEE_REF} }
  workLocation
  status
  skills
  qualifications
  professionalRoles
  driverProfile { licenceNumber licenceClass licenceExpiry }
  user { uniqueId status }
  personalVisible
`

export type EmployeeFilter = {
  search?: string
  departmentUniqueId?: string
  statuses?: EmployeeStatus[]
  jobTitleUniqueId?: string
  employmentTypeUniqueId?: string
  hasUser?: boolean
  isDriver?: boolean
}

export async function fetchEmployees(
  filter: EmployeeFilter = {},
  pagination: PageInput = {}
): Promise<Page<Employee>> {
  const data = await gql<{ employees: Page<Employee> }>(
    `query($f: EmployeeFilterInput, $p: PaginationInput) {
      employees(filter: $f, pagination: $p) { data { ${EMPLOYEE} } ${PAGE_FIELDS} }
    }`,
    { f: filter, p: pagination }
  )
  return data.employees
}

export async function fetchEmployee(uniqueId: string): Promise<Employee> {
  const data = await gql<{ employee: Employee }>(
    `query($u: String!) { employee(uniqueId: $u) { ${EMPLOYEE} } }`,
    { u: uniqueId }
  )
  return data.employee
}

export type EmployeeHistoryEntry = {
  field: string
  oldValue: string | null
  newValue: string | null
  effectiveDate: string
  changedBy: string | null
  reason: string | null
  createdAt: string
}

export async function fetchEmployeeHistory(
  uniqueId: string
): Promise<EmployeeHistoryEntry[]> {
  const data = await gql<{ employeeHistory: EmployeeHistoryEntry[] }>(
    `query($u: String!) { employeeHistory(uniqueId: $u) {
      field oldValue newValue effectiveDate changedBy reason createdAt
    } }`,
    { u: uniqueId }
  )
  return data.employeeHistory
}

export type EmployeeInput = {
  employeeNumber: string
  firstName: string
  middleName?: string
  lastName: string
  gender: Gender
  companyEmail: string
  phone: string
  departmentUniqueId: string
  jobTitleUniqueId: string
  employmentTypeUniqueId: string
  startDate: string
  contractEndDate?: string
  supervisorUniqueId?: string
  workLocation?: string
  skills?: string[]
  qualifications?: string[]
  professionalRoles?: string[]
}

export async function createEmployee(input: EmployeeInput): Promise<Employee> {
  const data = await gql<{ createEmployee: Employee }>(
    `mutation($input: CreateEmployeeInput!) { createEmployee(input: $input) { ${EMPLOYEE} } }`,
    { input }
  )
  return data.createEmployee
}

export type EmployeeUpdate = Partial<
  Omit<EmployeeInput, "employeeNumber" | "startDate">
> & {
  uniqueId: string
  clearContractEndDate?: boolean
  clearSupervisor?: boolean
  effectiveDate?: string
  reason?: string
}

export async function updateEmployee(input: EmployeeUpdate): Promise<Employee> {
  const data = await gql<{ updateEmployee: Employee }>(
    `mutation($input: UpdateEmployeeInput!) { updateEmployee(input: $input) { ${EMPLOYEE} } }`,
    { input }
  )
  return data.updateEmployee
}

export async function changeEmployeeStatus(input: {
  uniqueId: string
  status: EmployeeStatus
  reason: string
  effectiveDate?: string
  newStartDate?: string
}): Promise<Employee> {
  const data = await gql<{ changeEmployeeStatus: Employee }>(
    `mutation($input: ChangeEmployeeStatusInput!) { changeEmployeeStatus(input: $input) { ${EMPLOYEE} } }`,
    { input }
  )
  return data.changeEmployeeStatus
}

export async function setDriverProfile(input: {
  employeeUniqueId: string
  licenceNumber: string
  licenceClass: string
  licenceExpiry: string
}): Promise<void> {
  await gql(
    `mutation($input: SetDriverProfileInput!) { setDriverProfile(input: $input) { uniqueId } }`,
    { input }
  )
}

export async function removeDriverProfile(
  employeeUniqueId: string
): Promise<void> {
  await gql(
    `mutation($u: String!) { removeDriverProfile(employeeUniqueId: $u) { uniqueId } }`,
    { u: employeeUniqueId }
  )
}

/** Lightweight search for pickers (HOD, supervisor, group members…). */
export async function searchEmployees(
  search: string,
  filter: EmployeeFilter = {}
): Promise<Employee[]> {
  const page = await fetchEmployees(
    {
      search: search || undefined,
      statuses: ["ACTIVE", "ON_LEAVE"],
      ...filter,
    },
    { page: 1, limit: 20 }
  )
  return page.data
}
