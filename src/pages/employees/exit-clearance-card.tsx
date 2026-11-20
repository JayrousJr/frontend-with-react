import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRun } from "@/components/app/use-run"
import { useAuth } from "@/context/auth-context"
import { P, hasAnyPermission, hasPermission } from "@/lib/permissions"
import { ROUTES, withId } from "@/routes/routeConstants"
import {
  fetchEmployeeExitClearance,
  startExitClearance,
  type ExitClearance,
} from "@/services/workflow"
import { ClearanceStatusBadge } from "./clearance-status"

/** Exit clearance status on an exited employee's profile. */
export function ExitClearanceCard({
  employeeUniqueId,
}: {
  employeeUniqueId: string
}) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const run = useRun()
  const navigate = useNavigate()
  const visible = hasAnyPermission(user, [
    P.EMPLOYEE_EXIT,
    P.EXIT_CLEARANCE_APPROVE,
  ])
  const [state, setState] = useState<{
    loaded: boolean
    c: ExitClearance | null
  }>({
    loaded: false,
    c: null,
  })

  useEffect(() => {
    if (!visible) return
    void fetchEmployeeExitClearance(employeeUniqueId).then((c) =>
      setState({ loaded: true, c })
    )
  }, [employeeUniqueId, visible])

  if (!visible || !state.loaded) return null
  const c = state.c
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("clearance.title_one", "Exit clearance")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {c ? (
          <div className="flex items-center justify-between gap-2">
            <ClearanceStatusBadge status={c.status} />
            <Link
              className="font-medium text-primary hover:underline"
              to={withId(ROUTES.EXIT_CLEARANCE_DETAILS, c.uniqueId)}
            >
              {t("clearance.open", "Open")}
            </Link>
          </div>
        ) : (
          <>
            <p className="text-muted-foreground">
              {t(
                "clearance.none_for_employee",
                "No clearance was opened for this exit."
              )}
            </p>
            {hasPermission(user, P.EMPLOYEE_EXIT) && (
              <Button
                size="sm"
                onClick={async () => {
                  let id = ""
                  const ok = await run(async () => {
                    id = (await startExitClearance(employeeUniqueId)).uniqueId
                  })
                  if (ok) navigate(withId(ROUTES.EXIT_CLEARANCE_DETAILS, id))
                }}
              >
                {t("clearance.start", "Start exit clearance")}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
