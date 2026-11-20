import { api, gql } from "./api"
import type { ImportStatus } from "./imports"

export type ProductStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "IN_REVIEW"
  | "ACTIVE"
  | "INACTIVE"
  | "RETIRED"
  | "RETURNED"
  | "REJECTED"
export type VersionStatus =
  "DRAFT" | "IN_APPROVAL" | "ACTIVE" | "SUPERSEDED" | "RETURNED" | "REJECTED"
export type StoreItemType = "FIXED_ASSET" | "CONSUMABLE" | "SPARE"
export type TrackingType = "SERIALISED" | "QUANTITY" | "BATCH"
export type AcquisitionMethod = "QUOTATION" | "SINGLE_SOURCE"
export type SpecRule = "EXACT" | "MIN" | "MAX" | "RANGE" | "ONE_OF" | "TEXT"
export const SPEC_RULES: SpecRule[] = [
  "EXACT",
  "MIN",
  "MAX",
  "RANGE",
  "ONE_OF",
  "TEXT",
]
export const PRODUCT_STATUSES: ProductStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "IN_REVIEW",
  "ACTIVE",
  "INACTIVE",
  "RETURNED",
  "REJECTED",
  "RETIRED",
]

export type Ref = { uniqueId: string; code: string; name: string }

export type Category = Ref & {
  tagPrefix: string
  isActive: boolean
  productCount: number
  criteria: {
    uniqueId: string
    text: string
    sortOrder: number
    isActive: boolean
  }[]
}

export type Spec = {
  attribute: string
  rule: SpecRule
  value: string
  valueMax: string | null
  unit: string | null
}

export type ProductVersion = {
  uniqueId: string
  version: number
  status: VersionStatus
  name: string
  description: string
  category: Ref
  unit: string
  referencePrice: number | null
  author: string
  createdAt: string
  submittedAt: string | null
  activatedAt: string | null
  approvalRequestUniqueId: string | null
  specs: Spec[]
  criteria: { text: string; fromLibrary: boolean }[]
  attachments: {
    uniqueId: string
    filename: string
    mimeType: string
    size: number
    uri: string
  }[]
}

export type Product = {
  uniqueId: string
  code: string | null
  status: ProductStatus
  name: string
  categoryName: string
  unit: string
  owningDepartment: Ref
  itemType: StoreItemType | null
  trackingType: TrackingType | null
  acquisitionMethod: AcquisitionMethod | null
  singleSourceVendor: string | null
  vatRate: number | null
  isVehicle: boolean
  mergedInto: Ref | null
  current: ProductVersion | null
  pending: ProductVersion | null
  assetCount: number
  createdAt: string
  can: {
    edit: boolean
    submit: boolean
    revise: boolean
    manage: boolean
    merge: boolean
  }
}

export type ProductSummary = {
  uniqueId: string
  code: string | null
  status: ProductStatus
  name: string
  categoryName: string
  unit: string
  departmentName: string
  itemType: StoreItemType | null
  trackingType: TrackingType | null
  hasPendingVersion: boolean
  updatedAt: string
}

export type ProductFilter = {
  search?: string
  statuses?: ProductStatus[]
  categoryUniqueId?: string
  departmentUniqueId?: string
  itemType?: StoreItemType
  pendingOnly?: boolean
}

export type VersionInput = {
  name: string
  description: string
  categoryUniqueId: string
  unit: string
  referencePrice?: number | null
  specs: {
    attribute: string
    rule: SpecRule
    value: string
    valueMax?: string | null
    unit?: string | null
  }[]
  criteria: { text: string; libraryUniqueId?: string | null }[]
  attachmentUniqueIds: string[]
}

export type ActivationInput = {
  productUniqueId: string
  code?: string | null
  itemType: StoreItemType
  trackingType: TrackingType
  acquisitionMethod: AcquisitionMethod
  singleSourceVendor?: string | null
  vatRate: number
  isVehicle: boolean
}

