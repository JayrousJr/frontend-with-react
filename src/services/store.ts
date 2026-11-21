import { gql } from "./api"

export type StoreType = "MAIN" | "SUB"
export type LocationKind = "GENERAL" | "RECEIVING" | "REJECTED" | "IN_TRANSIT"
export type AssetStatus =
  | "IN_QUARANTINE"
  | "IN_STORE"
  | "RESERVED"
  | "CHECKED_OUT_TO_PRODUCTION"
  | "ASSIGNED_TO_EMPLOYEE"
  | "IN_TRANSIT"
  | "UNDER_MAINTENANCE"
  | "AT_VENDOR_FOR_REPAIR"
  | "MISSING"
  | "DAMAGED"
  | "LOST"
  | "PENDING_DISPOSAL"
  | "DISPOSED"
export const ASSET_STATUSES: AssetStatus[] = [
  "IN_QUARANTINE",
  "IN_STORE",
  "RESERVED",
  "CHECKED_OUT_TO_PRODUCTION",
  "ASSIGNED_TO_EMPLOYEE",
  "IN_TRANSIT",
  "UNDER_MAINTENANCE",
  "AT_VENDOR_FOR_REPAIR",
  "MISSING",
  "DAMAGED",
  "LOST",
  "PENDING_DISPOSAL",
  "DISPOSED",
]
export type AssetCondition =
  "GOOD" | "FAIR" | "NEEDS_REPAIR" | "UNDER_REPAIR" | "BEYOND_REPAIR"
export const CONDITIONS: AssetCondition[] = [
  "GOOD",
  "FAIR",
  "NEEDS_REPAIR",
  "UNDER_REPAIR",
  "BEYOND_REPAIR",
]
export type AdjustmentType =
  "OPENING_BALANCE" | "FOUND" | "DONATED" | "COUNT_VARIANCE" | "CORRECTION"
export type AdjustmentStatus =
  "DRAFT" | "IN_APPROVAL" | "APPROVED" | "RETURNED" | "REJECTED" | "CANCELLED"

export type Ref = { uniqueId: string; code: string; name: string }

export type StoreLocation = {
  uniqueId: string
  code: string
  name: string
  kind: LocationKind
  isActive: boolean
  parentUniqueId: string | null
  path: string
}

export type Store = Ref & {
  type: StoreType
  address: string | null
  isActive: boolean
  managingDepartment: Ref
  locations: StoreLocation[]
  storekeepers: { uniqueId: string; fullName: string; email: string }[]
  assetCount: number
}

export type StockSetting = {
  productUniqueId: string
  productCode: string | null
  productName: string
  unit: string
  minLevel: number
  reorderLevel: number
  maxLevel: number | null
  defaultLocationUniqueId: string | null
}

export type StockLevel = {
  store: Ref
  productUniqueId: string
  productCode: string | null
  productName: string
  categoryName: string
  departmentName: string
  unit: string
  serialised: boolean
  onHand: number
  quarantine: number
  reserved: number
  available: number
  out: number
  inTransit: number
  reorderLevel: number | null
  belowReorder: boolean
}

export type Vehicle = {
  registrationNumber: string
  chassisNumber: string | null
  engineNumber: string | null
  fuelType: string | null
  seatingCapacity: number | null
  insuranceExpiry: string | null
  roadLicenceExpiry: string | null
  serviceIntervalKm: number | null
  serviceIntervalMonths: number | null
}

export type AssetComponent = {
  uniqueId: string
  tag: string
  productName: string
  status: AssetStatus
  condition: AssetCondition
}

export type Asset = {
  uniqueId: string
  tag: string
  serialNumber: string | null
  brand: string | null
  model: string | null
  product: {
    uniqueId: string
    code: string | null
    name: string
    categoryName: string
    version: number
    isVehicle: boolean
  }
  owningDepartment: Ref
  source: "PURCHASE" | "OPENING_BALANCE" | "FOUND" | "DONATED"
  lpoRef: string | null
  grnRef: string | null
  inspectionRef: string | null
  vendorRef: string | null
  purchasePrice: number | null
  priceEstimated: boolean
  purchaseDate: string | null
  warrantyExpiry: string | null
  store: Ref | null
  location: StoreLocation | null
  custodian: {
    uniqueId: string
    employeeNumber: string
    fullName: string
  } | null
  condition: AssetCondition
  status: AssetStatus
  isKit: boolean
  parent: AssetComponent | null
  components: AssetComponent[]
  vehicle: Vehicle | null
  notes: string | null
  createdAt: string
  canEdit: boolean
}

