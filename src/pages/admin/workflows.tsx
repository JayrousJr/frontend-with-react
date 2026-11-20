import { Link, useLoaderData } from "react-router"
import { useTranslation } from "react-i18next"
import { ChevronRightIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/app/page-header"
import { ROUTES, withId } from "@/routes/routeConstants"
import type { PointSummary } from "@/services/workflow"

const WorkflowsPage = () => {
  const { t } = useTranslation()
  const { points } = useLoaderData() as { points: PointSummary[] }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("workflows.title", "Approval chains")}
        description={t(
          "workflows.subtitle",
          "Who approves is configuration. Each approval point has a versioned chain; a point with no steps needs no approval. Running requests keep the version they started with."
        )}
      />
      <Card className="py-0">
        <CardContent className="divide-y p-0">
          {points.map((p) => (
            <Link
              key={p.code}
              to={withId(ROUTES.WORKFLOW_DETAILS, p.code)}
              className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-muted sm:px-6"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{p.name}</span>
                  <Badge variant="outline" className="font-mono">
                    {p.code}
                  </Badge>
                  <Badge variant="secondary">{p.module}</Badge>
                  {p.hasDraft && (
                    <Badge
                      variant="outline"
                      className="border-amber-500/40 text-amber-700 dark:text-amber-400"
                    >
                      {t("workflows.draft", "Draft pending")}
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {p.description}
                </div>
                <div className="text-xs text-muted-foreground">
                  {p.activeVersion && p.activeVersion.steps.length
                    ? p.activeVersion.steps
                        .map((s) => `${s.name} (${s.approverLabel})`)
                        .join(" → ")
                    : t("workflows.no_steps", "No steps — no approval needed")}
                  {p.pendingRequests > 0 &&
                    ` · ${t("workflows.pending", "{{n}} pending", { n: p.pendingRequests })}`}
                </div>
              </div>
              <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export default WorkflowsPage
