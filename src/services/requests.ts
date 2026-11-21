import { gql } from "./api"
import type { Ref } from "./store"

export type InternalRequestStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "ACCEPTED"
  | "FULFILLED_FROM_STORE"
  | "IN_PURCHASE"
  | "DELIVERED"
  | "CLOSED"
  | "RETURNED"
  | "REJECTED"
  | "CANCELLED"
export type PurchaseRequestStatus =
  | "DRAFT"
  | "IN_APPROVAL"
  | "APPROVED"
  | "RETURNED"
  | "REJECTED"
  | "IN_PROCUREMENT"
  | "COMPLETED"
  | "CANCELLED"

export type RequestEmployee = {
  uniqueId: string
  employeeNumber: string
  fullName: string
  companyEmail: string
}

export type InternalRequest = {
  uniqueId: string
  number: string
  status: InternalRequestStatus
  requestingDepartment: Ref
  owningDepartment: Ref
  beneficiary: RequestEmployee | null
  product: {
    uniqueId: string
    code: string | null
    name: string
    unit: string
    trackingType: "SERIALISED" | "QUANTITY" | "BATCH" | null
    status: string
  }
  quantity: number
  requiredBy: string | null
  justification: string
  productionRef: string | null
  createdBy: string
  createdAt: string
  submittedAt: string | null
  acceptedAt: string | null
  acceptedQty: number | null
  acceptNote: string | null
  store: Ref | null
  fromStoreQty: number
  toPurchaseQty: number
  deliveredQty: number
  approvalRequestUniqueId: string | null
  can: {
    edit: boolean
    submit: boolean
    accept: boolean
    plan: boolean
    purchase: boolean
    close: boolean
    cancel: boolean
  }
}

export type PurchaseRequest = {
  uniqueId: string
  number: string
  status: PurchaseRequestStatus
  department: Ref
  justification: string
  createdBy: string
  createdAt: string
  submittedAt: string | null
  decidedAt: string | null
  approvalRequestUniqueId: string | null
  lineCount: number
  lines: {
    lineNo: number
    productUniqueId: string
    productCode: string | null
    productName: string
    productStatus: string
    unit: string
    quantity: number
    beneficiary: string | null
    internalRequestNumber: string | null
    internalRequestUniqueId: string | null
    note: string | null
  }[]
  can: { submit: boolean; cancel: boolean }
}

const REF = "uniqueId code name"
const IR = /* GraphQL */ `
  uniqueId number status quantity requiredBy justification productionRef
  createdBy createdAt submittedAt acceptedAt acceptedQty acceptNote
  fromStoreQty toPurchaseQty deliveredQty approvalRequestUniqueId
  requestingDepartment { ${REF} } owningDepartment { ${REF} } store { ${REF} }
  beneficiary { uniqueId employeeNumber fullName companyEmail }
  product { uniqueId code name unit trackingType status }
  can { edit submit accept plan purchase close cancel }
`
const PR = /* GraphQL */ `
  uniqueId number status justification createdBy createdAt submittedAt
  decidedAt approvalRequestUniqueId lineCount department { ${REF} }
  lines {
    lineNo productUniqueId productCode productName productStatus unit quantity
    beneficiary internalRequestNumber internalRequestUniqueId note
  }
  can { submit cancel }
`

export type IrView = "mine" | "owning" | "deliver" | "all"

export async function fetchInternalRequests(view: IrView = "all") {
  const d = await gql<{ internalRequests: InternalRequest[] }>(
    `query($v: String) { internalRequests(view: $v) { ${IR} } }`,
    { v: view }
  )
  return d.internalRequests
}

export async function fetchInternalRequest(uniqueId: string) {
  const d = await gql<{ internalRequest: InternalRequest }>(
    `query($u: String!) { internalRequest(uniqueId: $u) { ${IR} } }`,
    { u: uniqueId }
  )
  return d.internalRequest
}

export async function createInternalRequest(input: {
  departmentUniqueId?: string
  beneficiaryEmployeeUniqueId?: string
  productUniqueId: string
  quantity: number
  requiredBy?: string
  justification: string
  productionRef?: string
}) {
  const d = await gql<{ createInternalRequest: InternalRequest }>(
    `mutation($i: CreateInternalRequestInput!) { createInternalRequest(input: $i) { ${IR} } }`,
    { i: input }
  )
  return d.createInternalRequest
}