export type AssetFilter = {
  search?: string
  storeUniqueId?: string
  statuses?: AssetStatus[]
  categoryUniqueId?: string
  departmentUniqueId?: string
  productUniqueId?: string
  vehiclesOnly?: boolean
}

export type Movement = {
  uniqueId: string
  type: string
  at: string
  user: string | null
  store: Ref
  location: string | null
  toLocation: string | null
  productName: string
  productCode: string | null
  assetTag: string | null
  assetUniqueId: string | null
  batchNumber: string | null
  quantity: number
  fromStatus: AssetStatus | null
  toStatus: AssetStatus | null
  condition: AssetCondition | null
  referenceType: string | null
  referenceId: string | null
  reason: string | null
}

export type AssetTag = {
  tag: string
  prefix: string
  number: number
  issuedAt: string
  printedAt: string | null
}

export type AdjustmentLine = {
  lineNo: number
  productUniqueId: string
  productCode: string | null
  productName: string
  location: string
  quantity: number
  batchNumber: string | null
  expiryDate: string | null
  tag: string | null
  serialNumber: string | null
  brand: string | null
  model: string | null
  condition: AssetCondition | null
  holder: string | null
  kitTag: string | null
  assetUniqueId: string | null
}

export type Adjustment = {
  uniqueId: string
  number: string
  type: AdjustmentType
  status: AdjustmentStatus
  store: Ref
  reason: string
  createdBy: string
  createdAt: string
  postedAt: string | null
  postError: string | null
  approvalRequestUniqueId: string | null
  lineCount: number
  assetCount: number
  quantityTotal: number
  lines: AdjustmentLine[]
  canResubmit: boolean
  canCancel: boolean
}

export type AdjustmentLineInput = {
  productUniqueId: string
  locationUniqueId: string
  quantity: number
  batchNumber?: string | null
  expiryDate?: string | null
  asset?: {
    tag?: string | null
    serialNumber?: string | null
    brand?: string | null
    model?: string | null
    condition: AssetCondition
    purchaseDate?: string | null
    purchasePrice?: number | null
    priceEstimated?: boolean
    warrantyExpiry?: string | null
    notes?: string | null
    vehicle?: Partial<Vehicle> & { registrationNumber: string }
  }
}

const REF = "uniqueId code name"
const LOCATION = "uniqueId code name kind isActive parentUniqueId path"
const STORE = /* GraphQL */ `
  ${REF} type address isActive assetCount
  managingDepartment { ${REF} }
  locations { ${LOCATION} }
  storekeepers { uniqueId fullName email }
`
const COMPONENT = "uniqueId tag productName status condition"
const ASSET = /* GraphQL */ `
  uniqueId tag serialNumber brand model source lpoRef grnRef inspectionRef
  vendorRef purchasePrice priceEstimated purchaseDate warrantyExpiry condition
  status isKit notes createdAt canEdit
  product { uniqueId code name categoryName version isVehicle }
  owningDepartment { ${REF} }
  store { ${REF} }
  location { ${LOCATION} }
  custodian { uniqueId employeeNumber fullName }
  parent { ${COMPONENT} }
  components { ${COMPONENT} }
  vehicle {
    registrationNumber chassisNumber engineNumber fuelType seatingCapacity
    insuranceExpiry roadLicenceExpiry serviceIntervalKm serviceIntervalMonths
  }
`
const LEVEL = /* GraphQL */ `
  store { ${REF} } productUniqueId productCode productName categoryName
  departmentName unit serialised onHand quarantine reserved available out
  inTransit reorderLevel belowReorder
`
const MOVEMENT = /* GraphQL */ `
  uniqueId type at user store { ${REF} } location toLocation productName
  productCode assetTag assetUniqueId batchNumber quantity fromStatus toStatus
  condition referenceType referenceId reason
`
const ADJUSTMENT = /* GraphQL */ `
  uniqueId number type status reason createdBy createdAt postedAt postError
  approvalRequestUniqueId lineCount assetCount quantityTotal canResubmit
  canCancel store { ${REF} }
`
const ADJUSTMENT_LINES = /* GraphQL */ `
  lines {
    lineNo productUniqueId productCode productName location quantity
    batchNumber expiryDate tag serialNumber brand model condition holder
    kitTag assetUniqueId
  }
`

export async function fetchStores(includeInactive = false) {
  const d = await gql<{ stores: Store[] }>(
    `query($i: Boolean) { stores(includeInactive: $i) { ${STORE} } }`,
    { i: includeInactive }
  )
  return d.stores
}

export async function fetchStore(uniqueId: string) {
  const d = await gql<{ store: Store }>(
    `query($u: String!) { store(uniqueId: $u) { ${STORE} } }`,
    { u: uniqueId }
  )
  return d.store
}

