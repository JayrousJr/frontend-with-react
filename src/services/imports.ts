import { api } from "./api"

export type ImportStatus = "VALIDATED" | "FAILED" | "COMMITTED"

export type ImportResult = {
  uniqueId: string
  status: ImportStatus
  fileName: string
  totalRows: number
  createCount: number
  updateCount: number
  errorCount: number
  createdAt: string
  committedAt: string | null
  errors: { row: number; column: string | null; message: string }[]
  preview: {
    row: number
    action: "create" | "update"
    employeeNumber: string
    name: string
    companyEmail: string
  }[]
}

export type ImportHistoryItem = Omit<ImportResult, "errors" | "preview"> & {
  uploadedBy: string | null
  committedBy: string | null
}

const BASE = "/imports/employees"

/** Download an authenticated file (the API needs the bearer token). */
async function download(url: string, fileName: string) {
  const { data } = await api.get<Blob>(url, { responseType: "blob" })
  const href = URL.createObjectURL(data)
  const a = document.createElement("a")
  a.href = href
  a.download = fileName
  a.click()
  URL.revokeObjectURL(href)
}

export const downloadEmployeeTemplate = () =>
  download(`${BASE}/template`, "azamtv-employee-import.xlsx")

export const downloadImportErrors = (uniqueId: string) =>
  download(`${BASE}/${uniqueId}/errors`, "employee-import-errors.xlsx")

export async function uploadEmployeeImport(file: File): Promise<ImportResult> {
  const form = new FormData()
  form.append("file", file)
  const { data } = await api.post<ImportResult>(BASE, form)
  return data
}

export async function commitEmployeeImport(
  uniqueId: string
): Promise<ImportResult> {
  const { data } = await api.post<ImportResult>(`${BASE}/${uniqueId}/commit`)
  return data
}

export async function fetchImportHistory(): Promise<ImportHistoryItem[]> {
  const { data } = await api.get<ImportHistoryItem[]>(BASE)
  return data
}

export async function fetchImport(uniqueId: string): Promise<ImportResult> {
  const { data } = await api.get<ImportResult>(`${BASE}/${uniqueId}`)
  return data
}
