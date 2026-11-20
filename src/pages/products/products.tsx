import { useEffect, useState } from "react"
import {
  Link,
  useLoaderData,
  useNavigation,
  useSearchParams,
} from "react-router"
import { useTranslation } from "react-i18next"
import type { ColumnDef } from "@tanstack/react-table"
import { FileSpreadsheetIcon, PlusIcon, TagsIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import { PageHeader } from "@/components/app/page-header"
import { ToneBadge } from "@/components/app/tone-badge"
import { useCodeLabel } from "@/components/app/use-code-label"
import { useAuth } from "@/context/auth-context"
import { P, hasPermission } from "@/lib/permissions"
import { ROUTES, withId } from "@/routes/routeConstants"
import {
  fetchCategories,
  PRODUCT_STATUSES,
  type Category,
  type ProductSummary,
} from "@/services/products"

type ProductPage = {
  data: ProductSummary[]
  total: number
  page: number
  limit: number
}

const ProductsPage = () => {
  const { t } = useTranslation()
  const label = useCodeLabel()
  const { user } = useAuth()
  const { products } = useLoaderData() as { products: ProductPage }
  const navigation = useNavigation()
  const [params, setParams] = useSearchParams()
  const [categories, setCategories] = useState<Category[]>([])
  useEffect(() => void fetchCategories().then(setCategories), [])

  const update = (patch: Record<string, string>) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v)
        else next.delete(k)
      }
      return next
    })

  const columns: ColumnDef<ProductSummary>[] = [
    {
      id: "name",
      header: t("products.product", "Product"),
      cell: ({ row }) => (
        <Link
          to={withId(ROUTES.PRODUCT_DETAILS, row.original.uniqueId)}
          className="group block"
        >
          <div className="font-medium group-hover:underline">
            {row.original.name}
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            {row.original.code ?? t("products.no_code", "No code yet")}
          </div>
        </Link>
      ),
    },
    {
      id: "category",
      header: t("products.category", "Category"),
      cell: ({ row }) => row.original.categoryName,
    },
    {
      id: "owner",
      header: t("products.owner", "Owning department"),
      cell: ({ row }) => row.original.departmentName,
    },
    {
      id: "type",
      header: t("products.item_type", "Store item type"),
      cell: ({ row }) =>
        row.original.itemType ? (
          <span className="text-sm">
            {label(row.original.itemType)}
            <span className="block text-xs text-muted-foreground">
              {row.original.trackingType && label(row.original.trackingType)}
            </span>
          </span>
        ) : (
          "—"
        ),
    },
    {
      id: "status",
      header: t("common.status", "Status"),
      cell: ({ row }) => (
        <div className="flex flex-wrap items-center gap-1">
          <ToneBadge code={row.original.status} />
          {row.original.hasPendingVersion && (
            <Badge variant="secondary">
              {t("products.new_version_open", "New version open")}
            </Badge>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("products.title", "Product Repository")}
        description={t(
          "products.subtitle",
          "One shared catalogue. Each department creates and owns its products; every Active product is visible to all, so search before you create."
        )}
        actions={
          <>
            {hasPermission(user, P.ITEM_CATEGORY_MANAGE) && (
              <Button variant="outline" asChild>
                <Link to={ROUTES.PRODUCT_CATEGORIES}>
                  <TagsIcon />
                  {t("products.categories", "Categories")}
                </Link>
              </Button>
            )}
            {hasPermission(user, P.ITEM_IMPORT) && (
              <Button variant="outline" asChild>
                <Link to={ROUTES.PRODUCT_IMPORT}>
                  <FileSpreadsheetIcon />
                  {t("products.import", "Import")}
                </Link>
              </Button>
            )}
            {hasPermission(user, P.ITEM_CREATE) && (
              <Button asChild>
                <Link to={ROUTES.PRODUCT_NEW}>
                  <PlusIcon />
                  {t("products.new", "New product")}
                </Link>
              </Button>
            )}
          </>
        }
      />
      <Card>
        <CardContent>
          <DataTable
            columns={columns}
            data={products.data}
            total={products.total}
            page={products.page}
            pageSize={products.limit}
            isLoading={navigation.state === "loading"}
            onPageChange={(p) => update({ page: String(p) })}
            onPageSizeChange={(s) => update({ limit: String(s) })}
            searchPlaceholder={t("products.search", "Search name or code")}
            searchValue={params.get("q") ?? ""}
            onSearch={(v) => update({ q: v, page: "" })}
            filters={[
              {
                key: "status",
                label: t("common.status", "Status"),
                options: PRODUCT_STATUSES.map((s) => ({
                  value: s,
                  label: label(s),
                })),
              },
              {
                key: "category",
                label: t("products.category", "Category"),
                options: categories.map((c) => ({
                  value: c.uniqueId,
                  label: c.name,
                })),
              },
              {
                key: "pending",
                label: t("products.approval", "Approval"),
                options: [
                  {
                    value: "yes",
                    label: t("products.waiting", "Waiting for activation"),
                  },
                ],
              },
            ]}
            activeFilters={{
              status: params.get("status") ?? "",
              category: params.get("category") ?? "",
              pending: params.get("pending") ?? "",
            }}
            onFilterChange={(k, v) => update({ [k]: v, page: "" })}
            onClearFilters={() =>
              update({ q: "", status: "", category: "", pending: "", page: "" })
            }
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default ProductsPage
