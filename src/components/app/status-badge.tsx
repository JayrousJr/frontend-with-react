import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { statusLabel } from "@/lib/status"
import type { EmployeeStatus, UserStatus } from "@/services/employees"

const TONE: Record<string, string> = {
  ACTIVE:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  ON_LEAVE: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  PENDING_ACTIVATION:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  SUSPENDED:
    "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400",
  LOCKED:
    "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400",
  EXITED: "border-border bg-muted text-muted-foreground",
  DEACTIVATED: "border-border bg-muted text-muted-foreground",
  INACTIVE: "border-border bg-muted text-muted-foreground",
}

export function StatusBadge({
  status,
  className,
}: {
  status: EmployeeStatus | UserStatus | "INACTIVE"
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <Badge variant="outline" className={cn(TONE[status], className)}>
      {t(`status.${status}`, statusLabel(status))}
    </Badge>
  )
}

export function ActiveBadge({ active }: { active: boolean }) {
  return <StatusBadge status={active ? "ACTIVE" : "INACTIVE"} />
}
