import { gql } from "./api"
import type { Scope } from "@/context/auth-context"
import { PAGE_FIELDS, type Page } from "./types"

export type PermissionDef = {
  code: string
  module: string
  description: string
  allowedScopes: Scope[]
}

export type RoleGrant = {
  permissionCode: string
  scope: Scope
  valueLimit?: number | null
}

export type Role = {
  uniqueId: string
  name: string
  description: string | null
  contextType: "STORE" | "DEPARTMENT" | null
  isActive: boolean
  grants: RoleGrant[]
  userCount: number
  updatedAt: string
}

const ROLE = /* GraphQL */ `
  uniqueId
  name
  description
  contextType
  isActive
  grants { permissionCode scope valueLimit }
  userCount
  updatedAt
`

export async function fetchPermissionCatalogue(): Promise<PermissionDef[]> {
  const data = await gql<{ permissionCatalogue: PermissionDef[] }>(
    `{ permissionCatalogue { code module description allowedScopes } }`
  )
  return data.permissionCatalogue
}

export async function fetchRoles(
  includeRetired = false,
  search?: string
): Promise<Page<Role>> {
  const data = await gql<{ roles: Page<Role> }>(
    `query($r: Boolean, $s: String) {
      roles(includeRetired: $r, search: $s, pagination: { limit: 100 }) { data { ${ROLE} } ${PAGE_FIELDS} }
    }`,
    { r: includeRetired, s: search }
  )
  return data.roles
}

export async function fetchRole(uniqueId: string): Promise<Role> {
  const data = await gql<{ role: Role }>(
    `query($u: String!) { role(uniqueId: $u) { ${ROLE} } }`,
    { u: uniqueId }
  )
  return data.role
}

export async function createRole(input: {
  name: string
  description?: string
  contextType?: "STORE" | "DEPARTMENT"
  grants: RoleGrant[]
}): Promise<Role> {
  const data = await gql<{ createRole: Role }>(
    `mutation($input: CreateRoleInput!) { createRole(input: $input) { ${ROLE} } }`,
    { input }
  )
  return data.createRole
}

export async function updateRole(input: {
  uniqueId: string
  name?: string
  description?: string
  grants?: RoleGrant[]
}): Promise<Role> {
  const data = await gql<{ updateRole: Role }>(
    `mutation($input: UpdateRoleInput!) { updateRole(input: $input) { ${ROLE} } }`,
    {
      input: {
        ...input,
        grants: input.grants?.map(({ permissionCode, scope }) => ({
          permissionCode,
          scope,
        })),
      },
    }
  )
  return data.updateRole
}

export async function copyRole(uniqueId: string, name: string): Promise<Role> {
  const data = await gql<{ copyRole: Role }>(
    `mutation($u: String!, $n: String!) { copyRole(uniqueId: $u, name: $n) { ${ROLE} } }`,
    { u: uniqueId, n: name }
  )
  return data.copyRole
}

export async function setRoleActive(
  uniqueId: string,
  isActive: boolean
): Promise<Role> {
  const data = await gql<{ setRoleActive: Role }>(
    `mutation($u: String!, $a: Boolean!) { setRoleActive(uniqueId: $u, isActive: $a) { ${ROLE} } }`,
    { u: uniqueId, a: isActive }
  )
  return data.setRoleActive
}

// ── groups ─────────────────────────────────────────────────────────────────

export type UserGroup = {
  uniqueId: string
  code: string
  name: string
  description: string | null
  isActive: boolean
  members: {
    userUniqueId: string
    email: string
    fullName: string
    departmentName: string
  }[]
  roles: Role[]
}

const GROUP = /* GraphQL */ `
  uniqueId
  code
  name
  description
  isActive
  members { userUniqueId email fullName departmentName }
  roles { ${ROLE} }
`

export async function fetchGroups(
  includeInactive = false
): Promise<UserGroup[]> {
  const data = await gql<{ userGroups: UserGroup[] }>(
    `query($i: Boolean) { userGroups(includeInactive: $i) { ${GROUP} } }`,
    { i: includeInactive }
  )
  return data.userGroups
}

export async function createGroup(input: {
  code: string
  name: string
  description?: string
}): Promise<UserGroup> {
  const data = await gql<{ createUserGroup: UserGroup }>(
    `mutation($input: CreateGroupInput!) { createUserGroup(input: $input) { ${GROUP} } }`,
    { input }
  )
  return data.createUserGroup
}

export async function updateGroup(input: {
  uniqueId: string
  name?: string
  description?: string
}): Promise<UserGroup> {
  const data = await gql<{ updateUserGroup: UserGroup }>(
    `mutation($input: UpdateGroupInput!) { updateUserGroup(input: $input) { ${GROUP} } }`,
    { input }
  )
  return data.updateUserGroup
}

export async function setGroupActive(
  uniqueId: string,
  isActive: boolean
): Promise<UserGroup> {
  const data = await gql<{ setUserGroupActive: UserGroup }>(
    `mutation($u: String!, $a: Boolean!) { setUserGroupActive(uniqueId: $u, isActive: $a) { ${GROUP} } }`,
    { u: uniqueId, a: isActive }
  )
  return data.setUserGroupActive
}

export async function setGroupMembers(
  groupUniqueId: string,
  userUniqueIds: string[]
): Promise<UserGroup> {
  const data = await gql<{ setUserGroupMembers: UserGroup }>(
    `mutation($input: SetGroupMembersInput!) { setUserGroupMembers(input: $input) { ${GROUP} } }`,
    { input: { groupUniqueId, userUniqueIds } }
  )
  return data.setUserGroupMembers
}

export async function setGroupRoles(
  groupUniqueId: string,
  roleUniqueIds: string[]
): Promise<UserGroup> {
  const data = await gql<{ setUserGroupRoles: UserGroup }>(
    `mutation($input: SetGroupRolesInput!) { setUserGroupRoles(input: $input) { ${GROUP} } }`,
    { input: { groupUniqueId, roleUniqueIds } }
  )
  return data.setUserGroupRoles
}
