import { api } from "./api"

/** Module 09 shared notifications, Module 14 dashboard settings, documents. */

export type Preference = {
  category: string
  label: string
  critical: boolean
  inApp: boolean
  email: boolean
}
export const fetchPreferences = async () =>
  (await api.get<Preference[]>("/comms/preferences")).data
export const setPreference = async (
  category: string,
  inApp: boolean,
  email: boolean
) =>
  (
    await api.put<Preference[]>(`/comms/preferences/${category}`, {
      inApp,
      email,
    })
  ).data

export type EmailLogRow = {
  uniqueId: string
  kind: string
  to: string
  subject: string
  category: string | null
  status: "QUEUED" | "SENT" | "FAILED" | "SKIPPED"
  attempts: number
  error: string | null
  createdAt: string
  sentAt: string | null
  canRetry: boolean
}
export const fetchEmailLog = async (f: {
  status?: string
  search?: string
  page?: number
}) =>
  (
    await api.get<{
      total: number
      page: number
      counts: Record<string, number>
      rows: EmailLogRow[]
    }>("/comms/email-log", {
      params: {
        status: f.status || undefined,
        search: f.search || undefined,
        page: f.page,
      },
    })
  ).data
export const retryEmail = async (id: string) =>
  (await api.post(`/comms/email-log/${id}/retry`)).data
export const retryFailedEmails = async () =>
  (await api.post<{ retried: number }>("/comms/email-log/retry-failed")).data

export type TemplateRow = {
  code: string
  category: string
  defaultSubject: string
  defaultBody: string
  subject: string | null
  body: string | null
  isActive: boolean
  updatedAt: string | null
}
export const fetchTemplates = async () =>
  (await api.get<TemplateRow[]>("/comms/templates")).data
export const saveTemplate = async (
  code: string,
  b: { subject: string; body: string; isActive: boolean }
) => (await api.put<TemplateRow[]>(`/comms/templates/${code}`, b)).data

export type WidgetSettings = {
  widgets: { code: string; label: string }[]
  roles: { id: number; name: string; hidden: string[] }[]
}
export const fetchWidgetSettings = async () =>
  (await api.get<WidgetSettings>("/production/dashboard/settings")).data
export const saveWidgetSettings = async (roleId: number, hidden: string[]) =>
  (
    await api.put<WidgetSettings>(`/production/dashboard/settings/${roleId}`, {
      hidden,
    })
  ).data

export type DocumentRow = {
  source: "PRODUCTION" | "PURCHASE_FILE"
  uniqueId: string
  title: string
  category: string
  reference: string
  link: string
  filename: string
  version: number | null
  uploadedBy: string
  createdAt: string
  archived: boolean
  scanStatus: string
}
export const searchDocuments = async (f: {
  search?: string
  source?: string
}) =>
  (
    await api.get<DocumentRow[]>("/documents", {
      params: { search: f.search || undefined, source: f.source || undefined },
    })
  ).data
export async function openDocumentFile(
  source: DocumentRow["source"],
  id: string
) {
  const r = await api.get<Blob>(`/documents/${source}/${id}/download`, {
    responseType: "blob",
  })
  window.open(URL.createObjectURL(r.data), "_blank")
}
