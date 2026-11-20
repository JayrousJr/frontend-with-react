import { gql } from "./api"

export type ApprovalStatus =
  "PENDING" | "APPROVED" | "REJECTED" | "RETURNED" | "CANCELLED"

export type ApprovalDecision =
  "APPROVE" | "REJECT" | "RETURN" | "COMMENT" | "SKIPPED" | "AUTO_APPROVED"

export type ApproverType = "USER" | "GROUP" | "ROLE" | "RULE"
export type ApprovalMode = "ANY" | "N_OF_M" | "ALL"

export type Person = { uniqueId: string; fullName: string; email: string }

export type ApprovalRequest = {
  uniqueId: string
  pointCode: string
  pointName: string
  title: string
  subjectType: string
  subjectId: string
  status: ApprovalStatus
  createdAt: string
  completedAt: string | null
  requester: Person | null
  currentStep: string | null
  steps: {
    order: number
    name: string
    mode: ApprovalMode
    requiredCount: number
    state: "CURRENT" | "DONE" | "SKIPPED" | "WAITING" | "NOT_REACHED"
  }[]
  assignees: Person[]
  noApprover: boolean
  actions: {
    decision: ApprovalDecision
    stepName: string | null
    comment: string | null
    at: string
    user: Person | null
    onBehalfOf: Person | null
  }[]
  canDecide: boolean
}

const PERSON = "uniqueId fullName email"
const REQUEST = /* GraphQL */ `
  uniqueId pointCode pointName title subjectType subjectId status
  createdAt completedAt currentStep noApprover canDecide
  requester { ${PERSON} }
  steps { order name mode requiredCount state }
  assignees { ${PERSON} }
  actions { decision stepName comment at user { ${PERSON} } onBehalfOf { ${PERSON} } }
`

export async function fetchMyApprovalTasks(): Promise<ApprovalRequest[]> {
  const d = await gql<{ myApprovalTasks: ApprovalRequest[] }>(
    `{ myApprovalTasks { ${REQUEST} } }`
  )
  return d.myApprovalTasks
}

export async function fetchMyApprovalRequests(): Promise<ApprovalRequest[]> {
  const d = await gql<{ myApprovalRequests: ApprovalRequest[] }>(
    `{ myApprovalRequests { ${REQUEST} } }`
  )
  return d.myApprovalRequests
}

export async function fetchAllApprovalRequests(
  status?: ApprovalStatus
): Promise<ApprovalRequest[]> {
  const d = await gql<{ approvalRequests: ApprovalRequest[] }>(
    `query($s: String) { approvalRequests(status: $s) { ${REQUEST} } }`,
    { s: status }
  )
  return d.approvalRequests
}

export async function fetchApprovalRequest(
  uniqueId: string
): Promise<ApprovalRequest> {
  const d = await gql<{ approvalRequest: ApprovalRequest }>(
    `query($u: String!) { approvalRequest(uniqueId: $u) { ${REQUEST} } }`,
    { u: uniqueId }
  )
  return d.approvalRequest
}

export async function decideApproval(
  uniqueId: string,
  decision: "APPROVE" | "REJECT" | "RETURN" | "COMMENT",
  comment?: string
): Promise<ApprovalRequest> {
  const d = await gql<{ decideApproval: ApprovalRequest }>(
    `mutation($input: DecideApprovalInput!) { decideApproval(input: $input) { ${REQUEST} } }`,
    { input: { uniqueId, decision, comment: comment || undefined } }
  )
  return d.decideApproval
}

// ── configuration ──────────────────────────────────────────────────────────

export type StepConfig = {
  order: number
  code: string
  name: string
  approverType: ApproverType
  approverUniqueId: string | null
  approverLabel: string
  rule: string | null
  mode: ApprovalMode
  requiredCount: number
  allowDelegation: boolean
  condition: string | null
  slaHours: number | null
}

export type ChainVersion = {
  uniqueId: string
  version: number
  status: "DRAFT" | "ACTIVE" | "RETIRED"
  activatedAt: string | null
  createdAt: string
  steps: StepConfig[]
}

export type PointSummary = {
  code: string
  module: string
  name: string
  description: string
  registered: boolean
  activeVersion: ChainVersion | null
  hasDraft: boolean
  pendingRequests: number
}

export type ApprovalPoint = {
  code: string
  module: string
  name: string
  description: string
  versions: ChainVersion[]
}

const STEP = `order code name approverType approverUniqueId approverLabel rule mode requiredCount allowDelegation condition slaHours`
const VERSION = `uniqueId version status activatedAt createdAt steps { ${STEP} }`

export async function fetchApprovalPoints(): Promise<PointSummary[]> {
  const d = await gql<{ approvalPoints: PointSummary[] }>(
    `{ approvalPoints { code module name description registered hasDraft pendingRequests activeVersion { ${VERSION} } } }`
  )
  return d.approvalPoints
}

