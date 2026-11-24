import { api } from "./api"

/** Production modules 01–15 (REST, bearer-authenticated). */

const get = async <T>(url: string, params?: Record<string, unknown>) =>
  (await api.get<T>(url, { params })).data
const post = async <T>(url: string, body?: unknown) =>
  (await api.post<T>(url, body ?? {})).data
const put = async <T>(url: string, body: unknown) =>
  (await api.put<T>(url, body)).data

export type FileRef = { uniqueId: string; filename: string; uri: string }

export type ProductionStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "RETURNED"
  | "APPROVED"
  | "REJECTED"
  | "SCHEDULED"
  | "PREPARING"
  | "READY"
  | "IN_PROGRESS"
  | "ON_HOLD"
  | "DELAYED"
  | "COMPLETED"
  | "CLOSED"
  | "CANCELLED"

export const PRODUCTION_STATUSES: ProductionStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "RETURNED",
  "APPROVED",
  "REJECTED",
  "SCHEDULED",
  "PREPARING",
  "READY",
  "IN_PROGRESS",
  "ON_HOLD",
  "DELAYED",
  "COMPLETED",
  "CLOSED",
  "CANCELLED",
]

// ── configuration ────────────────────────────────────────────────────────

export type Category = {
  id: number
  code: string
  name: string
  isActive: boolean
}
export type CrewRole = {
  id: number
  code: string
  name: string
  departmentId: number
  departmentName: string
  skills: string[]
  isActive: boolean
}
export type Venue = {
  id: number
  name: string
  location: string
  contactName: string | null
  contactPhone: string | null
  isActive: boolean
}
export type ChecklistKind = "READINESS" | "CLOSURE"
export type Template = {
  id: number
  kind: ChecklistKind
  categoryId: number | null
  text: string
  departmentId: number | null
  departmentName?: string | null
  critical: boolean
  autoKey: string | null
  dueDays: number | null
  sortOrder: number
  isActive: boolean
}
export type ProductionConfig = {
  categories: Category[]
  crewRoles: CrewRole[]
  venues: Venue[]
  templates: Template[]
  departments: { id: number; code: string; name: string }[]
  productCategories: { id: number; name: string }[]
  stores: { id: number; code: string; name: string }[]
  documentCategories: string[]
  incidentCategories: string[]
}

export const fetchConfig = () => get<ProductionConfig>("/production/config")
export const saveCategory = (b: Partial<Category>) =>
  put<Category>("/production/config/categories", b)
export const saveCrewRole = (b: Partial<CrewRole>) =>
  put<CrewRole>("/production/config/crew-roles", b)
export const saveVenue = (b: Partial<Venue>) =>
  put<Venue>("/production/config/venues", b)
export const saveTemplate = (b: Partial<Template>) =>
  put<Template>("/production/config/templates", b)

// ── 01 / 02 productions ──────────────────────────────────────────────────

export type ProductionRow = {
  uniqueId: string
  number: string
  title: string
  status: ProductionStatus
  category: string
  categoryId: number
  startAt: string
  endAt: string
  setupAt: string | null
  breakdownAt: string | null
  venues: string[]
  venueIds: number[]
  departments: string[]
  departmentIds: number[]
  producer: string
  isMine: boolean
}

export type VenueInput = {
  venueId?: number | null
  name?: string | null
  location?: string | null
  startAt?: string | null
  endAt?: string | null
}

export type ProductionInput = {
  title: string
  categoryId: number
  description?: string | null
  objectives?: string | null
  startAt: string
  endAt: string
  venues: VenueInput[]
  departmentIds: number[]
  crew: {
    departmentId: number
    crewRoleId: number
    quantity: number
    note?: string | null
  }[]
  equipment: { categoryId: number; quantity: number; note?: string | null }[]
}

export type Production = {
  uniqueId: string
  number: string
  title: string
  status: ProductionStatus
  categoryId: number
  category: string
  description: string | null
  objectives: string | null
  startAt: string
  endAt: string
  setupAt: string | null
  breakdownAt: string | null
  producerUserId: number
  producer: string
  department: string
  isProducer: boolean
  approvalUniqueId: string | null
  cancelReason: string | null
  readyAt: string | null
  readinessOverride: string | null
  actualStartAt: string | null
  actualEndAt: string | null
  outcome: string | null
  lessonsLearned: string | null
  recommendations: string | null
  closureException: string | null
  closedAt: string | null
  venues: (VenueInput & { name: string; location: string | null })[]
  departments: {
    departmentId: number
    name: string
    readyConfirmedAt: string | null
    closureConfirmedAt: string | null
  }[]
  crew: {
    departmentId: number
    department: string
    crewRoleId: number
    crewRole: string
    quantity: number
    note: string | null
  }[]
  equipment: {
    categoryId: number
    category: string
    quantity: number
    note: string | null
  }[]
  scheduleChanges: {
    uniqueId: string
    before: Record<string, unknown>
    after: Record<string, unknown>
    reason: string
    status: string
    conflicts: Conflict[] | null
    requestedBy: string
    createdAt: string
    decidedAt: string | null
  }[]
  history: {
    kind: string
    text: string
    by: string
    department: string | null
    at: string
  }[]
  can: {
    edit: boolean
    submit: boolean
    cancel: boolean
    schedule: boolean
    startPreparation: boolean
    requestChange: boolean
  }
}

export type Conflict = {
  kind: "VENUE" | "STAFF" | "EQUIPMENT" | "VEHICLE" | "DRIVER"
  message: string
  hard: boolean
  production?: string
}

export type ScheduleInput = {
  startAt: string
  endAt: string
  setupAt?: string | null
  breakdownAt?: string | null
  venues?: VenueInput[]
}

export const fetchProductions = (
  f: {
    status?: string
    categoryId?: number
    departmentId?: number
    search?: string
    mine?: boolean
  } = {}
) =>
  get<ProductionRow[]>("/production/productions", {
    ...f,
    mine: f.mine ? "true" : undefined,
    search: f.search || undefined,
  })
export const fetchCalendar = (f: {
  from: string
  to: string
  categoryId?: number
  departmentId?: number
  venueId?: number
  status?: string
}) => get<ProductionRow[]>("/production/calendar", f)
export const fetchProduction = (id: string) =>
  get<Production>(`/production/productions/${id}`)
export const createProduction = (b: ProductionInput) =>
  post<Production>("/production/productions", b)
export const updateProduction = (id: string, b: ProductionInput) =>
  put<Production>(`/production/productions/${id}`, b)
export const submitProduction = (id: string) =>
  post<Production>(`/production/productions/${id}/submit`)
export const cancelProduction = (id: string, reason: string) =>
  post<Production>(`/production/productions/${id}/cancel`, { reason })
export const scheduleProduction = (id: string, b: ScheduleInput) =>
  post<Production>(`/production/productions/${id}/schedule`, b)
export const startPreparation = (id: string) =>
  post<Production>(`/production/productions/${id}/start-preparation`)
export const requestScheduleChange = (
  id: string,
  b: ScheduleInput & { reason: string }
) =>
  post<{ change: string; conflicts: Conflict[] }>(
    `/production/productions/${id}/schedule-change`,
    b
  )
export const fetchConflicts = (id: string) =>
  get<Conflict[]>(`/production/productions/${id}/conflicts`)

export type Unavailability = {
  uniqueId: string
  employeeId: number
  employee: string
  department: string
  fromDate: string
  toDate: string
  reason: string
}
export const fetchUnavailability = () =>
  get<Unavailability[]>("/production/unavailability")
export const fetchUnavailabilityEmployees = () =>
  get<
    {
      employeeId: number
      name: string
      employeeNumber: string
      department: string
    }[]
  >("/production/unavailability/employees")
export const addUnavailability = (b: {
  employeeId: number
  fromDate: string
  toDate: string
  reason: string
}) => post("/production/unavailability", b)
export const removeUnavailability = (id: string) =>
  post(`/production/unavailability/${id}/remove`)

// ── 03 crew ──────────────────────────────────────────────────────────────

export type CrewAssignment = {
  uniqueId: string
  employeeId: number
  employee: string
  employeeNumber: string
  jobTitle: string
  phone: string
  email: string
  hasLogin: boolean
  status: "PENDING" | "ASSIGNED" | "CANCELLED"
  assignedBy: string
  assignedAt: string
  overrideReason: string | null
  cancelReason: string | null
  canRelease: boolean
}
export type CrewRequirement = {
  uniqueId: string
  departmentId: number
  department: string
  crewRole: string
  crewRoleId: number
  skills: string[]
  quantity: number
  filled: number
  note: string | null
  additional: boolean
  justification: string | null
  status: "APPROVED" | "PENDING" | "REJECTED"
  canAssign: boolean
  assignments: CrewAssignment[]
}
export type CrewBoard = {
  window: { from: string; to: string }
  requirements: CrewRequirement[]
  canRequestAdditional: boolean
}
export type Candidate = {
  employeeId: number
  name: string
  employeeNumber: string
  jobTitle: string
  status: string
  skills: string[]
  qualifications: string[]
  professionalRoles: string[]
  missingSkills: string[]
  conflicts: { message: string; hard: boolean }[]
  available: boolean
}

export const fetchCrew = (id: string) =>
  get<CrewBoard>(`/production/productions/${id}/crew`)
export const fetchCandidates = (rid: string) =>
  get<Candidate[]>(`/production/crew/requirements/${rid}/candidates`)
export const assignCrew = (
  rid: string,
  employeeId: number,
  overrideReason?: string
) =>
  post<CrewBoard>(`/production/crew/requirements/${rid}/assign`, {
    employeeId,
    overrideReason: overrideReason || null,
  })
export const releaseCrew = (aid: string, reason: string) =>
  post<CrewBoard>(`/production/crew/assignments/${aid}/release`, { reason })
export const requestAdditionalCrew = (
  id: string,
  b: {
    departmentId: number
    crewRoleId: number
    quantity: number
    justification: string
  }
) => post<CrewBoard>(`/production/productions/${id}/crew/additional`, b)

export type CrewOverview = {
  uniqueId: string
  number: string
  title: string
  status: ProductionStatus
  startAt: string
  departments: {
    departmentId: number
    department: string
    required: number
    filled: number
    pending: number
    complete: boolean
  }[]
}[]
export const fetchCrewOverview = () =>
  get<CrewOverview>("/production/crew/overview")

