import { useState } from "react"
import { Link, useLoaderData, useRevalidator } from "react-router"
import { useTranslation } from "react-i18next"
import {
  AlertTriangleIcon,
  CheckIcon,
  CircleDashedIcon,
  CircleDotIcon,
  CornerUpLeftIcon,
  MessageSquareIcon,
  SkipForwardIcon,
  XIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PageHeader } from "@/components/app/page-header"
import { ApprovalStatusBadge } from "@/components/app/approval-status"
import { useRun } from "@/components/app/use-run"
import { formatStamp } from "@/lib/format"
import { cn } from "@/lib/utils"
import { ROUTES, withId } from "@/routes/routeConstants"
import { decideApproval, type ApprovalRequest } from "@/services/workflow"

/** Where the record behind a request lives in the app. */
function subjectLink(r: ApprovalRequest): string | null {
  switch (r.subjectType) {
    case "ExitClearance":
      return withId(ROUTES.EXIT_CLEARANCE_DETAILS, r.subjectId)
    case "User":
      return withId(ROUTES.USER_DETAILS, r.subjectId)
    case "ProductVersion":
      // The product page also opens by version id.
      return withId(ROUTES.PRODUCT_DETAILS, r.subjectId)
    case "StockAdjustment":
      return withId(ROUTES.ADJUSTMENT_DETAILS, r.subjectId)
    case "Transfer":
      return withId(ROUTES.TRANSFER_DETAILS, r.subjectId)
    case "StockCount":
      return withId(ROUTES.COUNT_DETAILS, r.subjectId)
    case "Disposal":
      return withId(ROUTES.DISPOSAL_DETAILS, r.subjectId)
    case "InternalRequest":
      return withId(ROUTES.INTERNAL_REQUEST_DETAILS, r.subjectId)
    case "PurchaseRequest":
      return withId(ROUTES.PURCHASE_REQUEST_DETAILS, r.subjectId)
    case "Handover":
      return withId(ROUTES.HANDOVER_DETAILS, r.subjectId)
    case "AssetReport":
      return `${ROUTES.CUSTODY}?tab=reports`
    case "CustodyTransfer":
      return `${ROUTES.CUSTODY}?tab=transfers`
    default:
      return null
  }
}

