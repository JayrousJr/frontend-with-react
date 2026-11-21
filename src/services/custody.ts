import { api, gql } from "./api"
import type { RequestEmployee } from "./requests"
import type { AssetCondition, AssetStatus, Ref } from "./store"

export type HandoverStatus =
  | "PREPARED"
  | "AWAITING_ACKNOWLEDGEMENT"
  | "ACKNOWLEDGED"
  | "PARTIALLY_RETURNED"
  | "CLOSED"
  | "DISPUTED"
  | "CANCELLED"

export type Handover = {
  uniqueId: string
  number: string
  status: HandoverStatus
  source: string
  sourceRef: string | null
  internalRequestUniqueId: string | null
  custodian: RequestEmployee
  custodianHasUser: boolean
  department: Ref | null
  store: Ref
  purpose: string
  expectedReturnDate: string | null
  termsText: string | null
  preparedBy: string | null
  createdAt: string
  acknowledgedAt: string | null
  ackMethod: "SYSTEM" | "EMAIL_LINK" | "COUNTER_CODE" | null
  ackBy: string | null
  disputeNote: string | null
  cancelReason: string | null
  lines: {
    assetUniqueId: string
    tag: string
    productName: string
    serialNumber: string | null
    condition: AssetCondition
    accessories: string[]
    components: string[]
    photos: { uniqueId: string; filename: string; uri: string }[]
    returnedAt: string | null
  }[]
  can: {
    acknowledge: boolean
    dispute: boolean
    sendLink: boolean
    counterCode: boolean
    resolveDispute: boolean
    cancel: boolean
  }
}

export type CustodyItem = {
  assetUniqueId: string
  tag: string
  productName: string
  categoryName: string
  serialNumber: string | null
  status: AssetStatus
  condition: AssetCondition
  isComponent: boolean
  custodian: RequestEmployee
  departmentName: string
  handoverUniqueId: string | null
  handoverNumber: string | null
  acknowledged: boolean
  expectedReturnDate: string | null
  overdue: boolean
  from: string
  to: string | null
  endReason: string | null
  lastInspection: string | null
  nextInspection: string | null
  openReports: number
}

export type AssetReturn = {
  uniqueId: string
  number: string
  status: "REQUESTED" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED"
  trigger: string
  reason: string | null
  custodian: RequestEmployee
  store: Ref | null
  requestedBy: string | null
  receivedBy: string | null
  createdAt: string
  receivedAt: string | null
  lines: {
    assetUniqueId: string
    tag: string
    productName: string
    isKit: boolean
    received: boolean
    condition: AssetCondition | null
    accessoriesReturned: string[]
    missing: string | null
    note: string | null
  }[]
}

export type ReportType = "FAULT" | "DAMAGE" | "LOSS" | "THEFT"
export type Responsibility =
  "NORMAL_WEAR" | "ACCIDENT" | "NEGLIGENCE" | "UNDER_INVESTIGATION"

export type AssetReport = {
  uniqueId: string
  number: string
  type: ReportType
  status: "OPEN" | "IN_APPROVAL" | "CONFIRMED" | "REJECTED" | "CLOSED"
  asset: {
    uniqueId: string
    tag: string
    productName: string
    status: AssetStatus
    condition: AssetCondition
  }
  custodian: string | null
  occurredAt: string
  circumstances: string
  stillUsable: boolean
  automatic: boolean
  reportedBy: string | null
  createdAt: string
  maintenanceTicketUniqueId: string | null
  lossApprovalUniqueId: string | null
  responsibility: Responsibility | null
  responsibilityReason: string | null
  responsibilityStatus: string | null
  responsibilityApprovalUniqueId: string | null
  canDecideResponsibility: boolean
}

export type CustodyTransfer = {
  uniqueId: string
  number: string
  status: "IN_APPROVAL" | "APPROVED" | "COMPLETED" | "REJECTED" | "CANCELLED"
  from: RequestEmployee
  to: RequestEmployee
  reason: string
  createdAt: string
  completedAt: string | null
  approvalRequestUniqueId: string | null
  assets: {
    uniqueId: string
    tag: string
    productName: string
    status: AssetStatus
  }[]
}

