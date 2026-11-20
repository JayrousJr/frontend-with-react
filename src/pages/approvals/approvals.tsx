import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { useTranslation } from "react-i18next"
import { AlertTriangleIcon, ChevronRightIcon, InboxIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/app/page-header"
import { ApprovalStatusBadge } from "@/components/app/approval-status"
import { useAuth } from "@/context/auth-context"
import { P, hasPermission } from "@/lib/permissions"
import { formatStamp } from "@/lib/format"
import { ROUTES, withId } from "@/routes/routeConstants"
import {
  fetchAllApprovalRequests,
  fetchMyApprovalRequests,
  fetchMyApprovalTasks,
  type ApprovalRequest,
} from "@/services/workflow"

type Tab = "tasks" | "mine" | "all"

const ApprovalsPage = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const canViewAll = hasPermission(user, P.WORKFLOW_VIEW)
  const tab = (
    ["tasks", "mine", "all"].includes(params.get("tab") ?? "")
      ? params.get("tab")
      : "tasks"
  ) as Tab
  const [rows, setRows] = useState<{
    tab: Tab
    data: ApprovalRequest[]
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    const load =
      tab === "tasks"
        ? fetchMyApprovalTasks()
        : tab === "mine"
          ? fetchMyApprovalRequests()
          : fetchAllApprovalRequests()
    void load.then((data) => !cancelled && setRows({ tab, data }))
    return () => {
      cancelled = true
    }
  }, [tab])

  const data = rows?.tab === tab ? rows.data : null

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("approvals.title", "Approvals")}
        description={t(
          "approvals.subtitle",
          "Requests waiting for your decision, and the ones you raised or acted on."
        )}
      />
      <Tabs
        value={tab}
        onValueChange={(v) => setParams({ tab: v }, { replace: true })}
      >
        <TabsList variant="line">
          <TabsTrigger value="tasks">
            {t("approvals.tasks", "Waiting for me")}
          </TabsTrigger>
          <TabsTrigger value="mine">
            {t("approvals.mine", "Raised or decided by me")}
          </TabsTrigger>
          {canViewAll && (
            <TabsTrigger value="all">
              {t("approvals.all", "All requests")}
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>

      {!data ? (
        <div className="flex justify-center p-10">
          <Spinner />
        </div>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
            <InboxIcon className="size-8" />
            {tab === "tasks"
              ? t(
                  "approvals.none_tasks",
                  "Nothing is waiting for your decision."
                )
              : t("approvals.none", "No requests yet.")}
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <CardContent className="divide-y p-0">
            {data.map((r) => (
              <Link
                key={r.uniqueId}
                to={withId(ROUTES.APPROVAL_DETAILS, r.uniqueId)}
                className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.title}</span>
                    <ApprovalStatusBadge status={r.status} />
                    {r.noApprover && (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                        <AlertTriangleIcon className="size-3.5" />
                        {t(
                          "approvals.no_approver",
                          "No approver for this step"
                        )}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.pointName}
                    {r.currentStep && ` · ${r.currentStep}`}
                    {r.requester && ` · ${r.requester.fullName}`} ·{" "}
                    {formatStamp(r.createdAt)}
                  </div>
                </div>
                <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ApprovalsPage
