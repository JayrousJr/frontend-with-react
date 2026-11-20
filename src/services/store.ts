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
