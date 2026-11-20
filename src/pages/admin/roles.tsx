import { useState } from "react"
import { Link, useLoaderData, useNavigate } from "react-router"
import { useTranslation } from "react-i18next"
import { CopyIcon, PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader } from "@/components/app/page-header"
import { ActiveBadge } from "@/components/app/status-badge"
import { useRun } from "@/components/app/use-run"
import { useAuth } from "@/context/auth-context"
import { P, hasPermission } from "@/lib/permissions"
import { ROUTES, withId } from "@/routes/routeConstants"
import { copyRole, type Role } from "@/services/access"
import type { Page } from "@/services/types"

const RolesPage = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { roles } = useLoaderData() as { roles: Page<Role> }
  const navigate = useNavigate()
  const run = useRun()
  const [showRetired, setShowRetired] = useState(false)
  const [copying, setCopying] = useState<Role | null>(null)
  const [copyName, setCopyName] = useState("")
  const canManage = hasPermission(user, P.ROLE_MANAGE)

  const visible = roles.data.filter((r) => showRetired || r.isActive)

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("roles.title", "Roles")}
        description={t(
          "roles.subtitle",
          "Roles are sets of permissions, each granted with a scope. Business rules never check role names."
        )}
        actions={
          canManage && (
            <Button asChild>
              <Link to={withId(ROUTES.ROLE_DETAILS, "new")}>
                <PlusIcon />
                {t("roles.new", "New role")}
              </Link>
            </Button>
          )
        }
      />
      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-retired"
              checked={showRetired}
              onCheckedChange={setShowRetired}
            />
            <Label htmlFor="show-retired">
              {t("roles.show_retired", "Show retired roles")}
            </Label>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("roles.role", "Role")}</TableHead>
                  <TableHead className="text-right">
                    {t("roles.permissions", "Permissions")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("roles.users", "Users")}
                  </TableHead>
                  <TableHead>{t("common.status", "Status")}</TableHead>
                  {canManage && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((r) => (
                  <TableRow key={r.uniqueId}>
                    <TableCell>
                      <Link
                        to={withId(ROUTES.ROLE_DETAILS, r.uniqueId)}
                        className="group block"
                      >
                        <div className="flex items-center gap-2 font-medium group-hover:underline">
                          {r.name}
                          {r.contextType && (
                            <Badge variant="outline">
                              {r.contextType === "STORE"
                                ? t("roles.per_store", "per store")
                                : t("roles.per_department", "per department")}
                            </Badge>
                          )}
                        </div>
                        {r.description && (
                          <div className="max-w-xl truncate text-xs text-muted-foreground">
                            {r.description}
                          </div>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.grants.length === 0 ? (
                        <span className="text-xs text-muted-foreground">
                          {t("roles.pending_module", "with later modules")}
                        </span>
                      ) : (
                        r.grants.length
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.userCount}
                    </TableCell>
                    <TableCell>
                      <ActiveBadge active={r.isActive} />
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t("roles.copy", "Copy role")}
                          onClick={() => {
                            setCopying(r)
                            setCopyName(`${r.name} (copy)`)
                          }}
                        >
                          <CopyIcon />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!copying} onOpenChange={(o) => !o && setCopying(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("roles.copy_title", "Copy “{{name}}”", {
                name: copying?.name,
              })}
            </DialogTitle>
          </DialogHeader>
          <Input
            value={copyName}
            onChange={(e) => setCopyName(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopying(null)}>
              {t("actions.cancel", "Cancel")}
            </Button>
            <Button
              disabled={copyName.trim().length < 2}
              onClick={async () => {
                let id = ""
                const ok = await run(
                  async () => {
                    id = (await copyRole(copying!.uniqueId, copyName.trim()))
                      .uniqueId
                  },
                  t("roles.copied", "Role copied")
                )
                if (ok) navigate(withId(ROUTES.ROLE_DETAILS, id))
              }}
            >
              {t("roles.copy", "Copy role")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default RolesPage
