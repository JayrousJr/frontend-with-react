import { useState } from "react"
import { Link, useLoaderData, useRevalidator } from "react-router"
import { useTranslation } from "react-i18next"
import {
  RefreshCwIcon,
  SendIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader } from "@/components/app/page-header"
import { ToneBadge } from "@/components/app/tone-badge"
import { useCodeLabel } from "@/components/app/use-code-label"
import { ReasonDialog } from "@/components/app/reason-dialog"
import { useRun } from "@/components/app/use-run"
import { formatDay, formatStamp } from "@/lib/format"
import { ROUTES, withId } from "@/routes/routeConstants"
import {
  cancelAdjustment,
  resubmitAdjustment,
  retryPostAdjustment,
  type Adjustment,
} from "@/services/store"

const AdjustmentDetailsPage = () => {
  const { t } = useTranslation()
  const label = useCodeLabel()
  const run = useRun()
  const { revalidate } = useRevalidator()
  const { adjustment: a } = useLoaderData() as { adjustment: Adjustment }
  const [cancelling, setCancelling] = useState(false)
  const hasAssets = a.lines.some((l) => l.condition)
  const hasQty = a.lines.some((l) => !l.condition)

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{a.number}</span>
            {label(a.type)}
            <ToneBadge code={a.status} />
          </span>
        }
        description={`${a.store.name} · ${a.createdBy} · ${formatStamp(a.createdAt)}`}
        actions={
          <>
            {a.approvalRequestUniqueId && (
              <Button variant="outline" asChild>
                <Link
                  to={withId(
                    ROUTES.APPROVAL_DETAILS,
                    a.approvalRequestUniqueId
                  )}
                >
                  <ShieldCheckIcon />
                  {t("products.open_approval", "Approval")}
                </Link>
              </Button>
            )}
            {a.canResubmit && (
              <Button
                onClick={() =>
                  run(
                    async () => {
                      await resubmitAdjustment(a.uniqueId)
                      revalidate()
                    },
                    t("adjustments.resubmitted", "Submitted again")
                  )
                }
              >
                <SendIcon />
                {t("adjustments.resubmit", "Submit again")}
              </Button>
            )}
            {a.canCancel && (
              <Button variant="outline" onClick={() => setCancelling(true)}>
                <XCircleIcon />
                {t("adjustments.cancel", "Cancel adjustment")}
              </Button>
            )}
          </>
        }
      />
      <Card>
        <CardContent className="space-y-1 text-sm">
          <div className="text-muted-foreground">
            {t("common.reason", "Reason")}
          </div>
          <div>{a.reason}</div>
          {a.postedAt && (
            <div className="pt-2 text-emerald-700 dark:text-emerald-400">
              {t("adjustments.posted_on", "Posted to stock on {{d}}", {
                d: formatStamp(a.postedAt),
              })}
            </div>
          )}
        </CardContent>
      </Card>
      {a.postError && (
        <Alert variant="destructive">
          <XCircleIcon />
          <AlertTitle>
            {t("adjustments.post_failed", "Approved, but could not be posted")}
          </AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{a.postError}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                run(async () => {
                  await retryPostAdjustment(a.uniqueId)
                  revalidate()
                })
              }
            >
              <RefreshCwIcon />
              {t("adjustments.retry", "Try posting again")}
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {hasAssets && (
        <Card>
          <CardHeader>
            <CardTitle>{t("adjustments.assets", "Assets")}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{t("assets.tag", "Tag")}</TableHead>
                  <TableHead>{t("products.product", "Product")}</TableHead>
                  <TableHead>{t("assets.serial", "Serial number")}</TableHead>
                  <TableHead>{t("locations.path", "Location")}</TableHead>
                  <TableHead>{t("assets.condition", "Condition")}</TableHead>
                  <TableHead>{t("assets.held_by", "Held by")}</TableHead>
                  <TableHead>{t("assets.kit", "Kit")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {a.lines
                  .filter((l) => l.condition)
                  .map((l) => (
                    <TableRow key={l.lineNo}>
                      <TableCell className="tabular-nums">{l.lineNo}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {l.assetUniqueId ? (
                          <Link
                            className="underline"
                            to={withId(ROUTES.ASSET_DETAILS, l.assetUniqueId)}
                          >
                            {l.tag}
                          </Link>
                        ) : (
                          (l.tag ?? (
                            <span className="font-sans text-muted-foreground">
                              {t("adjustments.new_tag", "new tag")}
                            </span>
                          ))
                        )}
                      </TableCell>
                      <TableCell>
                        {l.productName}
                        <div className="text-xs text-muted-foreground">
                          {[l.brand, l.model].filter(Boolean).join(" ")}
                        </div>
                      </TableCell>
                      <TableCell>{l.serialNumber ?? "—"}</TableCell>
                      <TableCell>{l.holder ? "—" : l.location}</TableCell>
                      <TableCell>
                        {l.condition && <ToneBadge code={l.condition} />}
                      </TableCell>
                      <TableCell>{l.holder ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {l.kitTag ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      {hasQty && (
        <Card>
          <CardHeader>
            <CardTitle>{t("adjustments.quantities", "Quantities")}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{t("products.product", "Product")}</TableHead>
                  <TableHead>{t("locations.path", "Location")}</TableHead>
                  <TableHead>
                    {t("adjustments.batch", "Batch / expiry")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("movements.qty", "Qty")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {a.lines
                  .filter((l) => !l.condition)
                  .map((l) => (
                    <TableRow key={l.lineNo}>
                      <TableCell className="tabular-nums">{l.lineNo}</TableCell>
                      <TableCell>
                        {l.productName}
                        <div className="font-mono text-xs text-muted-foreground">
                          {l.productCode}
                        </div>
                      </TableCell>
                      <TableCell>{l.location}</TableCell>
                      <TableCell>
                        {l.batchNumber ?? "—"}
                        {l.expiryDate && (
                          <div className="text-xs text-muted-foreground">
                            {formatDay(l.expiryDate)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {l.quantity > 0 ? `+${l.quantity}` : l.quantity}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      {cancelling && (
        <ReasonDialog
          title={t("adjustments.cancel_title", "Cancel this adjustment?")}
          description={t(
            "adjustments.cancel_hint",
            "The approval is withdrawn and nothing is posted."
          )}
          confirmLabel={t("adjustments.cancel", "Cancel adjustment")}
          destructive
          onClose={() => setCancelling(false)}
          onConfirm={async (reason) => {
            const ok = await run(
              () => cancelAdjustment(a.uniqueId, reason),
              t("adjustments.cancelled", "Cancelled")
            )
            if (ok) revalidate()
            return ok
          }}
        />
      )}
    </div>
  )
}

export default AdjustmentDetailsPage