export type CallSheet = {
  number: string
  title: string
  category: string
  producer: string
  startAt: string
  endAt: string
  setupAt: string | null
  breakdownAt: string | null
  venues: { name: string; location: string | null }[]
  department: string | null
  crew: {
    departmentId: number
    department: string
    role: string
    name: string
    phone: string
    email: string
  }[]
  transport: {
    number: string
    pickup: string
    destination: string
    departAt: string
    returnAt: string
    vehicle: string
    driver: string
    driverPhone: string
  }[]
  runningOrder: {
    version: number
    items: { seq: number; title: string; durationSec: number }[]
  } | null
  generatedAt: string
}
export const fetchCallSheet = (id: string, departmentId?: number) =>
  get<CallSheet>(`/production/productions/${id}/call-sheet`, { departmentId })
export const sendCallSheets = (id: string) =>
  post<{ recipients: number }>(`/production/productions/${id}/call-sheets/send`)

export type MyProductions = {
  assignments: {
    productionUniqueId: string
    number: string
    title: string
    status: ProductionStatus
    role: string
    startAt: string
    endAt: string
    setupAt: string | null
    venues: string[]
  }[]
  produced: {
    productionUniqueId: string
    number: string
    title: string
    status: ProductionStatus
    startAt: string
    endAt: string
    venues: string[]
  }[]
}
export const fetchMyProductions = () =>
  get<MyProductions>("/production/my-productions")

// ── 04 equipment bookings ────────────────────────────────────────────────

export type Availability = {
  window: { from: string; to: string }
  assets: {
    assetId: number
    tag: string
    name: string
    category: string
    categoryId: number
    productId: number
    storeId: number | null
    store: string
    location: string
    status: string
    condition: string
    isKit: boolean
    components: string[]
    conflicts: string[]
    available: boolean
  }[]
  quantities: {
    storeId: number
    store: string
    productId: number
    name: string
    category: string
    consumable: boolean
    available: number
  }[]
  unavailableCount: number
}
export type BookingRow = {
  uniqueId: string
  number: string
  status: string
  production: string
  productionTitle: string
  productionUniqueId: string
  store: string
  department: string
  requestedBy: string
  fromAt: string
  toAt: string
  items: number
  createdAt: string
}
export type BookingLine = {
  id: number
  assetId: number | null
  tag: string | null
  name: string
  category: string
  location: string | null
  components: string[]
  quantity: number
  consumable: boolean
  checkedOutQty: number
  checkoutCondition: string | null
  kitChecklist: { tag: string; present: boolean }[] | null
  returnedQty: number
  returnCondition: string | null
  missing: boolean
  returnNote: string | null
  report: { uniqueId: string; number: string; type: string } | null
}
export type Booking = {
  uniqueId: string
  number: string
  status: string
  productionUniqueId: string
  production: string
  productionTitle: string
  productionStatus: ProductionStatus
  storeId: number
  store: string
  department: string
  departmentId: number
  fromAt: string
  toAt: string
  intendedUse: string | null
  requestedBy: string
  decidedBy: string | null
  rejectReason: string | null
  approvalUniqueId: string | null
  checkedOutAt: string | null
  checkedOutBy: string | null
  collectedBy: string | null
  vehicle: string | null
  checkoutNote: string | null
  returnedAt: string | null
  returnedBy: string | null
  returnNote: string | null
  lines: BookingLine[]
  returnStores: { id: number; name: string }[]
  collectors: { employeeId: number; name: string; employeeNumber: string }[]
  alternatives: { assetId: number; label: string }[]
  vehicles: { assetId: number; registrationNumber: string }[]
  can: { decide: boolean; cancel: boolean; checkout: boolean; return: boolean }
}
export const fetchAvailability = (
  id: string,
  f: { storeId?: number; categoryId?: number; search?: string }
) => get<Availability>(`/production/productions/${id}/availability`, f)
export const createBooking = (b: {
  productionUniqueId: string
  departmentId: number
  storeId: number
  intendedUse?: string | null
  lines: { assetId?: number; productId?: number; quantity?: number }[]
}) => post<Booking>("/production/bookings", b)
export const fetchBookings = (
  f: { production?: string; status?: string; storeId?: number } = {}
) => get<BookingRow[]>("/production/bookings", f)
export const fetchBooking = (id: string) =>
  get<Booking>(`/production/bookings/${id}`)
export const decideBooking = (
  id: string,
  decision: "APPROVE" | "REJECT",
  comment?: string,
  alternativeAssetIds?: number[]
) =>
  post<Booking>(`/production/bookings/${id}/decide`, {
    decision,
    comment,
    alternativeAssetIds,
  })
export const fetchBookingAlternatives = (id: string) =>
  get<
    {
      assetId: number
      tag: string
      name: string
      condition: string
      conflicts: string[]
    }[]
  >(`/production/bookings/${id}/alternatives`)
export const cancelBooking = (id: string, reason: string) =>
  post<Booking>(`/production/bookings/${id}/cancel`, { reason })
export const checkoutBooking = (
  id: string,
  b: {
    collectedByEmployeeId: number
    vehicleAssetId?: number | null
    note?: string | null
    lines: {
      lineId: number
      condition?: string | null
      components?: string[] | null
      quantity?: number | null
    }[]
  }
) => post<Booking>(`/production/bookings/${id}/checkout`, b)
export const returnBooking = (
  id: string,
  b: {
    storeId: number
    note?: string | null
    lines: {
      lineId: number
      missing?: boolean
      condition?: string | null
      returnedQty?: number | null
      note?: string | null
      missingComponents?: string[] | null
    }[]
  }
) => post<Booking>(`/production/bookings/${id}/return`, b)

