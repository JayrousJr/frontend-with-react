import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { AlertTriangleIcon, OctagonAlertIcon } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { Conflict } from "@/services/production"

export {
  FileUpload,
  Files,
  FormDialog,
  Info,
  Loading,
} from "../procurement/shared"

/** Card with title, optional description and actions. */
export function Section({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

/** Conflicts: hard ones block, soft ones need a reason / authorisation. */
export function Conflicts({
  items,
  empty,
}: {
  items: (Pick<Conflict, "message" | "hard"> & { kind?: string })[]
  empty?: ReactNode
}) {
  const { t } = useTranslation()
  if (!items.length)
    return empty ? (
      <p className="text-sm text-muted-foreground">{empty}</p>
    ) : null
  return (
    <ul className="space-y-1 text-sm">
      {items.map((c, i) => (
        <li
          key={i}
          className={
            c.hard
              ? "flex items-start gap-2 text-destructive"
              : "flex items-start gap-2 text-amber-700 dark:text-amber-400"
          }
        >
          {c.hard ? (
            <OctagonAlertIcon className="mt-0.5 size-4 shrink-0" />
          ) : (
            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
          )}
          <span>
            {c.kind && (
              <span className="font-medium">
                {t(`codes.${c.kind}`, c.kind)}:{" "}
              </span>
            )}
            {c.message}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Small "label: value" stat tile. */
export function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  tone?: "warn" | "bad" | "good"
}) {
  const color =
    tone === "bad"
      ? "text-destructive"
      : tone === "warn"
        ? "text-amber-700 dark:text-amber-400"
        : tone === "good"
          ? "text-emerald-700 dark:text-emerald-400"
          : ""
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums ${color}`}>
        {value}
      </div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}

/** Thin progress bar (0–100). */
export function Bar({ percent }: { percent: number }) {
  const p = Math.max(0, Math.min(100, percent))
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={
          p >= 100
            ? "h-full bg-emerald-500"
            : p >= 60
              ? "h-full bg-sky-500"
              : "h-full bg-amber-500"
        }
        style={{ width: `${p}%` }}
      />
    </div>
  )
}

/** Plain table helper used by the production pages. */
export function SimpleTable({
  head,
  rows,
  empty,
}: {
  head: ReactNode[]
  rows: ReactNode[][]
  empty?: ReactNode
}) {
  const { t } = useTranslation()
  if (!rows.length)
    return (
      <p className="text-sm text-muted-foreground">
        {empty ?? t("general.none", "Nothing yet.")}
      </p>
    )
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            {head.map((h, i) => (
              <th key={i} className="px-2 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b align-top last:border-0">
              {r.map((c, j) => (
                <td key={j} className="px-2 py-2">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
