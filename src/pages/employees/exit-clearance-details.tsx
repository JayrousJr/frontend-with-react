import { useState } from "react"
import { Link, useLoaderData, useRevalidator } from "react-router"
import { useTranslation } from "react-i18next"
import {
  CheckCircle2Icon,
  CircleIcon,
  PrinterIcon,
  SendIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PageHeader } from "@/components/app/page-header"
import { useRun } from "@/components/app/use-run"
import { useAuth } from "@/context/auth-context"
import { P, hasPermission } from "@/lib/permissions"
import { formatStamp } from "@/lib/format"
import { ROUTES, withId } from "@/routes/routeConstants"
import {
  resolveClearanceItem,
  submitExitClearance,
  type ExitClearance,
} from "@/services/workflow"
import { ClearanceStatusBadge } from "./clearance-status"

type Item = ExitClearance["items"][number]

const TYPE_LABEL: Record<Item["type"], string> = {
  CUSTODY: "Item in custody",
  APPROVAL_TASK: "Approval task",
  REQUEST: "Open request",
  PRODUCTION: "Production assignment",
  OTHER: "Other",
}

const ExitClearanceDetailsPage = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { clearance: c } = useLoaderData() as { clearance: ExitClearance }
  const revalidator = useRevalidator()
  const run = useRun()
  const [resolving, setResolving] = useState<Item | null>(null)
  const [note, setNote] = useState("")
  const canAct = hasPermission(user, P.EMPLOYEE_EXIT) && c.status === "OPEN"

  const refresh = (ok: boolean) => {
    if (ok) void revalidator.revalidate()
  }

  return (
    <div className="space-y-6 print:space-y-4">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {t("clearance.of", "Exit clearance — {{name}}", {
              name: c.employee.fullName,
            })}
            <ClearanceStatusBadge status={c.status} />
          </span>
        }
        description={`${c.employee.employeeNumber} · ${c.employee.jobTitle} · ${c.employee.departmentName}`}
        actions={
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" onClick={() => window.print()}>
              <PrinterIcon />
              {t("clearance.print", "Print report")}
            </Button>
            {canAct && (
              <Button
                disabled={c.openItems > 0}
                onClick={() =>
                  run(
                    () => submitExitClearance(c.uniqueId),
                    t("clearance.submitted", "Sent for sign-off")
                  ).then(refresh)
                }
              >
                <SendIcon />
                {t("clearance.submit", "Send for sign-off")}
              </Button>
            )}
          </div>
        }
      />

      {c.status === "IN_APPROVAL" && c.approvalRequestUniqueId && (
        <Alert className="print:hidden">
          <AlertDescription>
            {t("clearance.in_approval", "Waiting for sign-off.")}{" "}
            <Link
              className="font-medium underline"
              to={withId(ROUTES.APPROVAL_DETAILS, c.approvalRequestUniqueId)}
            >
              {t("clearance.open_approval", "Open the approval")}
            </Link>
          </AlertDescription>
        </Alert>
      )}
      {c.status === "COMPLETED" && (
        <Alert>
          <CheckCircle2Icon />
          <AlertDescription>
            {t("clearance.signed", "Signed off {{when}}{{by}}.", {
              when: formatStamp(c.completedAt),
              by: c.signedOffBy
                ? ` ${t("clearance.by", "by")} ${c.signedOffBy}`
                : "",
            })}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("clearance.items", "Items")}</CardTitle>
          <CardDescription>
            {c.items.length === 0
              ? t(
                  "clearance.no_items",
                  "Nothing outstanding was found. Items in custody appear here once the Handover module (B3) is in use."
                )
              : t("clearance.items_open", "{{open}} of {{all}} items open", {
                  open: c.openItems,
                  all: c.items.length,
                })}
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {c.items.map((i) => (
            <div
              key={i.uniqueId}
              className="flex flex-col gap-2 px-6 py-3 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-start gap-2">
                {i.resolved ? (
                  <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                ) : (
                  <CircleIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      {t(`clearance.type_${i.type}`, TYPE_LABEL[i.type])}
                    </Badge>
                    <span>{i.description}</span>
                  </div>
                  {i.resolved && (
                    <div className="text-xs text-muted-foreground">
                      {i.resolution} · {i.resolvedBy} ·{" "}
                      {formatStamp(i.resolvedAt)}
                    </div>
                  )}
                </div>
              </div>
              {canAct && !i.resolved && (
                <div className="flex gap-2 print:hidden">
                  {i.type === "APPROVAL_TASK" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        run(
                          () => resolveClearanceItem(i.uniqueId, "REASSIGN"),
                          t("clearance.reassigned", "Tasks reassigned")
                        ).then(refresh)
                      }
                    >
                      {t("clearance.reassign", "Reassign")}
                    </Button>
                  )}
                  {i.type === "REQUEST" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        run(
                          () =>
                            resolveClearanceItem(i.uniqueId, "CANCEL_REQUEST"),
                          t("clearance.cancelled", "Request cancelled")
                        ).then(refresh)
                      }
                    >
                      {t("clearance.cancel_request", "Cancel request")}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setResolving(i)}
                  >
                    {t("clearance.resolve", "Resolve…")}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!resolving} onOpenChange={(o) => !o && setResolving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("clearance.resolve_title", "Resolve item")}
            </DialogTitle>
            <DialogDescription>{resolving?.description}</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={t(
              "clearance.resolve_hint",
              "How was it resolved? (e.g. returned to Main Store, transferred to J. Mrisho)"
            )}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolving(null)}>
              {t("actions.cancel", "Cancel")}
            </Button>
            <Button
              disabled={note.trim().length < 3}
              onClick={async () => {
                const ok = await run(
                  () =>
                    resolveClearanceItem(resolving!.uniqueId, "RESOLVE", note),
                  t("clearance.resolved", "Item resolved")
                )
                if (ok) {
                  setResolving(null)
                  setNote("")
                }
                refresh(ok)
              }}
            >
              {t("clearance.resolve_short", "Resolve")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ExitClearanceDetailsPage
