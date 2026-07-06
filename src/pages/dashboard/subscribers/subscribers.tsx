import { useLoaderData, useNavigation, useSearchParams } from "react-router"
import { useTranslation } from "react-i18next"
import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import { formatDate } from "@/lib/format"
import type { NewsletterSubscriber } from "@/services/newsletter"

type LoaderData = {
  subscribers: {
    data: NewsletterSubscriber[]
    total: number
    page: number
    limit: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

const SubscribersPage = () => {
  const { t } = useTranslation()
  const { subscribers } = useLoaderData() as LoaderData
  const navigation = useNavigation()
  const [searchParams, setSearchParams] = useSearchParams()

  const updateParams = (patch: Record<string, string>) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [key, value] of Object.entries(patch)) {
        if (value) next.set(key, value)
        else next.delete(key)
      }
      return next
    })

  const columns: ColumnDef<NewsletterSubscriber>[] = [
    {
      id: "name",
      header: t("subscribersPage.name"),
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.firstName} {row.original.lastName}
        </span>
      ),
    },
    {
      accessorKey: "email",
      header: t("subscribersPage.email"),
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.email}</span>
      ),
    },
    {
      id: "status",
      header: t("subscribersPage.status"),
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "default" : "outline"}>
          {row.original.isActive ? t("rbac.active") : t("rbac.inactive")}
        </Badge>
      ),
    },
    {
      id: "subscribedAt",
      header: t("subscribersPage.subscribed_at"),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("subscribersPage.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("subscribersPage.subtitle")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("subscribersPage.title")}</CardTitle>
          <CardDescription>
            {t("subscribersPage.total", { count: subscribers.total })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={subscribers.data}
            total={subscribers.total}
            page={subscribers.page}
            pageSize={subscribers.limit}
            isLoading={navigation.state === "loading"}
            onPageChange={(page) => updateParams({ page: String(page) })}
            onPageSizeChange={(size) => updateParams({ limit: String(size) })}
            searchPlaceholder={t("subscribersPage.search_placeholder")}
            searchValue={searchParams.get("q") ?? ""}
            onSearch={(value) => updateParams({ q: value, page: "" })}
            filters={[
              {
                key: "status",
                label: t("subscribersPage.status"),
                options: [
                  { label: t("rbac.active"), value: "active" },
                  { label: t("rbac.inactive"), value: "inactive" },
                ],
              },
            ]}
            activeFilters={{ status: searchParams.get("status") ?? "" }}
            onFilterChange={(key, value) =>
              updateParams({ [key]: value, page: "" })
            }
            onClearFilters={() => updateParams({ q: "", status: "", page: "" })}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default SubscribersPage
