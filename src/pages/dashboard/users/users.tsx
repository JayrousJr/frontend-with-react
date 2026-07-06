import { useState } from "react"
import {
  Link,
  useLoaderData,
  useNavigation,
  useRevalidator,
  useSearchParams,
} from "react-router"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import type { ColumnDef } from "@tanstack/react-table"
import { EyeIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
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
import { useAuth } from "@/context/auth-context"
import { PERMISSIONS, hasPermission } from "@/lib/permissions"
import { ROUTES } from "@/routes/routeConstants"
import { deleteUser, type User } from "@/services/users"

type LoaderData = {
  users: {
    data: User[]
    total: number
    page: number
    limit: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

const UsersPage = () => {
  const { t } = useTranslation()
  const { user: currentUser } = useAuth()
  const { users } = useLoaderData() as LoaderData
  const revalidator = useRevalidator()
  const navigation = useNavigation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [deletingUser, setDeletingUser] = useState<User | null>(null)

  const canDelete = hasPermission(currentUser, PERMISSIONS.USERS.DELETE)

  const updateParams = (patch: Record<string, string>) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [key, value] of Object.entries(patch)) {
        if (value) next.set(key, value)
        else next.delete(key)
      }
      return next
    })

  async function handleDelete() {
    if (!deletingUser) return
    try {
      const message = await deleteUser(deletingUser.uniqueId)
      toast.success(message)
      revalidator.revalidate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("general_error"))
    } finally {
      setDeletingUser(null)
    }
  }

  const columns: ColumnDef<User>[] = [
    {
      id: "name",
      header: t("usersPage.name"),
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.firstName} {row.original.lastName}
        </span>
      ),
    },
    {
      accessorKey: "email",
      header: t("usersPage.email"),
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.email}</span>
      ),
    },
    {
      id: "role",
      header: t("usersPage.role"),
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.role.name}</Badge>
      ),
    },
    {
      id: "status",
      header: t("usersPage.status"),
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "default" : "outline"}>
          {row.original.isActive ? t("rbac.active") : t("rbac.inactive")}
        </Badge>
      ),
    },
    {
      id: "verified",
      header: t("usersPage.verified"),
      cell: ({ row }) => (
        <Badge variant={row.original.emailVerifiedAt ? "default" : "outline"}>
          {row.original.emailVerifiedAt
            ? t("usersPage.verified")
            : t("usersPage.unverified")}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">{t("rbac.actions")}</div>,
      cell: ({ row }) => (
        <div className="text-right">
          <Button variant="ghost" size="icon" asChild>
            <Link
              to={ROUTES.USER_DETAILS.replace(
                ":uniqueId",
                row.original.uniqueId
              )}
            >
              <EyeIcon className="size-4" />
            </Link>
          </Button>
          {canDelete && row.original.uniqueId !== currentUser?.uniqueId && (
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive"
              onClick={() => setDeletingUser(row.original)}
            >
              <Trash2Icon className="size-4" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("usersPage.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("usersPage.subtitle")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("usersPage.title")}</CardTitle>
          <CardDescription>
            {t("usersPage.total", { count: users.total })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={users.data}
            total={users.total}
            page={users.page}
            pageSize={users.limit}
            isLoading={navigation.state === "loading"}
            onPageChange={(page) => updateParams({ page: String(page) })}
            onPageSizeChange={(size) => updateParams({ limit: String(size) })}
            searchPlaceholder={t("usersPage.search_placeholder")}
            searchValue={searchParams.get("q") ?? ""}
            onSearch={(value) => updateParams({ q: value, page: "" })}
            filters={[
              {
                key: "status",
                label: t("usersPage.status"),
                options: [
                  { label: t("rbac.active"), value: "active" },
                  { label: t("rbac.inactive"), value: "inactive" },
                ],
              },
              {
                key: "role",
                label: t("usersPage.role"),
                options: [
                  { label: "Admin", value: "ADMIN" },
                  { label: "Manager", value: "MANAGER" },
                  { label: "User", value: "USER" },
                ],
              },
            ]}
            activeFilters={{
              status: searchParams.get("status") ?? "",
              role: searchParams.get("role") ?? "",
            }}
            onFilterChange={(key, value) =>
              updateParams({ [key]: value, page: "" })
            }
            onClearFilters={() =>
              updateParams({ q: "", status: "", role: "", page: "" })
            }
          />
        </CardContent>
      </Card>

      <AlertDialog
        open={deletingUser !== null}
        onOpenChange={(open) => !open && setDeletingUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("usersPage.delete_user")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("usersPage.delete_user_confirm", {
                name: `${deletingUser?.firstName} ${deletingUser?.lastName}`,
              })}
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

export default UsersPage
