import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import type { ClearanceStatus } from "@/services/workflow"

const TONE: Record<ClearanceStatus, string> = {
  OPEN: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  IN_APPROVAL: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  COMPLETED:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
}

export function ClearanceStatusBadge({ status }: { status: ClearanceStatus }) {
  const { t } = useTranslation()
  const label = {
    OPEN: t("clearance.s_open", "Open"),
    IN_APPROVAL: t("clearance.s_approval", "Awaiting sign-off"),
    COMPLETED: t("clearance.s_completed", "Signed off"),
  }[status]
  return (
    <Badge variant="outline" className={TONE[status]}>
      {label}
    </Badge>
  )
}
