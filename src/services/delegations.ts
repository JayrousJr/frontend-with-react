import { gql } from "./api"
import { PAGE_FIELDS, type Page, type PageInput } from "./types"

export type DelegationStatus =
  "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "EXPIRED"

type Person = {
  uniqueId: string
  email: string
  fullName: string
  departmentName: string
}

export type Delegation = {
  uniqueId: string
  from: Person
  to: Person
  approvedBy: Person | null
  roles: { uniqueId: string; name: string }[]
  allRoles: boolean
  start: string
  end: string
  reason: string
  status: DelegationStatus
  inForce: boolean
  decidedAt: string | null
  createdAt: string
}

const PERSON = "uniqueId email fullName departmentName"
const DELEGATION = /* GraphQL */ `
  uniqueId
  from { ${PERSON} }
  to { ${PERSON} }
  approvedBy { ${PERSON} }
  roles { uniqueId name }
  allRoles
  start
  end
  reason
  status
  inForce
  decidedAt
  createdAt
`

export async function fetchDelegations(
  scope: "mine" | "pending" | "all",
  pagination: PageInput = {}
): Promise<Page<Delegation>> {
  const data = await gql<{ delegations: Page<Delegation> }>(
    `query($s: String!, $p: PaginationInput) {
      delegations(scope: $s, pagination: $p) { data { ${DELEGATION} } ${PAGE_FIELDS} }
    }`,
    { s: scope, p: pagination }
  )
  return data.delegations
}

export async function createDelegation(input: {
  fromUserUniqueId?: string
  toUserUniqueId: string
  roleUniqueIds: string[]
  start: string
  end: string
  reason: string
}): Promise<Delegation> {
  const data = await gql<{ createDelegation: Delegation }>(
    `mutation($input: CreateDelegationInput!) { createDelegation(input: $input) { ${DELEGATION} } }`,
    { input }
  )
  return data.createDelegation
}

export async function decideDelegation(uniqueId: string, approve: boolean) {
  await gql(
    `mutation($u: String!, $a: Boolean!) { decideDelegation(uniqueId: $u, approve: $a) { uniqueId } }`,
    { u: uniqueId, a: approve }
  )
}

export async function cancelDelegation(uniqueId: string) {
  await gql(
    `mutation($u: String!) { cancelDelegation(uniqueId: $u) { uniqueId } }`,
    { u: uniqueId }
  )
}
