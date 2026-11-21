import { api } from "./api"

/** B1 §7–§11 staff API (REST, bearer-authenticated). */

export type FileRef = { uniqueId: string; filename: string; uri: string }
export type Route = "CASH" | "SINGLE_SOURCE" | "QUOTATION"
export type LineRef = { purchaseRequestUniqueId: string; lineNo: number }

const get = async <T>(url: string, params?: Record<string, unknown>) =>
  (await api.get<T>(url, { params })).data
const post = async <T>(url: string, body?: unknown) =>
  (await api.post<T>(url, body ?? {})).data
const put = async <T>(url: string, body: unknown) =>
  (await api.put<T>(url, body)).data

// ── vendors ──────────────────────────────────────────────────────────────

export type VendorUser = {
  uniqueId: string
  fullName: string
  email: string
  phone: string | null
  isAdmin: boolean
  status: "PENDING_ACTIVATION" | "ACTIVE" | "DEACTIVATED"
  twoFactorEnabled: boolean
  lastLoginAt: string | null
}

export type Vendor = {
  uniqueId: string
  number: string
  name: string
  tin: string | null
  vrn: string | null
  address: string | null
  phone: string | null
  email: string
  contactPerson: string | null
  status: "ACTIVE" | "SUSPENDED" | "BLACKLISTED"
  statusReason: string | null
  registeredAt: string
  validUntil: string
  expired: boolean
  canBid: boolean
  note: string | null
  categories: { uniqueId: string; code: string; name: string }[]
  users: VendorUser[]
}

export type VendorInput = {
  name: string
  tin?: string | null
  vrn?: string | null
  address?: string | null
  phone?: string | null
  email: string
  contactPerson?: string | null
  categoryUniqueIds: string[]
  registeredAt?: string | null
  note?: string | null
}

export const fetchVendors = (search?: string, category?: string) =>
  get<Vendor[]>("/procurement/vendors", {
    search: search || undefined,
    category: category || undefined,
  })
export const fetchVendor = (id: string) =>
  get<Vendor>(`/procurement/vendors/${id}`)
export const createVendor = (input: VendorInput) =>
  post<Vendor>("/procurement/vendors", input)
export const updateVendor = (id: string, input: VendorInput) =>
  put<Vendor>(`/procurement/vendors/${id}`, input)
export const renewVendor = (id: string) =>
  post<Vendor>(`/procurement/vendors/${id}/renew`)
export const setVendorStatus = (
  id: string,
  status: Vendor["status"],
  reason: string
) => post<Vendor>(`/procurement/vendors/${id}/status`, { status, reason })
export const createVendorAdmin = (
  id: string,
  input: { fullName: string; email: string; phone?: string }
) =>
  post<{ user: VendorUser; devLink: string | null }>(
    `/procurement/vendors/${id}/admin-user`,
    input
  )
export const resendVendorActivation = (userId: string) =>
  post<{ devLink: string | null }>(`/procurement/vendor-users/${userId}/resend`)
export const setVendorUserActive = (userId: string, active: boolean) =>
  post(`/procurement/vendor-users/${userId}/active`, { active })
export const resetVendorUser2fa = (userId: string) =>
  post(`/procurement/vendor-users/${userId}/reset-2fa`)

// ── purchasing queue ─────────────────────────────────────────────────────

export type QueueLine = {
  purchaseRequestUniqueId: string
  purchaseRequestNumber: string
  department: string
  lineNo: number
  productUniqueId: string
  productCode: string | null
  productName: string
  categoryName: string
  unit: string
  quantity: number
  referencePrice: number | null
  estimate: number | null
  acquisitionMethod: "QUOTATION" | "SINGLE_SOURCE" | null
  singleSourceVendor: { uniqueId: string; name: string } | null
  route: Route | null
  suggestedRoute: Route
  sourcingStatus: "OPEN" | "JUSTIFICATION"
  justification: string | null
  justificationStatus: string | null
  justificationApprovalUniqueId: string | null
}

export const fetchQueue = () => get<QueueLine[]>("/procurement/queue")
export const setRoute = (
  lines: LineRef[],
  route: Route,
  justification?: string,
  fileUniqueId?: string
) =>
  post<QueueLine[]>("/procurement/routes", {
    lines,
    route,
    justification,
    fileUniqueId,
  })