const REF = "uniqueId code name"
const VERSION = /* GraphQL */ `
  uniqueId version status name description unit referencePrice author
  createdAt submittedAt activatedAt approvalRequestUniqueId
  category { ${REF} }
  specs { attribute rule value valueMax unit }
  criteria { text fromLibrary }
  attachments { uniqueId filename mimeType size uri }
`
const PRODUCT = /* GraphQL */ `
  uniqueId code status name categoryName unit itemType trackingType
  acquisitionMethod singleSourceVendor vatRate isVehicle assetCount createdAt
  owningDepartment { ${REF} }
  mergedInto { ${REF} }
  current { ${VERSION} }
  pending { ${VERSION} }
  can { edit submit revise manage merge }
`
const SUMMARY = /* GraphQL */ `
  uniqueId code status name categoryName unit departmentName itemType
  trackingType hasPendingVersion updatedAt
`
const CATEGORY = /* GraphQL */ `
  uniqueId code name tagPrefix isActive productCount
  criteria { uniqueId text sortOrder isActive }
`

export async function fetchCategories(includeInactive = false) {
  const d = await gql<{ productCategories: Category[] }>(
    `query($i: Boolean) { productCategories(includeInactive: $i) { ${CATEGORY} } }`,
    { i: includeInactive }
  )
  return d.productCategories
}

export async function saveCategory(input: {
  uniqueId?: string
  code: string
  name: string
  tagPrefix: string
  isActive: boolean
  criteria: string[]
}) {
  const d = await gql<{ saveProductCategory: Category }>(
    `mutation($i: SaveCategoryInput!) { saveProductCategory(input: $i) { ${CATEGORY} } }`,
    { i: input }
  )
  return d.saveProductCategory
}

export async function fetchProducts(
  filter: ProductFilter = {},
  page = 1,
  limit = 20
) {
  const d = await gql<{
    products: {
      data: ProductSummary[]
      total: number
      page: number
      limit: number
      totalPages: number
    }
  }>(
    `query($f: ProductFilterInput, $p: Int, $l: Int) { products(filter: $f, page: $p, limit: $l) { data { ${SUMMARY} } total page limit totalPages } }`,
    { f: filter, p: page, l: limit }
  )
  return d.products
}

export async function fetchProduct(uniqueId: string) {
  const d = await gql<{ product: Product }>(
    `query($u: String!) { product(uniqueId: $u) { ${PRODUCT} } }`,
    { u: uniqueId }
  )
  return d.product
}

export async function fetchProductVersions(uniqueId: string) {
  const d = await gql<{ productVersions: ProductVersion[] }>(
    `query($u: String!) { productVersions(uniqueId: $u) { ${VERSION} } }`,
    { u: uniqueId }
  )
  return d.productVersions
}

export async function fetchSimilarProducts(name: string, exclude?: string) {
  const d = await gql<{ similarProducts: ProductSummary[] }>(
    `query($n: String!, $x: String) { similarProducts(name: $n, excludeUniqueId: $x) { ${SUMMARY} } }`,
    { n: name, x: exclude }
  )
  return d.similarProducts
}

export async function createProduct(
  input: VersionInput & { departmentUniqueId?: string }
) {
  const d = await gql<{ createProduct: Product }>(
    `mutation($i: CreateProductInput!) { createProduct(input: $i) { ${PRODUCT} } }`,
    { i: input }
  )
  return d.createProduct
}

export async function updateProductDraft(
  uniqueId: string,
  input: VersionInput
) {
  const d = await gql<{ updateProductDraft: Product }>(
    `mutation($u: String!, $i: ProductVersionInput!) { updateProductDraft(uniqueId: $u, input: $i) { ${PRODUCT} } }`,
    { u: uniqueId, i: input }
  )
  return d.updateProductDraft
}

const productMutation =
  (name: string) =>
  async (uniqueId: string): Promise<Product> => {
    const d = await gql<Record<string, Product>>(
      `mutation($u: String!) { ${name}(uniqueId: $u) { ${PRODUCT} } }`,
      { u: uniqueId }
    )
    return d[name]
  }

