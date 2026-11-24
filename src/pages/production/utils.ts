export { useLoad } from "../procurement/shared-utils"

/** ISO → value for <input type="datetime-local"> (browser time = EAT). */
export function toLocal(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** <input type="datetime-local"> value → ISO (null when empty). */
export function fromLocal(v: string | null | undefined): string | null {
  if (!v) return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

/** 3725 → "1:02:05", 300 → "5:00". */
export function duration(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/** "1:02:05" / "5:00" / "45" (minutes) → seconds. */
export function parseDuration(v: string): number {
  const parts = v
    .trim()
    .split(":")
    .map((x) => Number(x))
  if (parts.some((x) => isNaN(x))) return NaN
  if (parts.length === 1) return Math.round(parts[0] * 60)
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0] * 3600 + parts[1] * 60 + parts[2]
}

/** "14:05" in EAT. */
export function clock(iso: string | null | undefined): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleTimeString("en-GB", {
    timeZone: "Africa/Dar_es_Salaam",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** yyyy-mm-dd of a Date in EAT. */
export function eatDay(d: Date): string {
  return new Date(d.getTime() + 3 * 3_600_000).toISOString().slice(0, 10)
}

/** "TZS 120,000" */
export const money = (n: number | null | undefined, cur = "TZS") =>
  n == null
    ? "—"
    : `${cur} ${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`

export const PRODUCTION_TABS = [
  "overview",
  "crew",
  "equipment",
  "running-order",
  "transport",
  "documents",
  "readiness",
  "execution",
  "attendance",
  "closure",
  "budget",
  "messages",
] as const
export type ProductionTab = (typeof PRODUCTION_TABS)[number]