export async function saveStore(input: {
  uniqueId?: string
  code: string
  name: string
  type: StoreType
  managingDepartmentUniqueId: string
  address?: string | null
  isActive: boolean
}) {
  const d = await gql<{ saveStore: Store }>(
    `mutation($i: SaveStoreInput!) { saveStore(input: $i) { ${STORE} } }`,
    { i: input }
  )
  return d.saveStore
}

export async function saveLocation(input: {
  storeUniqueId: string
  uniqueId?: string
  parentUniqueId?: string | null
  code: string
  name: string
  isActive: boolean
}) {
  const d = await gql<{ saveStoreLocation: Store }>(
    `mutation($i: SaveLocationInput!) { saveStoreLocation(input: $i) { ${STORE} } }`,
    { i: input }
  )
  return d.saveStoreLocation
}

const SETTING =
  "productUniqueId productCode productName unit minLevel reorderLevel maxLevel defaultLocationUniqueId"

export async function fetchStockSettings(storeUniqueId: string) {
  const d = await gql<{ stockSettings: StockSetting[] }>(
    `query($s: String!) { stockSettings(storeUniqueId: $s) { ${SETTING} } }`,
    { s: storeUniqueId }
  )
  return d.stockSettings
}

export async function saveStockSetting(input: {
  storeUniqueId: string
  productUniqueId: string
  minLevel: number
  reorderLevel: number
  maxLevel?: number | null
  defaultLocationUniqueId?: string | null
}) {
  const d = await gql<{ saveStockSetting: StockSetting[] }>(
    `mutation($i: StockSettingInput!) { saveStockSetting(input: $i) { ${SETTING} } }`,
    { i: input }
  )
  return d.saveStockSetting
}

export async function fetchStockLevels(filter: {
  storeUniqueId?: string
  categoryUniqueId?: string
  search?: string
  belowReorderOnly?: boolean
}) {
  const d = await gql<{ stockLevels: StockLevel[] }>(
    `query($f: StockLevelFilterInput) { stockLevels(filter: $f) { ${LEVEL} } }`,
    { f: filter }
  )
  return d.stockLevels
}

export async function fetchMovements(
  filter: {
    storeUniqueId?: string
    productUniqueId?: string
    assetUniqueId?: string
  },
  page = 1,
  limit = 50
) {
  const d = await gql<{ stockMovements: Movement[] }>(
    `query($f: MovementFilterInput, $p: Int, $l: Int) { stockMovements(filter: $f, page: $p, limit: $l) { ${MOVEMENT} } }`,
    { f: filter, p: page, l: limit }
  )
  return d.stockMovements
}

export async function fetchAssets(
  filter: AssetFilter = {},
  page = 1,
  limit = 20
) {
  const d = await gql<{
    assets: {
      data: Asset[]
      total: number
      page: number
      limit: number
      totalPages: number
    }
  }>(
    `query($f: AssetFilterInput, $p: Int, $l: Int) { assets(filter: $f, page: $p, limit: $l) { data { ${ASSET} } total page limit totalPages } }`,
    { f: filter, p: page, l: limit }
  )
  return d.assets
}

export async function fetchAsset(uniqueId: string) {
  const d = await gql<{ asset: Asset }>(
    `query($u: String!) { asset(uniqueId: $u) { ${ASSET} } }`,
    { u: uniqueId }
  )
  return d.asset
}

export async function fetchAssetByTag(tag: string) {
  const d = await gql<{ assetByTag: Asset | null }>(
    `query($t: String!) { assetByTag(tag: $t) { ${ASSET} } }`,
    { t: tag }
  )
  return d.assetByTag
}

export async function updateAsset(input: {
  uniqueId: string
  serialNumber?: string | null
  brand?: string | null
  model?: string | null
  warrantyExpiry?: string | null
  notes?: string | null
  vehicle?: (Partial<Vehicle> & { registrationNumber: string }) | null
  reason: string
}) {
  const d = await gql<{ updateAsset: Asset }>(
    `mutation($i: UpdateAssetInput!) { updateAsset(input: $i) { ${ASSET} } }`,
    { i: input }
  )
  return d.updateAsset
}

export async function moveAssetLocation(
  uniqueId: string,
  locationUniqueId: string
) {
  const d = await gql<{ moveAssetLocation: Asset }>(
    `mutation($u: String!, $l: String!) { moveAssetLocation(uniqueId: $u, locationUniqueId: $l) { ${ASSET} } }`,
    { u: uniqueId, l: locationUniqueId }
  )
  return d.moveAssetLocation
}

