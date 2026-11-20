import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { statusLabel } from "@/lib/status"

const GREEN =
  "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
const AMBER =
  "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
const SKY = "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400"
const ORANGE =
  "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400"
const RED = "border-destructive/30 bg-destructive/10 text-destructive"
const GREY = "border-border bg-muted text-muted-foreground"
const VIOLET =
  "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400"

/** Colour per status code, shared by products, assets and stock documents. */
const TONE: Record<string, string> = {
  // products / versions / documents
  DRAFT: GREY,
  SUBMITTED: AMBER,
  IN_REVIEW: AMBER,
  IN_APPROVAL: AMBER,
  ACTIVE: GREEN,
  APPROVED: GREEN,
  INACTIVE: GREY,
  SUPERSEDED: GREY,
  RETIRED: GREY,
  CANCELLED: GREY,
  RETURNED: SKY,
  REJECTED: RED,
  // assets
  IN_QUARANTINE: AMBER,
  IN_STORE: GREEN,
  RESERVED: SKY,
  CHECKED_OUT_TO_PRODUCTION: VIOLET,
  ASSIGNED_TO_EMPLOYEE: VIOLET,
  IN_TRANSIT: SKY,
  UNDER_MAINTENANCE: ORANGE,
  AT_VENDOR_FOR_REPAIR: ORANGE,
  MISSING: RED,
  DAMAGED: RED,
  LOST: RED,
  PENDING_DISPOSAL: ORANGE,
  DISPOSED: GREY,
  // conditions
  GOOD: GREEN,
  FAIR: SKY,
  NEEDS_REPAIR: ORANGE,
  UNDER_REPAIR: ORANGE,
  BEYOND_REPAIR: RED,
}

/** Status badge for B1/B2 codes; label from `codes.<CODE>` translations. */
export function ToneBadge({
  code,
  className,
}: {
  code: string
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <Badge variant="outline" className={cn(TONE[code] ?? GREY, className)}>
      {t(`codes.${code}`, statusLabel(code))}
    </Badge>
  )
}