const PERSON = "uniqueId employeeNumber fullName companyEmail"
const REF = "uniqueId code name"
const HANDOVER = /* GraphQL */ `
  uniqueId number status source sourceRef internalRequestUniqueId custodianHasUser
  purpose expectedReturnDate termsText preparedBy createdAt acknowledgedAt
  ackMethod ackBy disputeNote cancelReason
  custodian { ${PERSON} } department { ${REF} } store { ${REF} }
  lines {
    assetUniqueId tag productName serialNumber condition accessories components
    photos { uniqueId filename uri } returnedAt
  }
  can { acknowledge dispute sendLink counterCode resolveDispute cancel }
`
const ITEM = /* GraphQL */ `
  assetUniqueId tag productName categoryName serialNumber status condition
  isComponent departmentName handoverUniqueId handoverNumber acknowledged
  expectedReturnDate overdue from to endReason lastInspection nextInspection
  openReports custodian { ${PERSON} }
`
const RETURN = /* GraphQL */ `
  uniqueId number status trigger reason requestedBy receivedBy createdAt receivedAt
  custodian { ${PERSON} } store { ${REF} }
  lines { assetUniqueId tag productName isKit received condition accessoriesReturned missing note }
`
const REPORT = /* GraphQL */ `
  uniqueId number type status custodian occurredAt circumstances stillUsable
  automatic reportedBy createdAt maintenanceTicketUniqueId lossApprovalUniqueId
  responsibility responsibilityReason responsibilityStatus
  responsibilityApprovalUniqueId canDecideResponsibility
  asset { uniqueId tag productName status condition }
`
const TRANSFER = /* GraphQL */ `
  uniqueId number status reason createdAt completedAt approvalRequestUniqueId
  from { ${PERSON} } to { ${PERSON} } assets { uniqueId tag productName status }
`

export async function fetchHandovers(
  statuses?: HandoverStatus[],
  employeeUniqueId?: string
) {
  const d = await gql<{ handovers: Handover[] }>(
    `query($s: [HandoverStatus!], $e: String) { handovers(statuses: $s, employeeUniqueId: $e) { ${HANDOVER} } }`,
    { s: statuses, e: employeeUniqueId }
  )
  return d.handovers
}

export async function fetchHandover(uniqueId: string) {
  const d = await gql<{ handover: Handover }>(
    `query($u: String!) { handover(uniqueId: $u) { ${HANDOVER} } }`,
    { u: uniqueId }
  )
  return d.handover
}

export async function prepareHandover(input: {
  storeUniqueId: string
  internalRequestUniqueId?: string
  custodyTransferUniqueId?: string
  assetReportUniqueId?: string
  purpose: string
  expectedReturnDate?: string | null
  lines: {
    assetUniqueId: string
    accessories?: string[]
    photoFileUniqueIds?: string[]
  }[]
}) {
  const d = await gql<{ prepareHandover: Handover }>(
    `mutation($i: PrepareHandoverInput!) { prepareHandover(input: $i) { ${HANDOVER} } }`,
    { i: input }
  )
  return d.prepareHandover
}

const hAction =
  (name: string) =>
  async (
    uniqueId: string,
    extra: Record<string, string> = {}
  ): Promise<Handover> => {
    const keys = Object.keys(extra)
    const decl = keys.map((k) => `, $${k}: String!`).join("")
    const args = keys.map((k) => `, ${k}: $${k}`).join("")
    const d = await gql<Record<string, Handover>>(
      `mutation($u: String!${decl}) { ${name}(uniqueId: $u${args}) { ${HANDOVER} } }`,
      { u: uniqueId, ...extra }
    )
    return d[name]
  }
export const acknowledgeHandover = (u: string) =>
  hAction("acknowledgeHandover")(u)
export const disputeHandover = (u: string, note: string) =>
  hAction("disputeHandover")(u, { note })
export const cancelHandover = (u: string, reason: string) =>
  hAction("cancelHandover")(u, { reason })
export const acknowledgeWithCode = (u: string, code: string) =>
  hAction("acknowledgeHandoverWithCode")(u, { code })
export const resolveDispute = (
  u: string,
  action: "RESEND" | "CANCEL",
  note: string
) => hAction("resolveHandoverDispute")(u, { action, note })

export async function sendHandoverLink(uniqueId: string) {
  const d = await gql<{
    sendHandoverLink: { sent: boolean; devLink: string | null }
  }>(
    `mutation($u: String!) { sendHandoverLink(uniqueId: $u) { sent devLink } }`,
    { u: uniqueId }
  )
  return d.sendHandoverLink
}

export async function sendHandoverCode(uniqueId: string) {
  const d = await gql<{
    sendHandoverCode: { sent: boolean; devCode: string | null }
  }>(
    `mutation($u: String!) { sendHandoverCode(uniqueId: $u) { sent devCode } }`,
    { u: uniqueId }
  )
  return d.sendHandoverCode
}

export async function fetchCustodyItems(
  filter: {
    mine?: boolean
    employeeUniqueId?: string
    departmentUniqueId?: string
  } = {}
) {
  const d = await gql<{ custodyItems: CustodyItem[] }>(
    `query($m: Boolean, $e: String, $d: String) { custodyItems(mine: $m, employeeUniqueId: $e, departmentUniqueId: $d) { ${ITEM} } }`,
    { m: filter.mine, e: filter.employeeUniqueId, d: filter.departmentUniqueId }
  )
  return d.custodyItems
}