const TAG = "tag prefix number issuedAt printedAt"

export async function issueTags(categoryUniqueId: string, count: number) {
  const d = await gql<{ issueAssetTags: AssetTag[] }>(
    `mutation($c: String!, $n: Int!) { issueAssetTags(categoryUniqueId: $c, count: $n) { ${TAG} } }`,
    { c: categoryUniqueId, n: count }
  )
  return d.issueAssetTags
}

export async function fetchUnusedTags(prefix?: string) {
  const d = await gql<{ unusedAssetTags: AssetTag[] }>(
    `query($p: String) { unusedAssetTags(prefix: $p) { ${TAG} } }`,
    { p: prefix }
  )
  return d.unusedAssetTags
}

export async function markTagsPrinted(tags: string[]) {
  const d = await gql<{ markTagsPrinted: number }>(
    `mutation($t: [String!]!) { markTagsPrinted(tags: $t) }`,
    { t: tags }
  )
  return d.markTagsPrinted
}

export async function fetchAdjustments(
  storeUniqueId?: string,
  status?: AdjustmentStatus
) {
  const d = await gql<{ stockAdjustments: Adjustment[] }>(
    `query($s: String, $st: AdjustmentStatus) { stockAdjustments(storeUniqueId: $s, status: $st) { ${ADJUSTMENT} } }`,
    { s: storeUniqueId, st: status }
  )
  return d.stockAdjustments
}

export async function fetchAdjustment(uniqueId: string) {
  const d = await gql<{ stockAdjustment: Adjustment }>(
    `query($u: String!) { stockAdjustment(uniqueId: $u) { ${ADJUSTMENT} ${ADJUSTMENT_LINES} } }`,
    { u: uniqueId }
  )
  return d.stockAdjustment
}

export async function createAdjustment(input: {
  storeUniqueId: string
  type: AdjustmentType
  reason: string
  lines: AdjustmentLineInput[]
}) {
  const d = await gql<{ createStockAdjustment: Adjustment }>(
    `mutation($i: CreateAdjustmentInput!) { createStockAdjustment(input: $i) { ${ADJUSTMENT} ${ADJUSTMENT_LINES} } }`,
    { i: input }
  )
  return d.createStockAdjustment
}

const adjustmentMutation =
  (name: string, withReason = false) =>
  async (uniqueId: string, reason?: string): Promise<Adjustment> => {
    const d = await gql<Record<string, Adjustment>>(
      withReason
        ? `mutation($u: String!, $r: String!) { ${name}(uniqueId: $u, reason: $r) { ${ADJUSTMENT} ${ADJUSTMENT_LINES} } }`
        : `mutation($u: String!) { ${name}(uniqueId: $u) { ${ADJUSTMENT} ${ADJUSTMENT_LINES} } }`,
      withReason ? { u: uniqueId, r: reason } : { u: uniqueId }
    )
    return d[name]
  }

export const resubmitAdjustment = adjustmentMutation("resubmitStockAdjustment")
export const cancelAdjustment = adjustmentMutation(
  "cancelStockAdjustment",
  true
)
export const retryPostAdjustment = adjustmentMutation(
  "retryPostStockAdjustment"
)

// ── transfers ──

export type TransferStatus =
  | "REQUESTED"
  | "APPROVED"
  | "DISPATCHED"
  | "DISCREPANCY"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED"
export type TransferReason =
  "RESTOCK" | "DELIVERY" | "PRODUCTION" | "CONSOLIDATION" | "REPAIR"
export const TRANSFER_REASONS: TransferReason[] = [
  "RESTOCK",
  "DELIVERY",
  "PRODUCTION",
  "CONSOLIDATION",
  "REPAIR",
]

export type TransferLine = {
  lineNo: number
  productUniqueId: string
  productCode: string | null
  productName: string
  assetUniqueId: string | null
  assetTag: string | null
  components: string[]
  batchNumber: string | null
  quantity: number
  fromLocation: string | null
  dispatchedQty: number | null
  dispatchCondition: AssetCondition | null
  receivedQty: number | null
  receivedCondition: AssetCondition | null
  toLocation: string | null
  note: string | null
}

export type Transfer = {
  uniqueId: string
  number: string
  status: TransferStatus
  reason: TransferReason
  note: string | null
  problem: string | null
  fromStore: Ref
  toStore: Ref
  requestedBy: string
  dispatchedBy: string | null
  dispatchedAt: string | null
  carriedBy: string | null
  vehicle: string | null
  expectedArrival: string | null
  receivedBy: string | null
  receivedAt: string | null
  discrepancyNote: string | null
  createdAt: string
  approvalRequestUniqueId: string | null
  discrepancyRequestUniqueId: string | null
  lineCount: number
  overdue: boolean
  lines: TransferLine[]
  can: { dispatch: boolean; receive: boolean; cancel: boolean }
}