// ── 06 running orders ────────────────────────────────────────────────────

export type RunningOrderVersion = {
  uniqueId: string
  version: number
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "RETURNED" | "SUPERSEDED"
  official: boolean
  notes: string | null
  file: FileRef | null
  createdBy: string
  createdAt: string
  submittedAt: string | null
  approvedAt: string | null
  returnComment: string | null
  totalSec: number
  items: {
    seq: number
    title: string
    description: string | null
    durationSec: number
    startAt: string
    endAt: string
    departmentId: number | null
    department: string | null
    personnel: string | null
  }[]
  comments: { text: string; by: string; at: string }[]
  canEdit: boolean
}
export type RunningOrders = {
  startAt: string
  canEdit: boolean
  canCreate: boolean
  officialVersion: number | null
  versions: RunningOrderVersion[]
}
export type RunningOrderInput = {
  notes?: string | null
  fileUniqueId?: string | null
  items: {
    title: string
    description?: string | null
    durationSec: number
    departmentId?: number | null
    personnel?: string | null
  }[]
}
export const fetchRunningOrders = (id: string) =>
  get<RunningOrders>(`/production/productions/${id}/running-orders`)
export const newRunningOrder = (id: string) =>
  post<RunningOrders>(`/production/productions/${id}/running-orders`)
export const saveRunningOrder = (rid: string, b: RunningOrderInput) =>
  put<RunningOrders>(`/production/running-orders/${rid}`, b)
export const submitRunningOrder = (rid: string) =>
  post<RunningOrders>(`/production/running-orders/${rid}/submit`)
export const commentRunningOrder = (rid: string, text: string) =>
  post<RunningOrders>(`/production/running-orders/${rid}/comment`, { text })

// ── 07 transport ─────────────────────────────────────────────────────────

export type TransportInput = {
  departmentId?: number | null
  pickup: string
  destination: string
  route?: string | null
  departAt: string
  returnAt: string
  passengers?: number | null
  equipmentNote?: string | null
  instructions?: string | null
}
export type TripRow = {
  uniqueId: string
  number: string
  status: string
  production: string
  productionTitle: string
  productionUniqueId: string
  pickup: string
  destination: string
  departAt: string
  returnAt: string
  passengers: number
  vehicle: string | null
  driver: string | null
  km: number | null
  fuelLitres: number | null
}
export type Trip = {
  uniqueId: string
  number: string
  status: string
  productionUniqueId: string
  production: string
  productionTitle: string
  department: string | null
  departmentId: number | null
  requestedBy: string
  pickup: string
  destination: string
  route: string | null
  departAt: string
  returnAt: string
  passengers: number
  equipmentNote: string | null
  instructions: string | null
  approvalUniqueId: string | null
  vehicle: {
    assetId: number
    tag: string
    registrationNumber: string
    name: string
    seats: number | null
  } | null
  driver: {
    employeeId: number
    name: string
    phone: string
    licenceNumber: string
    licenceExpiry: string | null
  } | null
  allocatedBy: string | null
  allocatedAt: string | null
  rejectReason: string | null
  cancelReason: string | null
  actualDepartAt: string | null
  actualArriveAt: string | null
  actualReturnAt: string | null
  odometerStart: number | null
  odometerEnd: number | null
  km: number | null
  fuelLitres: number | null
  driverReport: string | null
  changes: { at: string; by: string; what: string }[]
  can: {
    allocate: boolean
    decide: boolean
    edit: boolean
    cancel: boolean
    depart: boolean
    complete: boolean
  }
}
export type TripResources = {
  vehicles: {
    assetId: number
    tag: string
    registrationNumber: string
    name: string
    seats: number | null
    status: string
    conflicts: { message: string; hard: boolean }[]
    available: boolean
    enoughSeats: boolean
  }[]
  drivers: {
    employeeId: number
    name: string
    phone: string
    licenceNumber: string
    licenceClass: string
    licenceExpiry: string
    licenceExpired: boolean
    conflicts: { message: string; hard: boolean }[]
    available: boolean
  }[]
}
export const requestTransport = (id: string, b: TransportInput) =>
  post<Trip>(`/production/productions/${id}/transport`, b)
export const fetchTrips = (
  f: { production?: string; status?: string; from?: string; to?: string } = {}
) => get<TripRow[]>("/production/transport", f)
export const fetchTrip = (id: string) =>
  get<Trip>(`/production/transport/${id}`)
export const fetchTripResources = (id: string) =>
  get<TripResources>(`/production/transport/${id}/resources`)
export const allocateTrip = (
  id: string,
  b: { vehicleAssetId: number; driverEmployeeId: number; note?: string | null }
) => post<Trip>(`/production/transport/${id}/allocate`, b)
export const decideTrip = (
  id: string,
  decision: "APPROVE" | "REJECT",
  comment?: string
) => post<Trip>(`/production/transport/${id}/decide`, { decision, comment })
export const updateTrip = (id: string, b: TransportInput) =>
  put<Trip>(`/production/transport/${id}`, b)
export const cancelTrip = (id: string, reason: string) =>
  post<Trip>(`/production/transport/${id}/cancel`, { reason })