// ── tenders ──────────────────────────────────────────────────────────────

export type TenderStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "CLOSED"
  | "OPENED"
  | "EVALUATION"
  | "AWARD_APPROVAL"
  | "AWARDED"
  | "CANCELLED"

export type TenderSummary = {
  uniqueId: string
  number: string
  title: string
  route: Route
  status: TenderStatus
  closingAt: string | null
  lineCount: number
  invited: number
  submittedBids: number
  createdAt: string
  isMember: boolean
}

export type Offer = {
  bidLineId: number
  vendorName: string
  vendorUniqueId: string
  unitPrice: number
  unitPriceExclVat: number
  unitVat: number
  lineTotal: number
  negotiatedPrice: number | null
  negotiatedDays: number | null
  negotiationNote: string | null
  deliveryDays: number
  brand: string | null
  model: string | null
  countryOfOrigin: string | null
  compliance: { spec: string; complies: boolean; offered: string | null }[]
  files: FileRef[]
  compliant: boolean | null
  disqualifyReason: string | null
  overrideReason: string | null
  rank: number | null
  isWinner: boolean
}

export type Tender = {
  uniqueId: string
  number: string
  title: string
  route: Route
  status: TenderStatus
  description: string | null
  deliveryTerms: string | null
  terms: string | null
  closingAt: string | null
  bidValidityDays: number
  createdBy: string
  createdAt: string
  publishedAt: string | null
  closedAt: string | null
  openedAt: string | null
  awardedAt: string | null
  lettersSentAt: string | null
  cancelReason: string | null
  evaluationNote: string | null
  singleSourceVendor: string | null
  awardApprovalUniqueId: string | null
  openingQuorum: number | null
  invited: { uniqueId: string; name: string }[]
  sealedBids: number
  committee: {
    userUniqueId: string
    name: string
    department: string
    isChair: boolean
    coiDeclared: boolean
    coiStatement: string | null
    openingConfirmed: boolean
  }[]
  lines: {
    lineNo: number
    productUniqueId: string
    productCode: string | null
    productName: string
    categoryName: string
    unit: string
    quantity: number
    vatRate: number
    specs: string[]
    status: string
    tie: boolean
    awardReason: string | null
    awardBidLineId: number | null
    sources: {
      purchaseRequestUniqueId: string
      purchaseRequestNumber: string
      lineNo: number
      quantity: number
    }[]
    offers: Offer[]
  }[]
  clarifications: {
    uniqueId: string
    question: string
    answer: string | null
    askedAt: string
    answeredAt: string | null
  }[]
  addenda: {
    number: number
    text: string
    newClosingAt: string | null
    file: FileRef | null
    createdAt: string
  }[]
  can: {
    edit: boolean
    publish: boolean
    appointCommittee: boolean
    answer: boolean
    addendum: boolean
    cancel: boolean
    declareCoi: boolean
    confirmOpening: boolean
    evaluate: boolean
    negotiate: boolean
    submitAward: boolean
    sendLetters: boolean
    createOrders: boolean
    viewBids: boolean
  }
  isMember: boolean
}

export type TenderInput = {
  title: string
  description?: string | null
  deliveryTerms?: string | null
  terms?: string | null
  closingAt?: string | null
  bidValidityDays?: number | null
}

export const fetchTenders = (status?: string) =>
  get<TenderSummary[]>("/procurement/tenders", { status })
export const fetchTender = (id: string) =>
  get<Tender>(`/procurement/tenders/${id}`)
export const createTender = (
  lines: LineRef[],
  route: Route,
  input: TenderInput
) => post<Tender>("/procurement/tenders", { ...input, lines, route })
export const updateTender = (id: string, input: TenderInput) =>
  put<Tender>(`/procurement/tenders/${id}`, input)
export const fetchCommitteeCandidates = () =>
  get<{ uniqueId: string; name: string; email: string; department: string }[]>(
    "/procurement/committee-candidates"
  )
export const appointCommittee = (
  id: string,
  userUniqueIds: string[],
  chairUniqueId?: string
) =>
  post<Tender>(`/procurement/tenders/${id}/committee`, {
    userUniqueIds,
    chairUniqueId,
  })
export const declareCoi = (
  id: string,
  noConflict: boolean,
  statement: string
) => post<Tender>(`/procurement/tenders/${id}/coi`, { noConflict, statement })
export const publishTender = (id: string) =>
  post<Tender>(`/procurement/tenders/${id}/publish`)
export const answerClarification = (cid: string, answer: string) =>
  post<Tender>(`/procurement/clarifications/${cid}/answer`, { answer })
export const issueAddendum = (
  id: string,
  text: string,
  newClosingAt?: string,
  fileUniqueId?: string
) =>
  post<Tender>(`/procurement/tenders/${id}/addendum`, {
    text,
    newClosingAt,
    fileUniqueId,
  })
export const cancelTender = (id: string, reason: string) =>
  post<Tender>(`/procurement/tenders/${id}/cancel`, { reason })
export const confirmOpening = (id: string) =>
  post<Tender>(`/procurement/tenders/${id}/confirm-opening`)
export const overrideCompliance = (
  id: string,
  bidLineId: number,
  compliant: boolean,
  reason: string
) =>
  post<Tender>(`/procurement/tenders/${id}/override`, {
    bidLineId,
    compliant,
    reason,
  })
export const chooseWinner = (
  id: string,
  lineNo: number,
  bidLineId: number | null,
  reason: string
) =>
  post<Tender>(`/procurement/tenders/${id}/winner`, {
    lineNo,
    bidLineId,
    reason,
  })
export const negotiate = (
  id: string,
  bidLineId: number,
  price: number | null,
  days: number | null,
  note: string
) =>
  post<Tender>(`/procurement/tenders/${id}/negotiate`, {
    bidLineId,
    price,
    days,
    note,
  })
export const saveEvaluationNote = (id: string, note: string) =>
  post<Tender>(`/procurement/tenders/${id}/evaluation-note`, { note })
export const submitAward = (id: string) =>
  post<Tender>(`/procurement/tenders/${id}/submit-award`)
export const sendLetters = (id: string) =>
  post<Tender>(`/procurement/tenders/${id}/letters`)
export const createOrdersFromAward = (id: string) =>
  post<Order[]>(`/procurement/tenders/${id}/orders`)

// ── LPOs ─────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "DRAFT"
  | "IN_APPROVAL"
  | "ISSUED"
  | "ACKNOWLEDGED"
  | "AMENDMENT_PENDING"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CLOSED"
  | "CANCELLED"

export type OrderSnapshot = {
  deliveryDate: string | null
  instructions: string | null
  lines: {
    lineNo: number
    quantity: number
    unitPrice: number
    description: string | null
  }[]
}

export type Order = {
  uniqueId: string
  number: string
  kind: "TENDER" | "CASH"
  status: OrderStatus
  revision: number
  vendor: {
    uniqueId: string
    name: string
    number: string
    email: string
    tin: string | null
    address: string | null
  } | null
  shopName: string | null
  tender: { uniqueId: string; number: string; title: string } | null
  store: { uniqueId: string; name: string; address: string | null }
  deliveryDate: string | null
  overdue: boolean
  instructions: string | null
  issuedAt: string | null
  acknowledgedAt: string | null
  acknowledgedBy: string | null
  cancelReason: string | null
  cancelledAt: string | null
  createdAt: string
  totalInclVat: number
  totalVat: number
  totalExclVat: number
  lines: {
    lineNo: number
    productUniqueId: string
    productCode: string | null
    productName: string
    owningDepartment: string
    trackingType: "SERIALISED" | "QUANTITY" | "BATCH" | null
    unit: string
    description: string | null
    brand: string | null
    model: string | null
    quantity: number
    unitPrice: number
    vatRate: number
    lineTotal: number
    lineExclVat: number
    lineVat: number
    awardedUnitPrice: number | null
    awardedQuantity: number | null
    receivedQty: number
    passedQty: number
    failedQty: number
    outstandingQty: number
  }[]
  receipts: FileRef[]
  approvalUniqueId: string | null
  cancelApprovalUniqueId: string | null
  amendments: {
    uniqueId: string
    revision: number
    status:
      | "IN_APPROVAL"
      | "AWAITING_ACKNOWLEDGEMENT"
      | "APPLIED"
      | "REJECTED"
      | "CANCELLED"
    reason: string
    increasesValue: boolean
    before: OrderSnapshot
    after: OrderSnapshot
    createdAt: string
    appliedAt: string | null
    approvalUniqueId: string | null
  }[]
  grns: {
    uniqueId: string
    number: string
    status: string
    receivedAt: string
  }[]
  invoices: {
    uniqueId: string
    vendorInvoiceNo: string
    status: string
    amountInclVat: number
  }[]
  can: {
    edit: boolean
    issue: boolean
    amend: boolean
    cancel: boolean
    receive: boolean
    registerInvoice: boolean
    acknowledge: boolean
  }
}