const TRANSFER = /* GraphQL */ `
  uniqueId number status reason note problem requestedBy dispatchedBy
  dispatchedAt carriedBy vehicle expectedArrival receivedBy receivedAt
  discrepancyNote createdAt approvalRequestUniqueId discrepancyRequestUniqueId
  lineCount overdue
  fromStore { ${REF} } toStore { ${REF} }
  can { dispatch receive cancel }
`
const TRANSFER_LINES = /* GraphQL */ `
  lines {
    lineNo productUniqueId productCode productName assetUniqueId assetTag
    components batchNumber quantity fromLocation dispatchedQty
    dispatchCondition receivedQty receivedCondition toLocation note
  }
`

export async function fetchTransfers(
  storeUniqueId?: string,
  statuses?: TransferStatus[]
) {
  const d = await gql<{ transfers: Transfer[] }>(
    `query($s: String, $st: [TransferStatus!]) { transfers(storeUniqueId: $s, statuses: $st) { ${TRANSFER} } }`,
    { s: storeUniqueId, st: statuses }
  )
  return d.transfers
}

export async function fetchTransfer(uniqueId: string) {
  const d = await gql<{ transfer: Transfer }>(
    `query($u: String!) { transfer(uniqueId: $u) { ${TRANSFER} ${TRANSFER_LINES} } }`,
    { u: uniqueId }
  )
  return d.transfer
}

export async function createTransfer(input: {
  fromStoreUniqueId: string
  toStoreUniqueId: string
  reason: TransferReason
  note?: string | null
  lines: {
    assetUniqueId?: string
    productUniqueId?: string
    fromLocationUniqueId?: string
    batchNumber?: string | null
    quantity?: number
  }[]
}) {
  const d = await gql<{ createTransfer: Transfer }>(
    `mutation($i: CreateTransferInput!) { createTransfer(input: $i) { ${TRANSFER} } }`,
    { i: input }
  )
  return d.createTransfer
}

export async function dispatchTransfer(
  uniqueId: string,
  input: {
    lines: {
      lineNo: number
      quantity: number
      condition?: AssetCondition | null
      note?: string | null
    }[]
    carriedBy?: string | null
    vehicleAssetUniqueId?: string | null
    expectedArrival?: string | null
  }
) {
  const d = await gql<{ dispatchTransfer: Transfer }>(
    `mutation($u: String!, $i: DispatchTransferInput!) { dispatchTransfer(uniqueId: $u, input: $i) { ${TRANSFER} ${TRANSFER_LINES} } }`,
    { u: uniqueId, i: input }
  )
  return d.dispatchTransfer
}

export async function receiveTransfer(
  uniqueId: string,
  input: {
    lines: {
      lineNo: number
      quantity: number
      condition?: AssetCondition | null
      toLocationUniqueId?: string | null
      note?: string | null
    }[]
    note?: string | null
  }
) {
  const d = await gql<{ receiveTransfer: Transfer }>(
    `mutation($u: String!, $i: ReceiveTransferInput!) { receiveTransfer(uniqueId: $u, input: $i) { ${TRANSFER} ${TRANSFER_LINES} } }`,
    { u: uniqueId, i: input }
  )
  return d.receiveTransfer
}

export async function cancelTransfer(uniqueId: string, reason: string) {
  const d = await gql<{ cancelTransfer: Transfer }>(
    `mutation($u: String!, $r: String!) { cancelTransfer(uniqueId: $u, reason: $r) { ${TRANSFER} ${TRANSFER_LINES} } }`,
    { u: uniqueId, r: reason }
  )
  return d.cancelTransfer
}

// ── issues / returns ──

export type StockDocType = "ISSUE" | "RETURN"
export type BeneficiaryType = "DEPARTMENT" | "EMPLOYEE" | "PRODUCTION"

export type StockDocument = {
  uniqueId: string
  number: string
  type: StockDocType
  store: Ref
  beneficiaryType: BeneficiaryType
  beneficiary: string
  reference: string | null
  note: string | null
  by: string
  at: string
  lines: {
    lineNo: number
    productUniqueId: string
    productCode: string | null
    productName: string
    unit: string
    location: string
    batchNumber: string | null
    quantity: number
  }[]
}

const STOCK_DOC = /* GraphQL */ `
  uniqueId number type beneficiaryType beneficiary reference note by at
  store { ${REF} }
  lines { lineNo productUniqueId productCode productName unit location batchNumber quantity }
`