export const departTrip = (
  id: string,
  b: { at?: string | null; odometerStart: number }
) => post<Trip>(`/production/transport/${id}/depart`, b)
export const completeTrip = (
  id: string,
  b: {
    arriveAt?: string | null
    returnAt?: string | null
    odometerEnd: number
    fuelLitres?: number | null
    driverReport?: string | null
  }
) => post<Trip>(`/production/transport/${id}/complete`, b)

// ── 08 documents ─────────────────────────────────────────────────────────

export type ProductionDocument = {
  uniqueId: string
  productionUniqueId: string
  production: string
  productionTitle: string
  category: string
  title: string
  description: string | null
  reference: string | null
  department: string | null
  docDate: string | null
  version: number
  changeNote: string | null
  isLatest: boolean
  approvalStatus: string
  archived: boolean
  archivedAt: string | null
  filename: string
  mimeType: string
  size: number
  uploadedBy: string
  createdAt: string
}
export const fetchDocuments = (
  f: {
    production?: string
    category?: string
    search?: string
    archived?: boolean
  } = {}
) =>
  get<ProductionDocument[]>("/production/documents", {
    ...f,
    search: f.search || undefined,
    category: f.category || undefined,
    archived: f.archived ? "true" : undefined,
  })
export const uploadDocument = (
  id: string,
  b: {
    category: string
    title: string
    description?: string | null
    reference?: string | null
    departmentId?: number | null
    docDate?: string | null
    fileUniqueId: string
  }
) => post<ProductionDocument[]>(`/production/productions/${id}/documents`, b)
export const newDocumentVersion = (
  did: string,
  b: { fileUniqueId: string; changeNote: string }
) => post<ProductionDocument[]>(`/production/documents/${did}/version`, b)
export const fetchDocumentVersions = (did: string) =>
  get<ProductionDocument[]>(`/production/documents/${did}/versions`)
export const archiveDocument = (did: string) =>
  post<ProductionDocument[]>(`/production/documents/${did}/archive`)

/** Permission-checked download (opens in a new tab). */
export async function openDocument(did: string) {
  const r = await api.get<Blob>(`/production/documents/${did}/download`, {
    responseType: "blob",
  })
  window.open(URL.createObjectURL(r.data), "_blank")
}
export async function openProductionFile(id: string, fileUniqueId: string) {
  const r = await api.get<Blob>(
    `/production/productions/${id}/files/${fileUniqueId}`,
    {
      responseType: "blob",
    }
  )
  window.open(URL.createObjectURL(r.data), "_blank")
}

// ── 09 announcements ─────────────────────────────────────────────────────

export type Announcement = {
  uniqueId: string
  title: string
  body: string
  audience: "ALL" | "DEPARTMENTS" | "USERS" | "PRODUCTION"
  production: string | null
  recipients: number
  emailed: number
  sentBy: string
  mine: boolean
  createdAt: string
}
export const fetchAnnouncements = (production?: string) =>
  get<Announcement[]>("/production/announcements", { production })
export const fetchRecipients = (search?: string) =>
  get<
    {
      employeeId: number
      name: string
      department: string
      employeeNumber: string
    }[]
  >("/production/announcements/recipients", { search: search || undefined })
export const sendAnnouncement = (b: {
  title: string
  body: string
  audience: Announcement["audience"]
  departmentIds?: number[]
  employeeIds?: number[]
  productionUniqueId?: string | null
}) => post<Announcement>("/production/announcements", b)

// ── 10 / 12 checklists ───────────────────────────────────────────────────

export type ChecklistStatus =
  "PENDING" | "IN_PROGRESS" | "COMPLETED" | "NOT_APPLICABLE" | "BLOCKED"
export type ChecklistItem = {
  uniqueId: string
  text: string
  departmentId: number | null
  department: string
  critical: boolean
  auto: boolean
  autoKey: string | null
  detail: string | null
  status: ChecklistStatus
  comment: string | null
  dueAt: string | null
  overdue: boolean
  files: FileRef[]
  updatedBy: string | null
  updatedAt: string
  history: {
    status: string
    comment: string | null
    by: number | null
    at: string
  }[]
  canUpdate: boolean
}
export type Checklist = {
  kind: ChecklistKind
  status: ProductionStatus
  percent: number
  total: number
  done: number
  blocked: number
  overdue: number
  criticalOpen: string[]
  departments: { name: string; total: number; done: number; percent: number }[]
  confirmations: {
    departmentId: number
    name: string
    confirmedAt: string | null
    canConfirm: boolean
  }[]
  approval: { uniqueId: string; status: string } | null
  items: ChecklistItem[]
  canRequestReady: boolean
}
const kindPath = (k: ChecklistKind) =>
  k === "READINESS" ? "readiness" : "closure"
export const fetchChecklist = (id: string, kind: ChecklistKind) =>
  get<Checklist>(`/production/productions/${id}/checklist/${kindPath(kind)}`)
export const updateChecklistItem = (
  itemId: string,
  b: {
    status: ChecklistStatus
    comment?: string | null
    fileUniqueIds?: string[]
  }
) => put<Checklist>(`/production/checklist/${itemId}`, b)
export const addChecklistItem = (
  id: string,
  kind: ChecklistKind,
  b: {
    text: string
    departmentId?: number | null
    critical?: boolean
    dueAt?: string | null
  }
) =>
  post<Checklist>(
    `/production/productions/${id}/checklist/${kindPath(kind)}/items`,
    b
  )
