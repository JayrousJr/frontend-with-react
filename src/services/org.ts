import { gql } from "./api"
import { EMPLOYEE_REF, type DepartmentRef, type EmployeeRef } from "./types"

export type ActingAssignment = {
  uniqueId: string
  employee: EmployeeRef
  from: string
  to: string
  reason: string | null
  isActive: boolean
}

export type Department = {
  uniqueId: string
  code: string
  name: string
  isActive: boolean
  parent: DepartmentRef | null
  head: EmployeeRef | null
  deputy: EmployeeRef | null
  actingHead: ActingAssignment | null
  activeEmployeeCount: number
}

export type JobTitle = {
  uniqueId: string
  code: string
  name: string
  isActive: boolean
}

export type EmploymentType = JobTitle & { requiresEndDate: boolean }

const ACTING = /* GraphQL */ `
  uniqueId
  employee { ${EMPLOYEE_REF} }
  from
  to
  reason
  isActive
`

const DEPARTMENT = /* GraphQL */ `
  uniqueId
  code
  name
  isActive
  parent { uniqueId code name }
  head { ${EMPLOYEE_REF} }
  deputy { ${EMPLOYEE_REF} }
  actingHead { ${ACTING} }
  activeEmployeeCount
`

export async function fetchDepartments(
  includeInactive = false
): Promise<Department[]> {
  const data = await gql<{ departments: Department[] }>(
    `query($i: Boolean) { departments(includeInactive: $i) { ${DEPARTMENT} } }`,
    { i: includeInactive }
  )
  return data.departments
}

export async function createDepartment(input: {
  code: string
  name: string
  parentUniqueId?: string
}): Promise<Department> {
  const data = await gql<{ createDepartment: Department }>(
    `mutation($input: CreateDepartmentInput!) { createDepartment(input: $input) { ${DEPARTMENT} } }`,
    { input }
  )
  return data.createDepartment
}

export async function updateDepartment(input: {
  uniqueId: string
  name?: string
  parentUniqueId?: string
  clearParent?: boolean
}): Promise<Department> {
  const data = await gql<{ updateDepartment: Department }>(
    `mutation($input: UpdateDepartmentInput!) { updateDepartment(input: $input) { ${DEPARTMENT} } }`,
    { input }
  )
  return data.updateDepartment
}

export async function setDepartmentPerson(
  kind: "head" | "deputy",
  departmentUniqueId: string,
  employeeUniqueId: string | null
): Promise<Department> {
  const field = kind === "head" ? "setDepartmentHead" : "setDepartmentDeputy"
  const data = await gql<Record<string, Department>>(
    `mutation($input: SetDepartmentPersonInput!) { ${field}(input: $input) { ${DEPARTMENT} } }`,
    { input: { departmentUniqueId, employeeUniqueId } }
  )
  return data[field]
}

export async function setDepartmentActive(
  uniqueId: string,
  isActive: boolean
): Promise<void> {
  await gql(
    `mutation($u: String!, $a: Boolean!) { setDepartmentActive(uniqueId: $u, isActive: $a) { uniqueId } }`,
    { u: uniqueId, a: isActive }
  )
}

export async function fetchActingAssignments(
  departmentUniqueId: string
): Promise<ActingAssignment[]> {
  const data = await gql<{ actingAssignments: ActingAssignment[] }>(
    `query($d: String!) { actingAssignments(departmentUniqueId: $d) { ${ACTING} } }`,
    { d: departmentUniqueId }
  )
  return data.actingAssignments
}

export async function createActingAssignment(input: {
  departmentUniqueId: string
  employeeUniqueId: string
  from: string
  to: string
  reason?: string
}): Promise<void> {
  await gql(
    `mutation($input: CreateActingAssignmentInput!) { createActingAssignment(input: $input) { uniqueId } }`,
    { input }
  )
}

export async function cancelActingAssignment(uniqueId: string): Promise<void> {
  await gql(
    `mutation($u: String!) { cancelActingAssignment(uniqueId: $u) { uniqueId } }`,
    { u: uniqueId }
  )
}

export async function fetchHeadHistory(uniqueId: string) {
  const data = await gql<{
    departmentHeadHistory: {
      employee: EmployeeRef | null
      from: string
      to: string | null
    }[]
  }>(
    `query($u: String!) { departmentHeadHistory(uniqueId: $u) { employee { ${EMPLOYEE_REF} } from to } }`,
    { u: uniqueId }
  )
  return data.departmentHeadHistory
}

// ── lists ──────────────────────────────────────────────────────────────────

export async function fetchLookups(includeInactive = false): Promise<{
  jobTitles: JobTitle[]
  employmentTypes: EmploymentType[]
}> {
  return gql(
    `query($i: Boolean) {
      jobTitles(includeInactive: $i) { uniqueId code name isActive }
      employmentTypes(includeInactive: $i) { uniqueId code name isActive requiresEndDate }
    }`,
    { i: includeInactive }
  )
}

type LookupKind = "JobTitle" | "EmploymentType"

export async function createLookup(
  kind: LookupKind,
  input: { code: string; name: string; requiresEndDate?: boolean }
): Promise<void> {
  await gql(
    `mutation($input: LookupInput!) { create${kind}(input: $input) { uniqueId } }`,
    { input }
  )
}

export async function updateLookup(
  kind: LookupKind,
  input: { uniqueId: string; name?: string; requiresEndDate?: boolean }
): Promise<void> {
  await gql(
    `mutation($input: UpdateLookupInput!) { update${kind}(input: $input) { uniqueId } }`,
    { input }
  )
}

export async function setLookupActive(
  kind: LookupKind,
  uniqueId: string,
  isActive: boolean
): Promise<void> {
  await gql(
    `mutation($u: String!, $a: Boolean!) { set${kind}Active(uniqueId: $u, isActive: $a) { uniqueId } }`,
    { u: uniqueId, a: isActive }
  )
}