export async function fetchStockDocuments(
  storeUniqueId?: string,
  type?: StockDocType
) {
  const d = await gql<{ stockDocuments: StockDocument[] }>(
    `query($s: String, $t: StockDocType) { stockDocuments(storeUniqueId: $s, type: $t) { ${STOCK_DOC} } }`,
    { s: storeUniqueId, t: type }
  )
  return d.stockDocuments
}

export async function fetchStockDocument(uniqueId: string) {
  const d = await gql<{ stockDocument: StockDocument }>(
    `query($u: String!) { stockDocument(uniqueId: $u) { ${STOCK_DOC} } }`,
    { u: uniqueId }
  )
  return d.stockDocument
}

export async function createStockDocument(input: {
  type: StockDocType
  storeUniqueId: string
  beneficiaryType: BeneficiaryType
  departmentUniqueId?: string | null
  employeeUniqueId?: string | null
  productionRef?: string | null
  reference?: string | null
  note?: string | null
  internalRequestUniqueId?: string | null
  lines: {
    productUniqueId: string
    locationUniqueId: string
    batchNumber?: string | null
    quantity: number
  }[]
}) {
  const d = await gql<{ createStockDocument: StockDocument }>(
    `mutation($i: CreateStockDocumentInput!) { createStockDocument(input: $i) { ${STOCK_DOC} } }`,
    { i: input }
  )
  return d.createStockDocument
}

export type Balance = {
  locationUniqueId: string
  location: string
  batchNumber: string | null
  expiryDate: string | null
  onHand: number
  reserved: number
  available: number
}

export async function fetchBalances(
  storeUniqueId: string,
  productUniqueId: string
) {
  const d = await gql<{ stockBalances: Balance[] }>(
    `query($s: String!, $p: String!) { stockBalances(storeUniqueId: $s, productUniqueId: $p) { locationUniqueId location batchNumber expiryDate onHand reserved available } }`,
    { s: storeUniqueId, p: productUniqueId }
  )
  return d.stockBalances
}

// ── stock counts ──

export type CountScope = "FULL" | "LOCATION" | "CATEGORY"
export type CountStatus =
  "COUNTING" | "IN_APPROVAL" | "APPROVED" | "REJECTED" | "CANCELLED"

export type CountLine = {
  id: number
  productName: string
  productCode: string | null
  unit: string
  assetUniqueId: string | null
  assetTag: string | null
  serialNumber: string | null
  location: string
  batchNumber: string | null
  expectedQty: number | null
  countedQty: number | null
  variance: number | null
  unexpected: boolean
  countedBy: string | null
  note: string | null
}

export type StockCount = {
  uniqueId: string
  number: string
  status: CountStatus
  scope: CountScope
  scopeLabel: string
  store: Ref
  note: string | null
  createdBy: string
  createdAt: string
  submittedAt: string | null
  postedAt: string | null
  postError: string | null
  approvalRequestUniqueId: string | null
  lineCount: number
  countedCount: number
  varianceCount: number | null
  lines: CountLine[]
  can: { count: boolean; submit: boolean; cancel: boolean; retry: boolean }
}

const COUNT = /* GraphQL */ `
  uniqueId number status scope scopeLabel note createdBy createdAt submittedAt
  postedAt postError approvalRequestUniqueId lineCount countedCount varianceCount
  store { ${REF} }
  can { count submit cancel retry }
`
const COUNT_LINES = /* GraphQL */ `
  lines {
    id productName productCode unit assetUniqueId assetTag serialNumber location
    batchNumber expectedQty countedQty variance unexpected countedBy note
  }
`

export async function fetchCounts(storeUniqueId?: string) {
  const d = await gql<{ stockCounts: StockCount[] }>(
    `query($s: String) { stockCounts(storeUniqueId: $s) { ${COUNT} } }`,
    { s: storeUniqueId }
  )
  return d.stockCounts
}

export async function fetchCount(uniqueId: string) {
  const d = await gql<{ stockCount: StockCount }>(
    `query($u: String!) { stockCount(uniqueId: $u) { ${COUNT} ${COUNT_LINES} } }`,
    { u: uniqueId }
  )
  return d.stockCount
}

export async function startCount(input: {
  storeUniqueId: string
  scope: CountScope
  locationUniqueIds?: string[]
  categoryUniqueId?: string
  note?: string | null
}) {
  const d = await gql<{ startStockCount: StockCount }>(
    `mutation($i: CreateCountInput!) { startStockCount(input: $i) { ${COUNT} } }`,
    { i: input }
  )
  return d.startStockCount
}