export const submitProduct = productMutation("submitProduct")
export const reviseProduct = productMutation("reviseProduct")

export async function setProductActivation(input: ActivationInput) {
  const d = await gql<{ setProductActivation: Product }>(
    `mutation($i: ProductActivationInput!) { setProductActivation(input: $i) { ${PRODUCT} } }`,
    { i: input }
  )
  return d.setProductActivation
}

export async function setProductStatus(
  uniqueId: string,
  status: "ACTIVE" | "INACTIVE" | "RETIRED",
  reason: string
) {
  const d = await gql<{ setProductStatus: Product }>(
    `mutation($u: String!, $s: String!, $r: String!) { setProductStatus(uniqueId: $u, status: $s, reason: $r) { ${PRODUCT} } }`,
    { u: uniqueId, s: status, r: reason }
  )
  return d.setProductStatus
}

export async function transferProductOwnership(
  uniqueId: string,
  departmentUniqueId: string,
  reason: string
) {
  const d = await gql<{ transferProductOwnership: Product }>(
    `mutation($u: String!, $d: String!, $r: String!) { transferProductOwnership(uniqueId: $u, departmentUniqueId: $d, reason: $r) { ${PRODUCT} } }`,
    { u: uniqueId, d: departmentUniqueId, r: reason }
  )
  return d.transferProductOwnership
}

export async function mergeProduct(from: string, into: string, reason: string) {
  const d = await gql<{ mergeProduct: Product }>(
    `mutation($f: String!, $i: String!, $r: String!) { mergeProduct(fromUniqueId: $f, intoUniqueId: $i, reason: $r) { ${PRODUCT} } }`,
    { f: from, i: into, r: reason }
  )
  return d.mergeProduct
}

// ── shared Excel import helpers (products, opening balance) ──

export type GenericImport = {
  uniqueId: string
  status: ImportStatus
  fileName: string
  totalRows: number
  createCount: number
  errorCount: number
  createdAt: string
  committedAt: string | null
  errors: { row: number; column: string | null; message: string }[]
  preview: Record<string, string | number | null>[]
  adjustmentUniqueId?: string
}

export type GenericImportHistory = Omit<GenericImport, "errors" | "preview"> & {
  storeName?: string
}

export async function downloadFile(url: string, fileName: string) {
  const { data } = await api.get<Blob>(url, { responseType: "blob" })
  const href = URL.createObjectURL(data)
  const a = document.createElement("a")
  a.href = href
  a.download = fileName
  a.click()
  URL.revokeObjectURL(href)
}

/** REST client for one import type (`/imports/<kind>`). */
export function importClient(kind: "products" | "opening-balance") {
  const base = `/imports/${kind}`
  return {
    template: (query: string, fileName: string) =>
      downloadFile(`${base}/template?${query}`, fileName),
    errors: (uniqueId: string) =>
      downloadFile(`${base}/${uniqueId}/errors`, `${kind}-import-errors.xlsx`),
    upload: async (file: File, fields: Record<string, string>) => {
      const form = new FormData()
      for (const [k, v] of Object.entries(fields)) if (v) form.append(k, v)
      form.append("file", file)
      return (await api.post<GenericImport>(base, form)).data
    },
    commit: async (uniqueId: string) =>
      (await api.post<GenericImport>(`${base}/${uniqueId}/commit`)).data,
    history: async (query = "") =>
      (
        await api.get<GenericImportHistory[]>(
          `${base}${query ? `?${query}` : ""}`
        )
      ).data,
    get: async (uniqueId: string) =>
      (await api.get<GenericImport>(`${base}/${uniqueId}`)).data,
  }
}

export type UploadedFile = {
  uniqueId: string
  filename: string
  mimeType: string
  size: number
  uri: string
}

/** Shared documents service (/files/upload). */
export async function uploadFile(file: File, folder = "products") {
  const form = new FormData()
  form.append("file", file)
  form.append("folder", folder)
  const { data } = await api.post<{ data: UploadedFile }>("/files/upload", form)
  return data.data
}