export const confirmDepartment = (
  id: string,
  kind: ChecklistKind,
  departmentId: number
) =>
  post<Checklist>(
    `/production/productions/${id}/checklist/${kindPath(kind)}/confirm/${departmentId}`
  )
export const requestReadiness = (id: string, overrideReason?: string) =>
  post<Checklist>(`/production/productions/${id}/readiness/request`, {
    overrideReason: overrideReason || undefined,
  })

// ── 11 execution ─────────────────────────────────────────────────────────

export type Incident = {
  uniqueId: string
  number: string
  category: string
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  description: string
  department: string | null
  departmentId: number | null
  reportedBy: string
  occurredAt: string
  actionsTaken: string | null
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED"
  assignee: string | null
  assigneeUserId: number | null
  dueAt: string | null
  overdue: boolean
  resolution: string | null
  resolvedAt: string | null
  files: FileRef[]
  assetReport: { uniqueId: string; number: string; status: string } | null
  canUpdate: boolean
}
export type Execution = {
  status: ProductionStatus
  actualStartAt: string | null
  actualEndAt: string | null
  updates: {
    kind: string
    text: string
    by: string
    department: string | null
    files: FileRef[]
    at: string
  }[]
  incidents: Incident[]
  deviations: {
    uniqueId: string
    area: string
    description: string
    reason: string
    significant: boolean
    status: string
    requestedBy: string
    createdAt: string
  }[]
  checkedOutAssets: { uniqueId: string; tag: string; name: string }[]
  can: {
    start: boolean
    hold: boolean
    delay: boolean
    resume: boolean
    complete: boolean
    report: boolean
    deviation: boolean
  }
}
export const fetchExecution = (id: string) =>
  get<Execution>(`/production/productions/${id}/execution`)
export const fetchMembers = (id: string) =>
  get<{ userId: number; name: string }[]>(
    `/production/productions/${id}/members`
  )
export const startProduction = (id: string) =>
  post<Execution>(`/production/productions/${id}/start`)
export const setProductionStatus = (
  id: string,
  status: "ON_HOLD" | "DELAYED" | "IN_PROGRESS",
  reason?: string
) => post<Execution>(`/production/productions/${id}/status`, { status, reason })
export const completeProduction = (id: string) =>
  post<Execution>(`/production/productions/${id}/complete`)
export const addUpdate = (
  id: string,
  b: {
    kind: string
    text: string
    departmentId?: number | null
    fileUniqueIds?: string[]
  }
) => post<Execution>(`/production/productions/${id}/updates`, b)
export const reportIncident = (
  id: string,
  b: {
    category: string
    severity: string
    description: string
    departmentId?: number | null
    occurredAt?: string | null
    actionsTaken?: string | null
    assigneeUserId?: number | null
    dueAt?: string | null
    fileUniqueIds?: string[]
    assetUniqueId?: string | null
    assetReportType?: string | null
  }
) => post<Execution>(`/production/productions/${id}/incidents`, b)
export const updateIncident = (
  iid: string,
  b: {
    status?: string
    actionsTaken?: string | null
    resolution?: string | null
    assigneeUserId?: number | null
    dueAt?: string | null
  }
) => put<Execution>(`/production/incidents/${iid}`, b)
export const reportDeviation = (
  id: string,
  b: { area: string; description: string; reason: string; significant: boolean }
) => post<Execution>(`/production/productions/${id}/deviations`, b)

export type MonitorRow = {
  uniqueId: string
  number: string
  title: string
  status: ProductionStatus
  startAt: string
  endAt: string
  actualStartAt: string | null
  venues: string[]
  producer: string
  openIncidents: number
  criticalIncidents: number
}
export const fetchMonitor = () => get<MonitorRow[]>("/production/monitor")

// ── 12 closure ───────────────────────────────────────────────────────────

export type Closure = {
  number: string
  title: string
  category: string
  status: ProductionStatus
  producer: string
  venues: string[]
  plannedStartAt: string
  plannedEndAt: string
  actualStartAt: string | null
  actualEndAt: string | null
  outcome: string | null
  lessonsLearned: string | null
  recommendations: string | null
  closureException: string | null
  closedAt: string | null
  approval: { uniqueId: string; status: string } | null
  summary: Record<string, number>
  feedback: {
    topic: string
    rating: number | null
    text: string
    by: string
    department: string | null
    at: string
  }[]
  amendments: {
    uniqueId: string
    field: string
    before: string | null
    after: string
    reason: string
    status: string
    by: string
    at: string
  }[]
  can: { submit: boolean; feedback: boolean; amend: boolean }
}
export const fetchClosure = (id: string) =>
  get<Closure>(`/production/productions/${id}/closure`)
export const submitClosure = (
  id: string,
  b: {
    outcome: string
    lessonsLearned?: string | null
    recommendations?: string | null
    exceptionReason?: string | null
  }
) => post<Closure>(`/production/productions/${id}/closure/submit`, b)
export const addFeedback = (
  id: string,
  b: {
    topic: string
    rating?: number | null
    text: string
    departmentId?: number | null
  }
) => post<Closure>(`/production/productions/${id}/feedback`, b)
export const requestAmendment = (
  id: string,
  b: {
    field: "outcome" | "lessonsLearned" | "recommendations"
    after: string
    reason: string
  }
) => post<Closure>(`/production/productions/${id}/amendments`, b)

// ── 15 attendance ────────────────────────────────────────────────────────

