import { gql } from "./api"
import { GET_ROLES, GET_ALL_PERMISSIONS } from "./queries"
import { CREATE_ROLE, UPDATE_ROLE, DELETE_ROLE } from "./mutations"

// Types

export type PermissionEntity = {
  uniqueId: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  name: string
  description: string | null
}

export type Role = {
  uniqueId: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  name: string
  description: string | null
  permissions: Pick<PermissionEntity, "uniqueId" | "name" | "description">[]
}

type PaginatedResponse<T> = {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

type PaginationInput = {
  page?: number
  limit?: number
}

type RoleFilterInput = {
  name?: string
  isActive?: boolean
}

// Queries — getRoles requires "roles.read", getAllPermissions "permissions.read"

export async function fetchRoles(
  pagination?: PaginationInput,
  filter?: RoleFilterInput
): Promise<PaginatedResponse<Role>> {
  const data = await gql<
    { getRoles: PaginatedResponse<Role> },
    { pagination?: PaginationInput; filter?: RoleFilterInput }
  >(GET_ROLES, { pagination, filter })
  return data.getRoles
}

export async function fetchAllPermissions(): Promise<PermissionEntity[]> {
  const data = await gql<{ getAllPermissions: PermissionEntity[] }>(
    GET_ALL_PERMISSIONS
  )
  return data.getAllPermissions
}

// Mutations — all require "roles.manage"

type RoleMutationResponse = {
  message: string
  data: Pick<Role, "uniqueId" | "name" | "description" | "permissions">
}

export type CreateRoleInput = {
  name: string
  description?: string
  permissionNames?: string[]
}

export type UpdateRoleInput = {
  uniqueId: string
  name?: string
  description?: string
  permissionNames?: string[]
}

export async function createRole(
  input: CreateRoleInput
): Promise<RoleMutationResponse> {
  const data = await gql<
    { createRole: RoleMutationResponse },
    { createRoleInput: CreateRoleInput }
  >(CREATE_ROLE, { createRoleInput: input })
  return data.createRole
}

export async function updateRole(
  input: UpdateRoleInput
): Promise<RoleMutationResponse> {
  const data = await gql<
    { updateRole: RoleMutationResponse },
    { updateRoleInput: UpdateRoleInput }
  >(UPDATE_ROLE, { updateRoleInput: input })
  return data.updateRole
}

export async function deleteRole(uniqueId: string): Promise<string> {
  const data = await gql<
    { deleteRole: { message: string } },
    { uniqueId: string }
  >(DELETE_ROLE, { uniqueId })
  return data.deleteRole.message
}
