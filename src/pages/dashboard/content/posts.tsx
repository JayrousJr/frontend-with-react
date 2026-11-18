import {
  Link,
  useLoaderData,
  useNavigation,
  useSearchParams,
} from "react-router"
import { useTranslation } from "react-i18next"
import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import { formatDate } from "@/lib/format"
import { ROUTES } from "@/routes/routeConstants"
import type { Post } from "@/services/content"

type LoaderData = {
  posts: {
    data: Post[]
    total: number
    page: number
    limit: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  PUBLISHED: "default",
  DRAFT: "secondary",
  ARCHIVED: "outline",
}

const PostsPage = () => {
  const { t } = useTranslation()
  const { posts } = useLoaderData() as LoaderData
  const navigation = useNavigation()
  const [searchParams, setSearchParams] = useSearchParams()

  const columns: ColumnDef<Post>[] = [
    {
      accessorKey: "title",
      header: t("content.columns.title"),
      cell: ({ row }) => (
        <Link
          to={`/content/${row.original.uniqueId}`}
          className="font-medium hover:underline"
        >
          {row.original.title}
        </Link>
      ),
    },
    {
      accessorKey: "slug",
      header: t("content.columns.slug"),
      cell: ({ row }) => (
        <code className="text-xs text-muted-foreground">
          /blog/{row.original.slug}
        </code>
      ),
    },
    {
      accessorKey: "status",
      header: t("content.columns.status"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant[row.original.status] ?? "secondary"}>
            {row.original.status}
          </Badge>
          {row.original.noIndex && (
            <Badge variant="outline">{t("content.noindex")}</Badge>
          )}
        </div>
      ),
    },
    { accessorKey: "locale", header: t("content.columns.locale") },
    {
      accessorKey: "publishedAt",
      header: t("content.columns.published"),
      cell: ({ row }) =>
        row.original.publishedAt ? formatDate(row.original.publishedAt) : "—",
    },
  ]

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t("content.title")}</CardTitle>
          <CardDescription>{t("content.subtitle")}</CardDescription>
        </div>
        <Button asChild>
          <Link to={ROUTES.POST_NEW}>{t("content.new_post")}</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={posts.data}
          isLoading={navigation.state === "loading"}
          total={posts.total}
          page={posts.page}
          pageSize={posts.limit}
          onPageChange={(page) =>
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev)
              next.set("page", String(page))
              return next
            })
          }
          onPageSizeChange={(size) =>
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev)
              next.set("limit", String(size))
              next.set("page", "1")
              return next
            })
          }
          searchValue={searchParams.get("q") ?? ""}
          searchPlaceholder={t("content.search_placeholder")}
          onSearch={(value) =>
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev)
              if (value) next.set("q", value)
              else next.delete("q")
              next.set("page", "1")
              return next
            })
          }
        />
      </CardContent>
    </Card>
  )
}

export default PostsPage