export type AttendanceStatus =
  "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | "ON_LEAVE" | "HALF_DAY"
export type AttendanceRecord = {
  uniqueId: string
  status: AttendanceStatus
  method: "MANUAL" | "QR"
  checkInAt: string | null
  checkOutAt: string | null
  breakMinutes: number
  hours: number
  overtimeHours: number
  nightHours: number
  overtimeStatus: string
  note: string | null
  corrections: {
    status: string
    reason: string
    before: Record<string, unknown>
    after: Record<string, unknown>
    at: string
  }[]
}
export type AttendanceSheet = {
  workDate: string
  days: string[]
  callTime: string
  crew: {
    employeeId: number
    name: string
    employeeNumber: string
    department: string
    departmentId: number | null
    role: string
    record: AttendanceRecord | null
    canRecord: boolean
  }[]
  totals: {
    assigned: number
    present: number
    absent: number
    late: number
    pending: number
    hours: number
    overtime: number
  }
}
export const fetchAttendance = (id: string, date?: string) =>
  get<AttendanceSheet>(`/production/productions/${id}/attendance`, { date })
export const recordAttendance = (
  id: string,
  b: {
    employeeId: number
    workDate: string
    status: AttendanceStatus
    checkInAt?: string | null
    checkOutAt?: string | null
    breakMinutes?: number | null
    note?: string | null
  }
) => post<AttendanceSheet>(`/production/productions/${id}/attendance`, b)
export const scanAttendance = (id: string, code: string) =>
  post<{
    action: "CHECK_IN" | "CHECK_OUT" | "ALREADY_DONE"
    name: string
    employeeNumber: string
    at: string
  }>(`/production/productions/${id}/attendance/scan`, { code })
export const requestAttendanceCorrection = (
  aid: string,
  b: {
    status?: AttendanceStatus
    checkInAt?: string | null
    checkOutAt?: string | null
    breakMinutes?: number | null
    reason: string
  }
) => post<AttendanceSheet>(`/production/attendance/${aid}/correction`, b)
export type Badge = {
  employeeId?: number
  name: string
  employeeNumber: string
  department: string
  jobTitle: string
  hasLogin?: boolean
  qr: string
}
export const fetchBadges = (id: string) =>
  get<Badge[]>(`/production/productions/${id}/badges`)
export const emailBadges = (id: string, employeeIds?: number[]) =>
  post<{ sent: number }>(`/production/productions/${id}/badges/email`, {
    employeeIds,
  })
export const fetchMyBadge = () => get<Badge>("/production/attendance/my-badge")
export type AttendanceRow = {
  uniqueId: string
  production: string
  productionTitle: string
  productionUniqueId: string
  employee: string
  employeeNumber: string
  department: string
  workDate: string
  status: AttendanceStatus
  method: string
  checkInAt: string | null
  checkOutAt: string | null
  hours: number
  overtimeHours: number
  nightHours: number
  overtimeStatus: string
}
export const fetchAttendanceRecords = (
  f: {
    production?: string
    departmentId?: number
    from?: string
    to?: string
    status?: string
    mine?: boolean
  } = {}
) =>
  get<AttendanceRow[]>("/production/attendance/records", {
    ...f,
    mine: f.mine ? "true" : undefined,
    status: f.status || undefined,
  })

// ── 14 dashboard ─────────────────────────────────────────────────────────

export type Dashboard = {
  from: string
  to: string
  production?: {
    total: number
    byStatus: Record<string, number>
    pendingApproval: number
    upcoming: {
      uniqueId: string
      number: string
      title: string
      startAt: string
      status: ProductionStatus
    }[]
    ongoing: number
    completed: number
    cancelled: number
    rescheduled: number
    byCategory: Record<string, number>
    byMonth: { month: string; count: number }[]
    venueUtilisation: { venue: string; count: number }[]
    readiness: {
      uniqueId: string
      number: string
      title: string
      startAt: string
      percent: number
      blocked: number
      overdue: number
    }[]
    openIncidents: number
    criticalIncidents: number
    departments: {
      department: string
      productions: number
      crewRequired: number
      crewFilled: number
      crewPercent: number
      readinessPercent: number | null
    }[]
  }
  equipment?: {
    total: number
    available: number
    reserved: number
    checkedOut: number
    withEmployees: number
    maintenance: number
    damagedOrMissing: number
    utilisationPercent: number
    byStatus: Record<string, number>
    bookingsByStatus: Record<string, number>
    mostRequested: { category: string; quantity: number }[]
  }
  transport?: {
    requests: number
    byStatus: Record<string, number>
    pending: number
    upcoming: number
    completed: number
    km: number
    fuelLitres: number
    vehicles: Record<string, number>
    perVehicle: { vehicle: string; trips: number; km: number; litres: number }[]
  }
  procurement?: {
    requestsByStatus: Record<string, number>
    tendersByStatus: Record<string, number>
    lposByStatus: Record<string, number>
    overdueLpos: number
    deliveries: number
  }
  store?: {
    quantityOnHand: number
    quantityReserved: number
    belowReorder: number
    transfersByStatus: Record<string, number>
    countsByStatus: Record<string, number>
    disposalsByStatus: Record<string, number>
  }
  handover?: {
    itemsInCustody: number
    custodians: number
    byDepartment: { department: string; items: number }[]
    overdueReturns: number
    health: Record<string, number>
  }
}
export const fetchDashboard = (f: {
  from?: string
  to?: string
  categoryId?: number
  departmentId?: number
}) => get<Dashboard>("/production/dashboard", f)

