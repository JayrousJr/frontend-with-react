import { useEffect, useState } from "react"
import { useSearchParams } from "react-router"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { PlusIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { FieldLabel } from "@/components/ui/field"
import { useAuth } from "@/context/auth-context"
import {
  PERMISSIONS,
  hasPermission,
  groupPermissionsByDomain,
} from "@/lib/permissions"
import {
  fetchRoles,
  fetchAllPermissions,
  createRole,
  updateRole,
  deleteRole,
  type Role,
  type PermissionEntity,
} from "@/services/roles"

const TABS = ["roles", "permissions"] as const
type Tab = (typeof TABS)[number]

const RolesPage = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const tabParam = searchParams.get("tab")
  const activeTab: Tab = TABS.includes(tabParam as Tab)
    ? (tabParam as Tab)
    : "roles"

  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<PermissionEntity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [deletingRole, setDeletingRole] = useState<Role | null>(null)

  const canManage = hasPermission(user, PERMISSIONS.ROLES.MANAGE)
  const canReadPermissions = hasPermission(user, PERMISSIONS.PERMISSIONS.READ)

  async function loadRoles() {
    const res = await fetchRoles({ page: 1, limit: 100 })
    setRoles(res.data)
  }

  useEffect(() => {
    async function load() {
      try {
        await loadRoles()
        if (canReadPermissions) {
          setPermissions(await fetchAllPermissions())
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("general_error"))
      } finally {
        setIsLoading(false)
      }
    }
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canReadPermissions])

  function openCreate() {
    setEditingRole(null)
    setDialogOpen(true)
  }

  function openEdit(role: Role) {
    setEditingRole(role)
    setDialogOpen(true)
  }

  async function handleDelete() {
    if (!deletingRole) return
    try {
      const message = await deleteRole(deletingRole.uniqueId)
      toast.success(message)
      await loadRoles()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("general_error"))
    } finally {
      setDeletingRole(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("rbac.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("rbac.subtitle")}</p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <PlusIcon />
            {t("rbac.new_role")}
          </Button>
        )}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          setSearchParams({ tab: value }, { replace: true })
        }
      >
        <TabsList variant="line">
          <TabsTrigger value="roles">{t("rbac.roles_tab")}</TabsTrigger>
          <TabsTrigger value="permissions">
            {t("rbac.permissions_tab")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <CardTitle>{t("rbac.roles_tab")}</CardTitle>
              <CardDescription>{t("rbac.roles_text")}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {t("actions.loading")}
                </p>
              ) : roles.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {t("rbac.no_roles")}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("rbac.name")}</TableHead>
                      <TableHead>{t("rbac.description")}</TableHead>
                      <TableHead>{t("rbac.permissions_tab")}</TableHead>
                      <TableHead>{t("rbac.status")}</TableHead>
                      {canManage && (
                        <TableHead className="text-right">
                          {t("rbac.actions")}
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles.map((role) => (
                      <TableRow key={role.uniqueId}>
                        <TableCell className="font-medium">
                          {role.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {role.description ?? "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex max-w-md flex-wrap gap-1">
                            {role.permissions.length === 0 ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              role.permissions.map((permission) => (
                                <Badge
                                  key={permission.uniqueId}
                                  variant="secondary"
                                >
                                  {permission.name}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={role.isActive ? "default" : "outline"}
                          >
                            {role.isActive
                              ? t("rbac.active")
                              : t("rbac.inactive")}
                          </Badge>
                        </TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(role)}
                            >
                              <PencilIcon className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => setDeletingRole(role)}
                            >
                              <Trash2Icon className="size-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle>{t("rbac.permissions_tab")}</CardTitle>
              <CardDescription>{t("rbac.permissions_text")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!canReadPermissions ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {t("rbac.permissions_forbidden")}
                </p>
              ) : permissions.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {isLoading ? t("actions.loading") : t("rbac.no_permissions")}
                </p>
              ) : (
                Object.entries(groupPermissionsByDomain(permissions)).map(
                  ([domain, domainPermissions]) => (
                    <div key={domain}>
                      <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase">
                        {domain}
                      </h3>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {domainPermissions.map((permission) => (
                          <div
                            key={permission.uniqueId}
                            className="rounded-lg border p-3"
                          >
                            <div className="flex items-center justify-between">
                              <code className="text-sm font-medium">
                                {permission.name}
                              </code>
                              <Badge
                                variant={
                                  permission.isActive ? "default" : "outline"
                                }
                              >
                                {permission.isActive
                                  ? t("rbac.active")
                                  : t("rbac.inactive")}
                              </Badge>
                            </div>
                            {permission.description && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                {permission.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                )
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <RoleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        role={editingRole}
        permissions={permissions}
        onSaved={loadRoles}
      />

      <AlertDialog
        open={deletingRole !== null}
        onOpenChange={(open) => !open && setDeletingRole(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("rbac.delete_role")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("rbac.delete_role_confirm", { name: deletingRole?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDelete}
            >
              {t("rbac.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

type RoleDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: Role | null
  permissions: PermissionEntity[]
  onSaved: () => Promise<void>
}

const RoleDialog = ({
  open,
  onOpenChange,
  role,
  permissions,
  onSaved,
}: RoleDialogProps) => {
  const { t } = useTranslation()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)

  // Re-seed the form each time the dialog opens for a different role
  useEffect(() => {
    if (!open) return
    setName(role?.name ?? "")
    setDescription(role?.description ?? "")
    setSelected(new Set(role?.permissions.map((p) => p.name) ?? []))
  }, [open, role])

  function togglePermission(permissionName: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(permissionName)
      else next.delete(permissionName)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    try {
      const res = role
        ? await updateRole({
            uniqueId: role.uniqueId,
            name,
            description,
            permissionNames: [...selected],
          })
        : await createRole({
            name,
            description,
            permissionNames: [...selected],
          })
      toast.success(res.message)
      onOpenChange(false)
      await onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("general_error"))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {role ? t("rbac.edit_role") : t("rbac.new_role")}
            </DialogTitle>
            <DialogDescription>{t("rbac.role_dialog_text")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <FieldLabel htmlFor="role-name">{t("rbac.name")}</FieldLabel>
            <Input
              id="role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="role-description">
              {t("rbac.description")}
            </FieldLabel>
            <Textarea
              id="role-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {permissions.length > 0 && (
            <div className="space-y-3">
              <FieldLabel>{t("rbac.permissions_tab")}</FieldLabel>
              {Object.entries(groupPermissionsByDomain(permissions)).map(
                ([domain, domainPermissions]) => (
                  <div key={domain}>
                    <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase">
                      {domain}
                    </p>
                    <div className="grid gap-1 sm:grid-cols-2">
                      {domainPermissions.map((permission) => (
                        <label
                          key={permission.uniqueId}
                          className="flex cursor-pointer items-center gap-2 rounded-md p-1.5 text-sm hover:bg-muted"
                        >
                          <Checkbox
                            checked={selected.has(permission.name)}
                            onCheckedChange={(checked) =>
                              togglePermission(
                                permission.name,
                                checked === true
                              )
                            }
                          />
                          <code>{permission.name}</code>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? t("actions.saving") : t("actions.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default RolesPage
