import { gql } from "./api"
import type { UserStatus } from "./employees"
import {
  EMPLOYEE_REF,
  PAGE_FIELDS,
  type DepartmentRef,
  type EmployeeRef,
  type Page,
  type PageInput,
} from "./types"

export type UserRoleAssignment = {
  roleUniqueId: string
  roleName: string
  contextType: "STORE" | "DEPARTMENT" | null
  contextUniqueId: string | null
  contextName: string | null
}

export type AppUser = {
  uniqueId: string
  email: string
  status: UserStatus
  twoFactorEnabled: boolean
  lastLoginAt: string | null
  lockedUntil: string | null
  createdAt: string
  employee: EmployeeRef
  department: DepartmentRef
  jobTitle: string
  roles: UserRoleAssignment[]
  groups: { uniqueId: string; code: string; name: string }[]
  creationApprovalStatus: string | null
  creationApprovalUniqueId: string | null
}

const USER = /* GraphQL */ `
  uniqueId
  email
  status
  twoFactorEnabled
  lastLoginAt
  lockedUntil
  createdAt
  employee { ${EMPLOYEE_REF} }
  department { uniqueId code name }
  jobTitle
  roles { roleUniqueId roleName contextType contextUniqueId contextName }
  groups { uniqueId code name }
  creationApprovalStatus
  creationApprovalUniqueId
`

export type UserFilter = {
  search?: string
  statuses?: UserStatus[]
  roleUniqueId?: string
  departmentUniqueId?: string
}

export async function fetchUsers(
  filter: UserFilter = {},
  pagination: PageInput = {}
): Promise<Page<AppUser>> {
  const data = await gql<{ users: Page<AppUser> }>(
    `query($f: UserFilterInput, $p: PaginationInput) {
      users(filter: $f, pagination: $p) { data { ${USER} } ${PAGE_FIELDS} }
    }`,
    { f: filter, p: pagination }
  )
  return data.users
}

export async function fetchUser(uniqueId: string): Promise<AppUser> {
  const data = await gql<{ user: AppUser }>(
    `query($u: String!) { user(uniqueId: $u) { ${USER} } }`,
    { u: uniqueId }
  )
  return data.user
}

export type RoleAssignmentInput = {
  roleUniqueId: string
  contextUniqueId?: string
}

export async function createUsersFromEmployees(
  employeeUniqueIds: string[],
  roles: RoleAssignmentInput[]
): Promise<{ created: AppUser[]; skipped: string[] }> {
  const data = await gql<{
    createUsersFromEmployees: { created: AppUser[]; skipped: string[] }
  }>(
    `mutation($input: CreateUsersFromEmployeesInput!) {
      createUsersFromEmployees(input: $input) { created { ${USER} } skipped }
    }`,
    { input: { employeeUniqueIds, roles } }
  )
  return data.createUsersFromEmployees
}

type UserAction =
  "resendActivation" | "deactivateUser" | "reactivateUser" | "unlockUser"

export async function userAction(
  action: UserAction,
  uniqueId: string
): Promise<AppUser> {
  const data = await gql<Record<string, AppUser>>(
    `mutation($u: String!) { ${action}(uniqueId: $u) { ${USER} } }`,
    { u: uniqueId }
  )
  return data[action]
}

export async function sendPasswordReset(uniqueId: string): Promise<void> {
  await gql(`mutation($u: String!) { sendPasswordReset(uniqueId: $u) }`, {
    u: uniqueId,
  })
}

export async function setUserRoles(
  userUniqueId: string,
  roles: RoleAssignmentInput[]
): Promise<AppUser> {
  const data = await gql<{ setUserRoles: AppUser }>(
    `mutation($input: SetUserRolesInput!) { setUserRoles(input: $input) { ${USER} } }`,
    { input: { userUniqueId, roles } }
  )
  return data.setUserRoles
}

export type LoginEvent = {
  email: string
  type: string
  success: boolean
  reason: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

const LOGIN_EVENT = `email type success reason ipAddress userAgent createdAt`

export async function fetchLoginEvents(
  userUniqueId?: string,
  pagination: PageInput = {}
): Promise<Page<LoginEvent>> {
  const data = await gql<{ loginEvents: Page<LoginEvent> }>(
    `query($u: String, $p: PaginationInput) {
      loginEvents(userUniqueId: $u, pagination: $p) { data { ${LOGIN_EVENT} } ${PAGE_FIELDS} }
    }`,
    { u: userUniqueId, p: pagination }
  )
  return data.loginEvents
}

export async function fetchMyLoginEvents(): Promise<LoginEvent[]> {
  const data = await gql<{ myLoginEvents: LoginEvent[] }>(
    `{ myLoginEvents { ${LOGIN_EVENT} } }`
  )
  return data.myLoginEvents
}
