import { api } from "./api"

export type ReportInfo = {
  code: string
  name: string
  description: string
  params: {
    key: string
    label: string
    type: "text" | "number" | "date" | "permission"
  }[]
}

export async function fetchReports(): Promise<ReportInfo[]> {
  const { data } = await api.get<ReportInfo[]>("/reports")
  return data
}

/** Download an Excel report (authenticated). */
export async function downloadReport(
  code: string,
  params: Record<string, string>
): Promise<void> {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== "")
  )
  const res = await api.get<Blob>(`/reports/${code}`, {
    params: clean,
    responseType: "blob",
  })
  const disposition = String(res.headers["content-disposition"] ?? "")
  const name = /filename="([^"]+)"/.exec(disposition)?.[1] ?? `${code}.xlsx`
  const href = URL.createObjectURL(res.data)
  const a = document.createElement("a")
  a.href = href
  a.download = name
  a.click()
  URL.revokeObjectURL(href)
}
