import { Link, useLoaderData, useSearchParams } from "react-router"
import { useTranslation } from "react-i18next"
import { ChevronRightIcon, ClipboardCheckIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/app/page-header"
import { formatStamp } from "@/lib/format"
import { ROUTES, withId } from "@/routes/routeConstants"
import type { ExitClearance } from "@/services/workflow"
import { ClearanceStatusBadge } from "./clearance-status"

const ExitClearancesPage = () => {
  const { t } = useTranslation()
  const { clearances } = useLoaderData() as { clearances: ExitClearance[] }
  const [params, setParams] = useSearchParams()
  const tab = params.get("status") ?? "active"
  const shown = clearances.filter((c) =>
    tab === "active" ? c.status !== "COMPLETED" : c.status === "COMPLETED"
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("clearance.title", "Exit clearances")}
        description={t(
          "clearance.subtitle",
          "Opened automatically when an employee becomes Exited. Every item must be returned, transferred, reassigned or resolved before HR signs off."
        )}
      />
      <Tabs
        value={tab}
        onValueChange={(v) => setParams({ status: v }, { replace: true })}
      >
        <TabsList variant="line">
          <TabsTrigger value="active">
            {t("clearance.active", "In progress")}
          </TabsTrigger>
          <TabsTrigger value="completed">
            {t("clearance.completed", "Completed")}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {shown.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-sm text-muted-foreground">
            <ClipboardCheckIcon className="size-8" />
            {t("clearance.none", "No clearances here.")}
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <CardContent className="divide-y p-0">
            {shown.map((c) => (
              <Link
                key={c.uniqueId}
                to={withId(ROUTES.EXIT_CLEARANCE_DETAILS, c.uniqueId)}
                className="flex items-center gap-4 px-4 py-3 hover:bg-muted sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{c.employee.fullName}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {c.employee.employeeNumber}
                    </span>
                    <ClearanceStatusBadge status={c.status} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {c.employee.departmentName} ·{" "}
                    {t(
                      "clearance.items_open",
                      "{{open}} of {{all}} items open",
                      {
                        open: c.openItems,
                        all: c.items.length,
                      }
                    )}{" "}
                    · {formatStamp(c.createdAt)}
                  </div>
                </div>
                <ChevronRightIcon className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ExitClearancesPage
