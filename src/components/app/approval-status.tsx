import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ApprovalStatus } from "@/services/workflow"

const TONE: Record<ApprovalStatus, string> = {
  PENDING:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  APPROVED:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  REJECTED: "border-destructive/30 bg-destructive/10 text-destructive",
  RETURNED: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  CANCELLED: "border-border bg-muted text-muted-foreground",
}

const LABEL: Record<ApprovalStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  RETURNED: "Returned",
  CANCELLED: "Cancelled",
}

export function ApprovalStatusBadge({
  status,
  className,
}: {
  status: ApprovalStatus
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <Badge variant="outline" className={cn(TONE[status], className)}>
      {t(`approvals.status.${status}`, LABEL[status])}
    </Badge>
  )
}