export async function fetchApprovalPoint(code: string): Promise<{
  point: ApprovalPoint
  rules: { code: string; description: string }[]
}> {
  const d = await gql<{
    approvalPoint: ApprovalPoint
    assigneeRules: { code: string; description: string }[]
  }>(
    `query($c: String!) {
      approvalPoint(code: $c) { code module name description versions { ${VERSION} } }
      assigneeRules { code description }
    }`,
    { c: code }
  )
  return { point: d.approvalPoint, rules: d.assigneeRules }
}

export type StepInput = {
  code: string
  name: string
  approverType: ApproverType
  approverUniqueId?: string
  rule?: string
  mode: ApprovalMode
  requiredCount?: number
  allowDelegation: boolean
  condition?: string
  slaHours?: number
}

export async function saveChainDraft(pointCode: string, steps: StepInput[]) {
  await gql(
    `mutation($input: SaveChainInput!) { saveApprovalChainDraft(input: $input) { code } }`,
    { input: { pointCode, steps } }
  )
}

export async function discardChainDraft(pointCode: string) {
  await gql(
    `mutation($c: String!) { discardApprovalChainDraft(pointCode: $c) { code } }`,
    { c: pointCode }
  )
}

export async function activateChain(
  pointCode: string,
  versionUniqueId: string
) {
  await gql(
    `mutation($c: String!, $v: String!) { activateApprovalChain(pointCode: $c, versionUniqueId: $v) { code } }`,
    { c: pointCode, v: versionUniqueId }
  )
}

// ── exit clearance ─────────────────────────────────────────────────────────

export type ClearanceStatus = "OPEN" | "IN_APPROVAL" | "COMPLETED"

export type ExitClearance = {
  uniqueId: string
  status: ClearanceStatus
  createdAt: string
  completedAt: string | null
  signedOffBy: string | null
  approvalRequestUniqueId: string | null
  openItems: number
  employee: {
    uniqueId: string
    employeeNumber: string
    fullName: string
    companyEmail: string
    departmentName: string
    jobTitle: string
  }
  items: {
    uniqueId: string
    type: "CUSTODY" | "APPROVAL_TASK" | "REQUEST" | "PRODUCTION" | "OTHER"
    reference: string | null
    description: string
    resolved: boolean
    resolution: string | null
    resolvedBy: string | null
    resolvedAt: string | null
  }[]
}

const CLEARANCE = /* GraphQL */ `
  uniqueId status createdAt completedAt signedOffBy approvalRequestUniqueId openItems
  employee { uniqueId employeeNumber fullName companyEmail departmentName jobTitle }
  items { uniqueId type reference description resolved resolution resolvedBy resolvedAt }
`

export async function fetchExitClearances(
  status?: ClearanceStatus
): Promise<ExitClearance[]> {
  const d = await gql<{ exitClearances: ExitClearance[] }>(
    `query($s: ClearanceStatus) { exitClearances(status: $s) { ${CLEARANCE} } }`,
    { s: status }
  )
  return d.exitClearances
}

export async function fetchExitClearance(
  uniqueId: string
): Promise<ExitClearance> {
  const d = await gql<{ exitClearance: ExitClearance }>(
    `query($u: String!) { exitClearance(uniqueId: $u) { ${CLEARANCE} } }`,
    { u: uniqueId }
  )
  return d.exitClearance
}

export async function fetchEmployeeExitClearance(
  employeeUniqueId: string
): Promise<ExitClearance | null> {
  const d = await gql<{ employeeExitClearance: ExitClearance | null }>(
    `query($u: String!) { employeeExitClearance(employeeUniqueId: $u) { ${CLEARANCE} } }`,
    { u: employeeUniqueId }
  )
  return d.employeeExitClearance
}

export async function startExitClearance(employeeUniqueId: string) {
  const d = await gql<{ startExitClearance: ExitClearance }>(
    `mutation($u: String!) { startExitClearance(employeeUniqueId: $u) { ${CLEARANCE} } }`,
    { u: employeeUniqueId }
  )
  return d.startExitClearance
}

export async function resolveClearanceItem(
  itemUniqueId: string,
  action: "REASSIGN" | "CANCEL_REQUEST" | "RESOLVE",
  note?: string
) {
  const d = await gql<{ resolveExitClearanceItem: ExitClearance }>(
    `mutation($i: String!, $a: String!, $n: String) {
      resolveExitClearanceItem(itemUniqueId: $i, action: $a, note: $n) { ${CLEARANCE} }
    }`,
    { i: itemUniqueId, a: action, n: note }
  )
  return d.resolveExitClearanceItem
}

export async function submitExitClearance(uniqueId: string) {
  const d = await gql<{ submitExitClearance: ExitClearance }>(
    `mutation($u: String!) { submitExitClearance(uniqueId: $u) { ${CLEARANCE} } }`,
    { u: uniqueId }
  )
  return d.submitExitClearance
}