export async function recordCount(
  uniqueId: string,
  entries: { lineId: number; countedQty: number; note?: string | null }[]
) {
  const d = await gql<{ recordStockCount: StockCount }>(
    `mutation($u: String!, $i: RecordCountInput!) { recordStockCount(uniqueId: $u, input: $i) { ${COUNT} ${COUNT_LINES} } }`,
    { u: uniqueId, i: { entries } }
  )
  return d.recordStockCount
}

export async function scanCount(uniqueId: string, tag: string) {
  const d = await gql<{ scanStockCount: StockCount }>(
    `mutation($u: String!, $t: String!) { scanStockCount(uniqueId: $u, tag: $t) { ${COUNT} ${COUNT_LINES} } }`,
    { u: uniqueId, t: tag }
  )
  return d.scanStockCount
}

const countMutation =
  (name: string, withReason = false) =>
  async (uniqueId: string, reason?: string): Promise<StockCount> => {
    const d = await gql<Record<string, StockCount>>(
      withReason
        ? `mutation($u: String!, $r: String!) { ${name}(uniqueId: $u, reason: $r) { ${COUNT} ${COUNT_LINES} } }`
        : `mutation($u: String!) { ${name}(uniqueId: $u) { ${COUNT} ${COUNT_LINES} } }`,
      withReason ? { u: uniqueId, r: reason } : { u: uniqueId }
    )
    return d[name]
  }
export const submitCount = countMutation("submitStockCount")
export const cancelCount = countMutation("cancelStockCount", true)
export const retryPostCount = countMutation("retryPostStockCount")

// ── maintenance ──

export type MaintenanceStatus =
  "OPEN" | "IN_REPAIR" | "AT_VENDOR" | "COMPLETED" | "CANCELLED"
export type MaintenanceSource =
  | "FAULT_REPORT"
  | "PRODUCTION_RETURN"
  | "STOCK_COUNT"
  | "TRANSFER_RECEIPT"
  | "SCHEDULED"
  | "OTHER"
export const MAINTENANCE_SOURCES: MaintenanceSource[] = [
  "FAULT_REPORT",
  "PRODUCTION_RETURN",
  "STOCK_COUNT",
  "TRANSFER_RECEIPT",
  "SCHEDULED",
  "OTHER",
]

export type MaintenanceTicket = {
  uniqueId: string
  number: string
  status: MaintenanceStatus
  source: MaintenanceSource
  description: string
  external: boolean
  vendorName: string | null
  underWarranty: boolean
  openedBy: string
  createdAt: string
  startedAt: string | null
  sentOutAt: string | null
  backAt: string | null
  completedAt: string | null
  completedBy: string | null
  outcome: string | null
  outcomeCondition: AssetCondition | null
  downtimeHours: number | null
  asset: {
    uniqueId: string
    tag: string
    productName: string
    status: AssetStatus
    condition: AssetCondition
    storeUniqueId: string | null
    storeName: string | null
  }
  can: { start: boolean; sendOut: boolean; complete: boolean; cancel: boolean }
}

const TICKET = /* GraphQL */ `
  uniqueId number status source description external vendorName underWarranty
  openedBy createdAt startedAt sentOutAt backAt completedAt completedBy outcome
  outcomeCondition downtimeHours
  asset { uniqueId tag productName status condition storeUniqueId storeName }
  can { start sendOut complete cancel }
`

export async function fetchTickets(
  status?: MaintenanceStatus,
  assetUniqueId?: string
) {
  const d = await gql<{ maintenanceTickets: MaintenanceTicket[] }>(
    `query($s: MaintenanceStatus, $a: String) { maintenanceTickets(status: $s, assetUniqueId: $a) { ${TICKET} } }`,
    { s: status, a: assetUniqueId }
  )
  return d.maintenanceTickets
}

export async function fetchTicket(uniqueId: string) {
  const d = await gql<{ maintenanceTicket: MaintenanceTicket }>(
    `query($u: String!) { maintenanceTicket(uniqueId: $u) { ${TICKET} } }`,
    { u: uniqueId }
  )
  return d.maintenanceTicket
}

export async function openTicket(input: {
  assetUniqueId: string
  source: MaintenanceSource
  description: string
}) {
  const d = await gql<{ openMaintenance: MaintenanceTicket }>(
    `mutation($i: OpenMaintenanceInput!) { openMaintenance(input: $i) { ${TICKET} } }`,
    { i: input }
  )
  return d.openMaintenance
}

export async function startTicket(uniqueId: string) {
  const d = await gql<{ startMaintenance: MaintenanceTicket }>(
    `mutation($u: String!) { startMaintenance(uniqueId: $u) { ${TICKET} } }`,
    { u: uniqueId }
  )
  return d.startMaintenance
}

