import axios from "axios"
import i18n from "@/config/i18n"
import type { FileRef, Order, VendorUser } from "./procurement"

/**
 * Vendor portal API. Vendor sessions are separate from staff sessions: the
 * vendor token lives in this tab's sessionStorage (cleared when the tab
 * closes) and is never sent to staff routes.
 */
const KEY = "azamtv.portal.token"
const base = import.meta.env.VITE_API_URL as string
export const portalApi = axios.create({ baseURL: `${base}/portal` })

export const getPortalToken = () => {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}
export const setPortalToken = (t: string | null) => {
  try {
    if (t) sessionStorage.setItem(KEY, t)
    else sessionStorage.removeItem(KEY)
  } catch {
    /* private mode */
  }
}

portalApi.interceptors.request.use((c) => {
  const t = getPortalToken()
  if (t) c.headers.Authorization = `Bearer ${t}`
  c.headers["x-lang"] = i18n.language
  return c
})
portalApi.interceptors.response.use(undefined, (error) => {
  if (axios.isAxiosError(error)) {
    if (
      error.response?.status === 401 &&
      !error.config?.url?.startsWith("/auth/")
    ) {
      setPortalToken(null)
      window.dispatchEvent(new Event("portal:expired"))
    }
    const m = error.response?.data?.message
    if (m) return Promise.reject(new Error(Array.isArray(m) ? m.join(", ") : m))
  }
  return Promise.reject(error)
})

const get = async <T>(u: string) => (await portalApi.get<T>(u)).data
const post = async <T>(u: string, b?: unknown) =>
  (await portalApi.post<T>(u, b ?? {})).data
const put = async <T>(u: string, b: unknown) =>
  (await portalApi.put<T>(u, b)).data

// ── auth ──
export type LoginResult = {
  tokens?: { accessToken: string }
  challenge?: { challengeToken: string; setupRequired: boolean }
}
export const portalLogin = (email: string, password: string) =>
  post<LoginResult>("/auth/login", { email, password })
export const portalSetup2fa = (challengeToken: string) =>
  post<{ secret: string; otpauthUrl: string }>("/auth/2fa/setup", {
    challengeToken,
  })
export const portalVerify2fa = (challengeToken: string, code: string) =>
  post<{ accessToken: string }>("/auth/2fa/verify", { challengeToken, code })
export const portalActivate = (token: string, password: string) =>
  post("/auth/activate", { token, password })
export const portalRefresh = () =>
  post<{ accessToken: string }>("/auth/refresh")
export const portalLogout = () => post("/auth/logout")

// ── data ──
export type PortalMe = {
  user: { uniqueId: string; fullName: string; email: string; isAdmin: boolean }
  vendor: {
    uniqueId: string
    number: string
    name: string
    status: string
    validUntil: string
    canBid: boolean
  }
  unread: number
}
export type PortalTenderSummary = {
  uniqueId: string
  number: string
  title: string
  status: string
  closingAt: string | null
  lineCount: number
  myBid: string | null
  publishedAt: string | null
}
export type Compliance = {
  specId: number
  complies: boolean
  offered?: string | null
}
export type PortalTender = {
  uniqueId: string
  number: string
  title: string
  description: string | null
  deliveryTerms: string | null
  terms: string | null
  closingAt: string | null
  serverTime: string
  bidValidityDays: number
  status: string
  canBid: boolean
  canAsk: boolean
  clarifyUntil: string | null
  lines: {
    lineNo: number
    productName: string
    description: string
    categoryName: string
    unit: string
    quantity: number
    vatRate: number
    specs: { id: number; text: string }[]
    myOffer: {
      unitPrice: number
      unitExclVat: number
      unitVat: number
      lineTotal: number
      deliveryDays: number
      brand: string | null
      model: string | null
      countryOfOrigin: string | null
      compliance: Compliance[]
      files: FileRef[]
    } | null
    outcome: "WON" | "NOT_AWARDED" | null
  }[]
  myBid: {
    status: string
    validityDays: number | null
    submittedAt: string | null
    files: FileRef[]
  } | null
  clarifications: {
    question: string
    answer: string | null
    mine: boolean
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
}
export type BidLineInput = {
  lineNo: number
  unitPrice: number
  deliveryDays: number
  brand?: string | null
  model?: string | null
  countryOfOrigin?: string | null
  compliance: Compliance[]
  fileUniqueIds?: string[]
}

export const portalMe = () => get<PortalMe>("/me")
export const portalTenders = () => get<PortalTenderSummary[]>("/tenders")
export const portalTender = (id: string) => get<PortalTender>(`/tenders/${id}`)
export const portalAsk = (id: string, question: string) =>
  post<PortalTender>(`/tenders/${id}/questions`, { question })
export const portalSaveBid = (
  id: string,
  input: {
    validityDays: number
    fileUniqueIds?: string[]
    lines: BidLineInput[]
  },
  submit: boolean
) => put<PortalTender>(`/tenders/${id}/bid`, { ...input, submit })
export const portalWithdraw = (id: string) =>
  post<PortalTender>(`/tenders/${id}/withdraw`)
export const portalOrders = () => get<Order[]>("/orders")
export const portalOrder = (id: string) => get<Order>(`/orders/${id}`)
export const portalAcknowledge = (id: string) =>
  post<Order>(`/orders/${id}/acknowledge`)
export type PortalNotification = {
  uniqueId: string
  type: string
  title: string
  body: string
  link: string | null
  readAt: string | null
  createdAt: string
}
export const portalNotifications = () =>
  get<PortalNotification[]>("/notifications")
export const portalMarkRead = () => post("/notifications/read")
export const portalUsers = () => get<VendorUser[]>("/users")
export const portalCreateUser = (input: {
  fullName: string
  email: string
  phone?: string
}) => post<{ user: VendorUser; devLink: string | null }>("/users", input)
export const portalUserActive = (id: string, active: boolean) =>
  post(`/users/${id}/active`, { active })
export const portalUserReset2fa = (id: string) => post(`/users/${id}/reset-2fa`)
export const portalUserResend = (id: string) =>
  post<{ devLink: string | null }>(`/users/${id}/resend`)

export async function portalUpload(file: File) {
  const form = new FormData()
  form.append("file", file)
  return (await portalApi.post<FileRef>("/files/upload", form)).data
}

/** Download a file through the portal (bearer header) and open it. */
export async function portalOpenFile(f: FileRef) {
  const r = await portalApi.get(`/files/${f.uniqueId}`, {
    responseType: "blob",
  })
  const url = URL.createObjectURL(r.data as Blob)
  window.open(url, "_blank", "noopener")
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
