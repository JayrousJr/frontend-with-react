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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDate, formatDateTime } from "@/lib/format"
import type { PageView, VisitorStat } from "@/services/analytics"

type Paginated<T> = {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

type LoaderData = {
  stats: Paginated<VisitorStat>
  pageViews: Paginated<PageView>
}

const TABS = ["stats", "views"] as const

const VisitorsPage = () => {
  const { t } = useTranslation()
  const { stats, pageViews } = useLoaderData() as LoaderData
  const navigation = useNavigation()
  const [searchParams, setSearchParams] = useSearchParams()

  const tabParam = searchParams.get("tab")
  const activeTab = TABS.includes(tabParam as (typeof TABS)[number])
    ? (tabParam as (typeof TABS)[number])
    : "stats"

  const updateParams = (patch: Record<string, string>) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [key, value] of Object.entries(patch)) {
        if (value) next.set(key, value)
        else next.delete(key)
      }
      return next
    })

  const statColumns: ColumnDef<VisitorStat>[] = [
    {
      id: "date",
      header: t("visitorsPage.date"),
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      accessorKey: "path",
      header: t("visitorsPage.path"),
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.path}</span>
      ),
    },
    {
      id: "views",
      header: () => <div className="text-right">{t("visitorsPage.views")}</div>,
      cell: ({ row }) => (
        <div className="text-right">{row.original.viewCount}</div>
      ),
    },
    {
      id: "unique",
      header: () => (
        <div className="text-right">{t("visitorsPage.unique_visitors")}</div>
      ),
      cell: ({ row }) => (
        <div className="text-right">{row.original.uniqueVisitorCount}</div>
      ),
    },
  ]

  const viewColumns: ColumnDef<PageView>[] = [
    {
      id: "time",
      header: t("visitorsPage.time"),
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {formatDateTime(row.original.createdAt)}
        </span>
      ),
    },
    {
      accessorKey: "path",
      header: t("visitorsPage.path"),
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.path}</span>
      ),
    },
    {
      id: "referrer",
      header: t("visitorsPage.referrer"),
      cell: ({ row }) => (
        <span className="block max-w-48 truncate text-muted-foreground">
          {row.original.referrer || "—"}
        </span>
      ),
    },
    {
      id: "country",
      header: t("visitorsPage.country"),
      cell: ({ row }) => row.original.country || "—",
    },
    {
      id: "visitor",
      header: t("visitorsPage.visitor"),
      cell: ({ row }) =>
        row.original.userId ? (
          <Badge variant="secondary">{t("visitorsPage.registered")}</Badge>
        ) : (
          <Badge variant="outline">{t("visitorsPage.anonymous")}</Badge>
        ),
    },
  ]

  const sharedProps = {
    isLoading: navigation.state === "loading",
    onPageChange: (page: number) => updateParams({ page: String(page) }),
    onPageSizeChange: (size: number) => updateParams({ limit: String(size) }),
    searchPlaceholder: t("visitorsPage.search_placeholder"),
    searchValue: searchParams.get("q") ?? "",
    onSearch: (value: string) => updateParams({ q: value, page: "" }),
    onClearFilters: () => updateParams({ q: "", page: "" }),
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("visitorsPage.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("visitorsPage.subtitle")}
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(tab) => updateParams({ tab, page: "" })}
      >
        <TabsList>
          <TabsTrigger value="stats">{t("visitorsPage.stats_tab")}</TabsTrigger>
          <TabsTrigger value="views">{t("visitorsPage.views_tab")}</TabsTrigger>
        </TabsList>

        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle>{t("visitorsPage.stats_tab")}</CardTitle>
              <CardDescription>{t("visitorsPage.stats_text")}</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={statColumns}
                data={stats.data}
                total={stats.total}
                page={stats.page}
                pageSize={stats.limit}
                {...sharedProps}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="views">
          <Card>
            <CardHeader>
              <CardTitle>{t("visitorsPage.views_tab")}</CardTitle>
              <CardDescription>
                {t("visitorsPage.views_text", { count: pageViews.total })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={viewColumns}
                data={pageViews.data}
                total={pageViews.total}
                page={pageViews.page}
                pageSize={pageViews.limit}
                {...sharedProps}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default VisitorsPage