export async function sendTicketToVendor(uniqueId: string, vendorName: string) {
  const d = await gql<{ sendMaintenanceToVendor: MaintenanceTicket }>(
    `mutation($u: String!, $v: String!) { sendMaintenanceToVendor(uniqueId: $u, vendorName: $v) { ${TICKET} } }`,
    { u: uniqueId, v: vendorName }
  )
  return d.sendMaintenanceToVendor
}

export async function completeTicket(
  uniqueId: string,
  input: {
    outcome: string
    condition: AssetCondition
    locationUniqueId: string
  }
) {
  const d = await gql<{ completeMaintenance: MaintenanceTicket }>(
    `mutation($u: String!, $i: CompleteMaintenanceInput!) { completeMaintenance(uniqueId: $u, input: $i) { ${TICKET} } }`,
    { u: uniqueId, i: input }
  )
  return d.completeMaintenance
}

export async function cancelTicket(uniqueId: string, reason: string) {
  const d = await gql<{ cancelMaintenance: MaintenanceTicket }>(
    `mutation($u: String!, $r: String!) { cancelMaintenance(uniqueId: $u, reason: $r) { ${TICKET} } }`,
    { u: uniqueId, r: reason }
  )
  return d.cancelMaintenance
}

// ── disposals ──

export type DisposalStatus =
  | "IN_APPROVAL"
  | "APPROVED"
  | "RETURNED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED"

export type Disposal = {
  uniqueId: string
  number: string
  status: DisposalStatus
  reason: string
  method: string
  previousStatus: AssetStatus
  proposedBy: string
  createdAt: string
  completedAt: string | null
  completedBy: string | null
  completionNote: string | null
  approvalRequestUniqueId: string | null
  asset: {
    uniqueId: string
    tag: string
    productName: string
    status: AssetStatus
    condition: AssetCondition
    storeName: string | null
    departmentName: string
  }
  can: { complete: boolean; cancel: boolean }
}

const DISPOSAL = /* GraphQL */ `
  uniqueId number status reason method previousStatus proposedBy createdAt
  completedAt completedBy completionNote approvalRequestUniqueId
  asset { uniqueId tag productName status condition storeName departmentName }
  can { complete cancel }
`

export async function fetchDisposals(status?: DisposalStatus) {
  const d = await gql<{ disposals: Disposal[] }>(
    `query($s: DisposalStatus) { disposals(status: $s) { ${DISPOSAL} } }`,
    { s: status }
  )
  return d.disposals
}

export async function fetchDisposal(uniqueId: string) {
  const d = await gql<{ disposal: Disposal }>(
    `query($u: String!) { disposal(uniqueId: $u) { ${DISPOSAL} } }`,
    { u: uniqueId }
  )
  return d.disposal
}

export async function proposeDisposal(input: {
  assetUniqueId: string
  reason: string
  method: string
}) {
  const d = await gql<{ proposeDisposal: Disposal }>(
    `mutation($i: ProposeDisposalInput!) { proposeDisposal(input: $i) { ${DISPOSAL} } }`,
    { i: input }
  )
  return d.proposeDisposal
}

export async function completeDisposal(uniqueId: string, note: string) {
  const d = await gql<{ completeDisposal: Disposal }>(
    `mutation($u: String!, $n: String!) { completeDisposal(uniqueId: $u, note: $n) { ${DISPOSAL} } }`,
    { u: uniqueId, n: note }
  )
  return d.completeDisposal
}

export async function cancelDisposal(uniqueId: string, reason: string) {
  const d = await gql<{ cancelDisposal: Disposal }>(
    `mutation($u: String!, $r: String!) { cancelDisposal(uniqueId: $u, reason: $r) { ${DISPOSAL} } }`,
    { u: uniqueId, r: reason }
  )
  return d.cancelDisposal
}

export async function markAssetLost(uniqueId: string, reason: string) {
  const d = await gql<{ markAssetLost: Asset }>(
    `mutation($u: String!, $r: String!) { markAssetLost(uniqueId: $u, reason: $r) { uniqueId status } }`,
    { u: uniqueId, r: reason }
  )
  return d.markAssetLost
}

export async function markAssetFound(
  uniqueId: string,
  locationUniqueId: string,
  note: string
) {
  const d = await gql<{ markAssetFound: Asset }>(
    `mutation($u: String!, $l: String!, $n: String) { markAssetFound(uniqueId: $u, locationUniqueId: $l, note: $n) { uniqueId status } }`,
    { u: uniqueId, l: locationUniqueId, n: note }
  )
  return d.markAssetFound
}