export async function updateInternalRequest(
  uniqueId: string,
  input: { quantity: number; requiredBy?: string | null; justification: string }
) {
  const d = await gql<{ updateInternalRequest: InternalRequest }>(
    `mutation($u: String!, $i: UpdateInternalRequestInput!) { updateInternalRequest(uniqueId: $u, input: $i) { ${IR} } }`,
    { u: uniqueId, i: input }
  )
  return d.updateInternalRequest
}

const irAction =
  (name: string) =>
  async (uniqueId: string): Promise<InternalRequest> => {
    const d = await gql<Record<string, InternalRequest>>(
      `mutation($u: String!) { ${name}(uniqueId: $u) { ${IR} } }`,
      { u: uniqueId }
    )
    return d[name]
  }
export const submitInternalRequest = irAction("submitInternalRequest")
export const closeInternalRequest = irAction("closeInternalRequest")

export async function acceptInternalRequest(
  uniqueId: string,
  quantity: number,
  note?: string
) {
  const d = await gql<{ acceptInternalRequest: InternalRequest }>(
    `mutation($u: String!, $q: Int!, $n: String) { acceptInternalRequest(uniqueId: $u, quantity: $q, note: $n) { ${IR} } }`,
    { u: uniqueId, q: quantity, n: note }
  )
  return d.acceptInternalRequest
}

export async function planInternalRequest(
  uniqueId: string,
  input: {
    storeUniqueId?: string | null
    fromStoreQty: number
    toPurchaseQty: number
  }
) {
  const d = await gql<{ planInternalRequest: InternalRequest }>(
    `mutation($u: String!, $i: PlanInternalRequestInput!) { planInternalRequest(uniqueId: $u, input: $i) { ${IR} } }`,
    { u: uniqueId, i: input }
  )
  return d.planInternalRequest
}

export async function cancelInternalRequest(uniqueId: string, reason: string) {
  const d = await gql<{ cancelInternalRequest: InternalRequest }>(
    `mutation($u: String!, $r: String!) { cancelInternalRequest(uniqueId: $u, reason: $r) { ${IR} } }`,
    { u: uniqueId, r: reason }
  )
  return d.cancelInternalRequest
}

export async function fetchPurchaseRequests() {
  const d = await gql<{ purchaseRequests: PurchaseRequest[] }>(
    `{ purchaseRequests { ${PR} } }`
  )
  return d.purchaseRequests
}

export async function fetchPurchaseRequest(uniqueId: string) {
  const d = await gql<{ purchaseRequest: PurchaseRequest }>(
    `query($u: String!) { purchaseRequest(uniqueId: $u) { ${PR} } }`,
    { u: uniqueId }
  )
  return d.purchaseRequest
}

export async function createPurchaseRequest(input: {
  departmentUniqueId?: string
  justification: string
  lines: {
    productUniqueId: string
    quantity: number
    beneficiaryEmployeeUniqueId?: string | null
    productionRef?: string | null
    internalRequestUniqueId?: string | null
    note?: string | null
  }[]
}) {
  const d = await gql<{ createPurchaseRequest: PurchaseRequest }>(
    `mutation($i: CreatePurchaseRequestInput!) { createPurchaseRequest(input: $i) { ${PR} } }`,
    { i: input }
  )
  return d.createPurchaseRequest
}

export async function submitPurchaseRequest(uniqueId: string) {
  const d = await gql<{ submitPurchaseRequest: PurchaseRequest }>(
    `mutation($u: String!) { submitPurchaseRequest(uniqueId: $u) { ${PR} } }`,
    { u: uniqueId }
  )
  return d.submitPurchaseRequest
}

export async function cancelPurchaseRequest(uniqueId: string, reason: string) {
  const d = await gql<{ cancelPurchaseRequest: PurchaseRequest }>(
    `mutation($u: String!, $r: String!) { cancelPurchaseRequest(uniqueId: $u, reason: $r) { ${PR} } }`,
    { u: uniqueId, r: reason }
  )
  return d.cancelPurchaseRequest
}