export const fetchOrders = (status?: string) =>
  get<Order[]>("/procurement/orders", { status })
export const fetchOrder = (id: string) =>
  get<Order>(`/procurement/orders/${id}`)
export const updateOrder = (
  id: string,
  input: { deliveryDate?: string | null; instructions?: string | null }
) => put<Order>(`/procurement/orders/${id}`, input)
export const issueOrder = (id: string) =>
  post<Order>(`/procurement/orders/${id}/issue`)
export const amendOrder = (
  id: string,
  input: {
    reason: string
    deliveryDate?: string | null
    instructions?: string | null
    lines: {
      lineNo: number
      quantity: number
      unitPrice: number
      description?: string | null
    }[]
  }
) => post<Order>(`/procurement/orders/${id}/amend`, input)
export const cancelOrder = (id: string, reason: string, reaward: boolean) =>
  post<Order>(`/procurement/orders/${id}/cancel`, { reason, reaward })
export const recordCashPurchase = (input: {
  vendorUniqueId?: string | null
  shopName?: string | null
  purchaseDate?: string | null
  receiptFileUniqueIds: string[]
  lines: (LineRef & { quantity: number; unitPrice: number })[]
}) => post<Order>("/procurement/cash-purchases", input)

// ── receiving / inspection ───────────────────────────────────────────────

export type Grn = {
  uniqueId: string
  number: string
  status: "PENDING_INSPECTION" | "INSPECTED" | "COMPLETED"
  order: { uniqueId: string; number: string; kind: string }
  vendor: string
  store: string
  deliveryNoteNo: string | null
  deliveryNote: FileRef | null
  note: string | null
  receivedBy: string
  receivedAt: string
  lines: {
    lineNo: number
    productName: string
    ordered: number
    deliveredQty: number
    receivedQty: number
    rejectedQty: number
    rejectReason: string | null
    photos: FileRef[]
    batchNumber: string | null
    expiryDate: string | null
    serialNumbers: string[]
    inspection: {
      uniqueId: string
      number: string
      status: string
      passedQty: number
      failedQty: number
    } | null
  }[]
}

export type GrnInput = {
  deliveryNoteNo?: string | null
  deliveryNoteFileUniqueId?: string | null
  note?: string | null
  lines: {
    lineNo: number
    deliveredQty: number
    rejectedQty?: number
    rejectReason?: string | null
    photoFileUniqueIds?: string[]
    batchNumber?: string | null
    expiryDate?: string | null
    serialNumbers?: string[]
    warrantyMonths?: number | null
  }[]
}

export const receiveGoods = (orderId: string, input: GrnInput) =>
  post<Grn>(`/procurement/orders/${orderId}/grn`, input)
export const fetchGrns = () => get<Grn[]>("/procurement/grns")
export const fetchGrn = (id: string) => get<Grn>(`/procurement/grns/${id}`)

export type Inspection = {
  uniqueId: string
  number: string
  status: "PENDING" | "IN_PROGRESS" | "PASSED" | "FAILED" | "PARTIALLY_PASSED"
  department: string
  grn: { uniqueId: string; number: string; receivedAt: string }
  order: { uniqueId: string; number: string }
  vendor: string
  productUniqueId: string
  productName: string
  productVersion: number
  trackingType: "SERIALISED" | "QUANTITY" | "BATCH" | null
  receivedQty: number
  serialNumbers: string[]
  batchNumber: string | null
  criteria: { id: number; text: string }[]
  results: {
    criterionId: number
    text: string
    pass: boolean
    remark: string | null
  }[]
  passedQty: number
  failedQty: number
  failedSerials: string[]
  remarks: string | null
  assignedTo: string | null
  inspectedBy: string | null
  completedAt: string | null
  returnedToVendorAt: string | null
  createdAt: string
  can: { inspect: boolean; assign: boolean; returnToVendor: boolean }
}