const ApprovalDetailsPage = () => {
  const { t } = useTranslation()
  const { request: r } = useLoaderData() as { request: ApprovalRequest }
  const revalidator = useRevalidator()
  const run = useRun()
  const [comment, setComment] = useState("")
  const [busy, setBusy] = useState(false)

  const decide = async (
    decision: "APPROVE" | "REJECT" | "RETURN" | "COMMENT"
  ) => {
    setBusy(true)
    const ok = await run(
      () => decideApproval(r.uniqueId, decision, comment),
      {
        APPROVE: t("approvals.done_approve", "Approved"),
        REJECT: t("approvals.done_reject", "Rejected"),
        RETURN: t("approvals.done_return", "Returned to the requester"),
        COMMENT: t("approvals.done_comment", "Comment added"),
      }[decision]
    )
    setBusy(false)
    if (ok) {
      setComment("")
      void revalidator.revalidate()
    }
  }

  const link = subjectLink(r)
  const decisionLabel: Record<string, string> = {
    APPROVE: t("approvals.d_approve", "approved"),
    REJECT: t("approvals.d_reject", "rejected"),
    RETURN: t("approvals.d_return", "returned"),
    COMMENT: t("approvals.d_comment", "commented"),
    SKIPPED: t("approvals.d_skipped", "skipped (condition not met)"),
    AUTO_APPROVED: t(
      "approvals.d_auto",
      "approved automatically (no steps configured)"
    ),
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {r.title}
            <ApprovalStatusBadge status={r.status} />
          </span>
        }
        description={`${r.pointName}${r.requester ? ` · ${t("approvals.raised_by", "raised by {{name}}", { name: r.requester.fullName })}` : ""} · ${formatStamp(r.createdAt)}`}
        actions={
          link && (
            <Button variant="outline" asChild>
              <Link to={link}>
                {t("approvals.open_record", "Open the record")}
              </Link>
            </Button>
          )
        }
      />

      {r.noApprover && (
        <Alert variant="destructive">
          <AlertTriangleIcon />
          <AlertDescription>
            {t(
              "approvals.no_approver_hint",
              "Nobody can decide the current step (empty group, missing HOD…). Fix the approvers in the approval chain or the group."
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {r.canDecide && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {t("approvals.your_decision", "Your decision")}
                </CardTitle>
                <CardDescription>
                  {t("approvals.step_now", "Step: {{step}}", {
                    step: r.currentStep,
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder={t(
                    "approvals.comment_hint",
                    "Comment (required to reject or return)"
                  )}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <Button disabled={busy} onClick={() => decide("APPROVE")}>
                    <CheckIcon />
                    {t("common.approve", "Approve")}
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={busy || !comment.trim()}
                    onClick={() => decide("REJECT")}
                  >
                    <XIcon />
                    {t("common.reject", "Reject")}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy || !comment.trim()}
                    onClick={() => decide("RETURN")}
                  >
                    <CornerUpLeftIcon />
                    {t("approvals.return", "Return")}
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={busy || !comment.trim()}
                    onClick={() => decide("COMMENT")}
                  >
                    <MessageSquareIcon />
                    {t("approvals.comment", "Comment only")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{t("approvals.history", "History")}</CardTitle>
            </CardHeader>
            <CardContent>
              {r.actions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("approvals.no_actions", "No decisions yet.")}
                </p>
              ) : (
                <ol className="space-y-3">
                  {r.actions.map((a, i) => (
                    <li key={i} className="text-sm">
                      <div>
                        <span className="font-medium">
                          {a.user?.fullName ?? t("audit.system", "System")}
                        </span>{" "}
                        {decisionLabel[a.decision]}
                        {a.stepName && (
                          <span className="text-muted-foreground">
                            {" "}
                            · {a.stepName}
                          </span>
                        )}
                      </div>
                      {a.onBehalfOf && (
                        <div className="text-xs text-muted-foreground">
                          {t("audit.on_behalf", "on behalf of {{name}}", {
                            name: a.onBehalfOf.fullName,
                          })}
                        </div>
                      )}
                      {a.comment && (
                        <p className="mt-1 rounded-md bg-muted px-3 py-2">
                          {a.comment}
                        </p>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {formatStamp(a.at)}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>{t("approvals.chain", "Approval chain")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {r.steps.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("approvals.no_steps", "No steps — approved automatically.")}
              </p>
            ) : (
              <ol className="space-y-3">
                {r.steps.map((s) => {
                  const Icon =
                    s.state === "DONE"
                      ? CheckIcon
                      : s.state === "CURRENT"
                        ? CircleDotIcon
                        : s.state === "SKIPPED"
                          ? SkipForwardIcon
                          : CircleDashedIcon
                  return (
                    <li
                      key={s.order}
                      className="flex items-start gap-2 text-sm"
                    >
                      <Icon
                        className={cn(
                          "mt-0.5 size-4 shrink-0",
                          s.state === "DONE" && "text-emerald-600",
                          s.state === "CURRENT" && "text-primary",
                          (s.state === "WAITING" ||
                            s.state === "NOT_REACHED" ||
                            s.state === "SKIPPED") &&
                            "text-muted-foreground"
                        )}
                      />
                      <div>
                        <div
                          className={cn(s.state === "CURRENT" && "font-medium")}
                        >
                          {s.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {s.mode === "ANY"
                            ? t("approvals.mode_any", "Any one approver")
                            : s.mode === "ALL"
                              ? t("approvals.mode_all", "Every approver")
                              : t(
                                  "approvals.mode_n",
                                  "{{n}} approvals needed",
                                  {
                                    n: s.requiredCount,
                                  }
                                )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
            {r.assignees.length > 0 && (
              <div className="border-t pt-3">
                <div className="mb-1 text-xs font-medium text-muted-foreground">
                  {t("approvals.can_decide", "Can decide now")}
                </div>
                <ul className="space-y-0.5 text-sm">
                  {r.assignees.map((p) => (
                    <li key={p.uniqueId}>{p.fullName}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ApprovalDetailsPage
