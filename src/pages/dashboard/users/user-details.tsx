import { useEffect, useState } from "react"
import { Link, useLoaderData, useRevalidator } from "react-router"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { ArrowLeftIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/context/auth-context"
import {
  PERMISSIONS,
  hasPermission,
  groupPermissionsByDomain,
} from "@/lib/permissions"
import { ROUTES } from "@/routes/routeConstants"
import { assignUserRole, setUserPermissions, type User } from "@/services/users"
import {
  fetchRoles,
  fetchAllPermissions,
  type Role,
  type PermissionEntity,
} from "@/services/roles"

type LoaderData = { user: User }

const UserDetailsPage = () => {
  const { t } = useTranslation()
  const { user: currentUser } = useAuth()
  const { user } = useLoaderData() as LoaderData
  const revalidator = useRevalidator()

  const canManageRoles = hasPermission(currentUser, PERMISSIONS.ROLES.MANAGE)
  const canManagePermissions = hasPermission(
    currentUser,
    PERMISSIONS.PERMISSIONS.MANAGE
  )
  const canReadRoles = hasPermission(currentUser, PERMISSIONS.ROLES.READ)
  const canReadPermissions = hasPermission(
    currentUser,
    PERMISSIONS.PERMISSIONS.READ
  )

  const [roles, setRoles] = useState<Role[]>([])
  const [allPermissions, setAllPermissions] = useState<PermissionEntity[]>([])
  const [selectedRole, setSelectedRole] = useState(user.role.name)
  const [directGrants, setDirectGrants] = useState<Set<string>>(
    new Set(user.permissions.map((p) => p.name))
  )
  const [isAssigning, setIsAssigning] = useState(false)
  const [isSavingGrants, setIsSavingGrants] = useState(false)

  // Loader data changes after revalidation — keep local editors in sync
  useEffect(() => {
    setSelectedRole(user.role.name)
    setDirectGrants(new Set(user.permissions.map((p) => p.name)))
  }, [user])

  useEffect(() => {
    async function load() {
      try {
        if (canManageRoles && canReadRoles) {
          const res = await fetchRoles({ page: 1, limit: 100 })
          setRoles(res.data)
        }
        if (canManagePermissions && canReadPermissions) {
          setAllPermissions(await fetchAllPermissions())
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("general_error"))
      }
    }
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageRoles, canManagePermissions, canReadRoles, canReadPermissions])

  async function handleAssignRole() {
    setIsAssigning(true)
    try {
      const res = await assignUserRole(user.uniqueId, selectedRole)
      toast.success(res.message)
      revalidator.revalidate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("general_error"))
    } finally {
      setIsAssigning(false)
    }
  }

  async function handleSaveGrants() {
    setIsSavingGrants(true)
    try {
      const res = await setUserPermissions(user.uniqueId, [...directGrants])
      toast.success(res.message)
      revalidator.revalidate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("general_error"))
    } finally {
      setIsSavingGrants(false)
    }
  }

  function toggleGrant(permissionName: string, checked: boolean) {
    setDirectGrants((prev) => {
      const next = new Set(prev)
      if (checked) next.add(permissionName)
      else next.delete(permissionName)
      return next
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to={ROUTES.USERS}>
            <ArrowLeftIcon className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {user.firstName} {user.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("usersPage.details_title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">
                {t("usersPage.role")}
              </p>
              <Badge variant="secondary" className="mt-1">
                {user.role.name}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("usersPage.status")}
              </p>
              <Badge
                variant={user.isActive ? "default" : "outline"}
                className="mt-1"
              >
                {user.isActive ? t("rbac.active") : t("rbac.inactive")}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("usersPage.verified")}
              </p>
              <Badge
                variant={user.emailVerifiedAt ? "default" : "outline"}
                className="mt-1"
              >
                {user.emailVerifiedAt
                  ? t("usersPage.verified")
                  : t("usersPage.unverified")}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("profile.locale")}
              </p>
              <p className="mt-1 text-sm font-medium uppercase">
                {user.preferredLocale}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {canManageRoles && (
        <Card>
          <CardHeader>
            <CardTitle>{t("rbac.assign_role")}</CardTitle>
            <CardDescription>{t("rbac.assign_role_text")}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(roles.length > 0
                  ? roles.map((role) => role.name)
                  : [user.role.name]
                ).map((roleName) => (
                  <SelectItem key={roleName} value={roleName}>
                    {roleName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAssignRole}
              disabled={isAssigning || selectedRole === user.role.name}
            >
              {isAssigning ? t("actions.updating") : t("rbac.assign_role")}
            </Button>
          </CardContent>
        </Card>
      )}

      {canManagePermissions && allPermissions.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t("rbac.direct_permissions")}</CardTitle>
              <CardDescription>
                {t("rbac.direct_permissions_text")}
              </CardDescription>
            </div>
            <Button onClick={handleSaveGrants} disabled={isSavingGrants}>
              {isSavingGrants ? t("actions.saving") : t("actions.save")}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(groupPermissionsByDomain(allPermissions)).map(
              ([domain, domainPermissions]) => (
                <div key={domain}>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase">
                    {domain}
                  </p>
                  <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                    {domainPermissions.map((permission) => (
                      <label
                        key={permission.uniqueId}
                        className="flex cursor-pointer items-center gap-2 rounded-md p-1.5 text-sm hover:bg-muted"
                      >
                        <Checkbox
                          checked={directGrants.has(permission.name)}
                          onCheckedChange={(checked) =>
                            toggleGrant(permission.name, checked === true)
                          }
                        />
                        <code>{permission.name}</code>
                      </label>
                    ))}
                  </div>
                </div>
              )
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("rbac.effective_permissions")}</CardTitle>
          <CardDescription>
            {t("rbac.effective_permissions_text")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user.allPermissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("rbac.no_permissions")}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {user.allPermissions.map((permission) => (
                  <Badge key={permission.uniqueId} variant="secondary">
                    {permission.name}
                  </Badge>
                ))}
              </div>
              {user.permissions.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <p className="mb-2 text-xs text-muted-foreground">
                    {t("rbac.direct_permissions")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {user.permissions.map((permission) => (
                      <Badge key={permission.uniqueId} variant="outline">
                        {permission.name}
                      </Badge>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default UserDetailsPage