// ── cost estimate (budget), crew allowances, retirement, documents ───────

export type AllowanceRate = {
  id: number
  code: string
  name: string
  description: string | null
  amount: number
  currency: "TZS" | "USD"
  isActive: boolean
  sortOrder: number
}
export type BudgetItem = {
  id: number
  name: string
  kind: "CASH" | "FUEL"
  isActive: boolean
  sortOrder: number
}
export type BudgetSettings = { rates: AllowanceRate[]; items: BudgetItem[] }
export type BudgetLine = {
  id?: number
  kind: "EXPENSE" | "FUEL" | "CREW"
  description: string
  payee: string | null
  currency: "TZS" | "USD"
  amount: number
  km: number | null
  litres: number | null
  supplier: string | null
  remarks: string | null
  employeeId: number | null
  employeeNumber?: string | null
  role: string | null
  days: number | null
  rate: number | null
  rateCode: string | null
  rateOverrideReason: string | null
  bankName: string | null
  bankAccount: string | null
  actualAmount?: number | null
  receiptRef?: string | null
  paid?: boolean
}
type Money = { TZS: number; USD: number }
export type Budget =
  | { exists: false; settings: BudgetSettings; can: { create: boolean } }
  | {
      exists: true
      settings: BudgetSettings
      uniqueId: string
      number: string
      title: string
      productionStatus: ProductionStatus
      status: string
      rate: AllowanceRate | null
      travelFrom: string | null
      travelReturn: string | null
      liveFrom: string | null
      liveTo: string | null
      city: string | null
      equipmentNote: string | null
      exchangeRate: number | null
      notes: string | null
      createdBy: string
      approval: { uniqueId: string; status: string } | null
      retirementApproval: { uniqueId: string; status: string } | null
      approvedAt: string | null
      retiredAt: string | null
      advanceTaken: number | null
      retirementNote: string | null
      balance: number | null
      totals: {
        expenses: Money
        crew: Money
        all: Money
        actual: Money
        allInTzs: number | null
        actualInTzs: number | null
        litres: number
      }
      crewCount: number
      lines: BudgetLine[]
      can: { edit: boolean; submit: boolean; retire: boolean }
    }
export type BudgetInput = {
  allowanceRateId?: number | null
  travelFrom?: string | null
  travelReturn?: string | null
  liveFrom?: string | null
  liveTo?: string | null
  city?: string | null
  equipmentNote?: string | null
  exchangeRate?: number | null
  notes?: string | null
  lines: BudgetLine[]
}
export const fetchBudgetSettings = () =>
  get<BudgetSettings>("/production/budget-settings")
export const saveAllowanceRate = (b: Partial<AllowanceRate>) =>
  put<BudgetSettings>("/production/budget-settings/rates", b)
export const saveBudgetItem = (b: Partial<BudgetItem>) =>
  put<BudgetSettings>("/production/budget-settings/items", b)
export const fetchBudget = (id: string) =>
  get<Budget>(`/production/productions/${id}/budget`)
export const createBudget = (id: string, allowanceRateId?: number) =>
  post<Budget>(`/production/productions/${id}/budget`, { allowanceRateId })
export const updateBudget = (id: string, b: BudgetInput) =>
  put<Budget>(`/production/productions/${id}/budget`, b)
export const applyBudgetRate = (id: string, rateId: number) =>
  post<Budget>(`/production/productions/${id}/budget/apply-rate`, { rateId })
export const refreshBudgetCrew = (id: string) =>
  post<Budget>(`/production/productions/${id}/budget/refresh-crew`)
export const submitBudget = (id: string) =>
  post<Budget>(`/production/productions/${id}/budget/submit`)
export const saveRetirement = (
  id: string,
  b: {
    advanceTaken?: number | null
    retirementNote?: string | null
    lines: {
      id: number
      actualAmount?: number | null
      receiptRef?: string | null
      paid?: boolean
    }[]
    submit?: boolean
  }
) => put<Budget>(`/production/productions/${id}/budget/retirement`, b)
export type ProductionDocs = {
  crewDocument: {
    number: string
    title: string
    category: string
    venues: string
    producer: string
    callTime: string
    liveTime: string
    from: string
    to: string
    facilities: string[]
    crew: {
      name: string
      employeeNumber: string
      role: string
      jobTitle: string
      department: string
      phone: string
    }[]
  }
  equipmentUsed: {
    booking: string
    store: string
    tag: string
    item: string
    category: string
    quantity: number
    consumable: boolean
    out: string
    returned: string | number
    returnStore: string
    report: string
    checkedOutAt: string | null
    returnedAt: string | null
  }[]
  budget: Extract<Budget, { exists: true }> | null
}
export const fetchProductionDocs = (id: string) =>
  get<ProductionDocs>(`/production/productions/${id}/production-documents`)
export const storeProductionPack = (id: string) =>
  post(`/production/productions/${id}/production-pack`)
export async function downloadProductionPack(id: string, number: string) {
  const r = await api.get<Blob>(
    `/production/productions/${id}/production-pack.xlsx`,
    { responseType: "blob" }
  )
  const a = document.createElement("a")
  a.href = URL.createObjectURL(r.data)
  a.download = `${number}-production-pack.xlsx`
  a.click()
}