export const fetchInspections = (open?: boolean, grn?: string) =>
  get<Inspection[]>("/procurement/inspections", {
    open: open ? "true" : undefined,
    grn,
  })
export const fetchInspection = (id: string) =>
  get<Inspection>(`/procurement/inspections/${id}`)
export const fetchInspectors = (id: string) =>
  get<{ uniqueId: string; name: string; email: string }[]>(
    `/procurement/inspections/${id}/inspectors`
  )
export const assignInspector = (id: string, userUniqueId: string) =>
  post<Inspection>(`/procurement/inspections/${id}/assign`, { userUniqueId })
export const performInspection = (
  id: string,
  input: {
    results: { criterionId: number; pass: boolean; remark?: string | null }[]
    passedQty: number
    failedSerials?: string[]
    remarks?: string | null
    putawayLocationUniqueId?: string | null
  }
) => post<Inspection>(`/procurement/inspections/${id}/inspect`, input)
export const returnToVendor = (id: string, note: string) =>
  post<Inspection>(`/procurement/inspections/${id}/return-to-vendor`, { note })

// ── finance ──────────────────────────────────────────────────────────────

export type Invoice = {
  uniqueId: string
  order: { uniqueId: string; number: string; status: OrderStatus }
  vendor: string
  vendorInvoiceNo: string
  invoiceDate: string
  amountInclVat: number
  vatAmount: number
  amountExclVat: number
  file: FileRef | null
  status: "REGISTERED" | "IN_APPROVAL" | "APPROVED" | "REJECTED" | "PAID"
  note: string | null
  registeredBy: string | null
  createdAt: string
  approvalUniqueId: string | null
  paymentReference: string | null
  paidAt: string | null
  paidAmount: number | null
  paymentFiles: FileRef[]
  paymentBy: string | null
  match: {
    ordered: number
    received: number
    invoiced: number
    paid: number
    matched: boolean
    overInvoiced: boolean
    lines: {
      lineNo: number
      ordered: number
      received: number
      passed: number
      unitPrice: number
    }[]
  }
  can: { requestPayment: boolean; recordPayment: boolean }
}

export const fetchInvoices = () => get<Invoice[]>("/procurement/invoices")
export const fetchInvoice = (id: string) =>
  get<Invoice>(`/procurement/invoices/${id}`)
export const registerInvoice = (
  orderId: string,
  input: {
    vendorInvoiceNo: string
    invoiceDate: string
    amountInclVat: number
    vatAmount: number
    fileUniqueId?: string | null
    note?: string | null
  }
) => post<Invoice>(`/procurement/orders/${orderId}/invoices`, input)
export const requestPayment = (id: string) =>
  post<Invoice>(`/procurement/invoices/${id}/request-payment`)
export const recordPayment = (
  id: string,
  input: {
    reference: string
    paidAt: string
    amount: number
    fileUniqueIds: string[]
  }
) => post<Invoice>(`/procurement/invoices/${id}/payment`, input)

// ── purchase file / documents ────────────────────────────────────────────

export type ProcDocument = {
  subjectType: string
  docType: string
  file: FileRef
  uploadedBy: string
  createdAt: string
}
export type PurchaseFile = {
  purchaseRequestUniqueId: string
  number: string
  events: {
    at: string
    kind: string
    title: string
    detail?: string | null
    actor?: string | null
    link?: string | null
  }[]
  documents: ProcDocument[]
}

export const fetchPurchaseFile = (prId: string) =>
  get<PurchaseFile>(`/procurement/purchase-file/${prId}`)
export const fetchDocuments = (type: string, id: string) =>
  get<ProcDocument[]>(`/procurement/documents/${type}/${id}`)
export const attachDocument = (
  type: string,
  id: string,
  docType: string,
  fileUniqueId: string
) =>
  post<ProcDocument[]>(`/procurement/documents/${type}/${id}`, {
    docType,
    fileUniqueId,
  })