export async function fetchCustodyHistory(filter: {
  assetUniqueId?: string
  employeeUniqueId?: string
}) {
  const d = await gql<{ custodyHistory: CustodyItem[] }>(
    `query($a: String, $e: String) { custodyHistory(assetUniqueId: $a, employeeUniqueId: $e) { ${ITEM} } }`,
    { a: filter.assetUniqueId, e: filter.employeeUniqueId }
  )
  return d.custodyHistory
}

export async function fetchInspectionsDue() {
  const d = await gql<{ inspectionsDue: CustodyItem[] }>(
    `{ inspectionsDue { ${ITEM} } }`
  )
  return d.inspectionsDue
}

export async function recordInspection(input: {
  assetUniqueId: string
  condition: AssetCondition
  remarks?: string
}) {
  const d = await gql<{ recordInspection: boolean }>(
    `mutation($i: InspectionInput!) { recordInspection(input: $i) }`,
    { i: input }
  )
  return d.recordInspection
}

export async function fetchReturns(open = false) {
  const d = await gql<{ assetReturns: AssetReturn[] }>(
    `query($o: Boolean) { assetReturns(open: $o) { ${RETURN} } }`,
    { o: open }
  )
  return d.assetReturns
}

export async function requestReturn(input: {
  assetUniqueIds: string[]
  reason: string
  recall?: boolean
}) {
  const d = await gql<{ requestAssetReturn: AssetReturn }>(
    `mutation($i: RequestReturnInput!) { requestAssetReturn(input: $i) { ${RETURN} } }`,
    { i: input }
  )
  return d.requestAssetReturn
}

export async function receiveReturn(input: {
  storeUniqueId: string
  returnUniqueId?: string
  lines: {
    assetUniqueId: string
    condition: AssetCondition
    locationUniqueId: string
    accessoriesReturned?: string[]
    missing?: string | null
    photoFileUniqueIds?: string[]
    note?: string | null
  }[]
}) {
  const d = await gql<{ receiveAssetReturn: AssetReturn }>(
    `mutation($i: ReceiveReturnInput!) { receiveAssetReturn(input: $i) { ${RETURN} } }`,
    { i: input }
  )
  return d.receiveAssetReturn
}

export async function cancelReturn(uniqueId: string) {
  const d = await gql<{ cancelAssetReturn: AssetReturn }>(
    `mutation($u: String!) { cancelAssetReturn(uniqueId: $u) { ${RETURN} } }`,
    { u: uniqueId }
  )
  return d.cancelAssetReturn
}

export async function fetchReports(assetUniqueId?: string) {
  const d = await gql<{ assetReports: AssetReport[] }>(
    `query($a: String) { assetReports(assetUniqueId: $a) { ${REPORT} } }`,
    { a: assetUniqueId }
  )
  return d.assetReports
}

export async function createReport(input: {
  assetUniqueId: string
  type: ReportType
  occurredAt: string
  circumstances: string
  stillUsable: boolean
  fileUniqueIds?: string[]
}) {
  const d = await gql<{ createAssetReport: AssetReport }>(
    `mutation($i: CreateAssetReportInput!) { createAssetReport(input: $i) { ${REPORT} } }`,
    { i: input }
  )
  return d.createAssetReport
}

export async function proposeResponsibility(
  uniqueId: string,
  decision: Responsibility,
  reason: string
) {
  const d = await gql<{ proposeResponsibility: AssetReport }>(
    `mutation($u: String!, $d: ResponsibilityDecision!, $r: String!) { proposeResponsibility(uniqueId: $u, decision: $d, reason: $r) { ${REPORT} } }`,
    { u: uniqueId, d: decision, r: reason }
  )
  return d.proposeResponsibility
}

export async function fetchCustodyTransfers() {
  const d = await gql<{ custodyTransfers: CustodyTransfer[] }>(
    `{ custodyTransfers { ${TRANSFER} } }`
  )
  return d.custodyTransfers
}

export async function requestCustodyTransfer(input: {
  assetUniqueIds: string[]
  toEmployeeUniqueId: string
  reason: string
}) {
  const d = await gql<{ requestCustodyTransfer: CustodyTransfer }>(
    `mutation($i: RequestCustodyTransferInput!) { requestCustodyTransfer(input: $i) { ${TRANSFER} } }`,
    { i: input }
  )
  return d.requestCustodyTransfer
}

// ── public email-link page (no login) ──

export type PublicHandover = {
  number: string
  custodian: string
  purpose: string
  expectedReturnDate: string | null
  terms: string | null
  items: {
    tag: string
    product: string
    serialNumber: string | null
    condition: AssetCondition
    accessories: string[]
  }[]
}

export async function fetchPublicHandover(token: string) {
  const { data } = await api.get<PublicHandover>(`/handover-ack/${token}`)
  return data
}

export async function respondPublicHandover(
  token: string,
  accept: boolean,
  note?: string
) {
  const { data } = await api.post<{ ok: boolean; status: string }>(
    `/handover-ack/${token}`,
    { accept, note }
  )
  return data
}
