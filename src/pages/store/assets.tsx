import { useEffect, useState } from "react"
import {
  Link,
  useLoaderData,
  useNavigate,
  useNavigation,
  useSearchParams,
} from "react-router"
import { useTranslation } from "react-i18next"
import type { ColumnDef } from "@tanstack/react-table"
import { PrinterIcon, ScanLineIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { DataTable } from "@/components/ui/data-table"
import { PageHeader } from "@/components/app/page-header"
import { ToneBadge } from "@/components/app/tone-badge"
import { useCodeLabel } from "@/components/app/use-code-label"
import { useAuth } from "@/context/auth-context"
import { P, hasPermission } from "@/lib/permissions"
import { ROUTES, withId } from "@/routes/routeConstants"
import { fetchCategories, type Category } from "@/services/products"
import {
  ASSET_STATUSES,
  fetchAssetByTag,
  type Asset,
  type Store,
} from "@/services/store"

type AssetPage = { data: Asset[]; total: number; page: number; limit: number }

/** Scanner input: a QR scanner types the tag and Enter (or type it). */
export function ScanBox() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [tag, setTag] = useState("")
  const [busy, setBusy] = useState(false)
  return (
    <form
      className="flex gap-2"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!tag.trim()) return
        setBusy(true)
        try {
          const a = await fetchAssetByTag(tag.trim())
          if (a) navigate(withId(ROUTES.ASSET_DETAILS, a.uniqueId))
          else
            toast.error(
              t("assets.tag_not_found", "No asset with tag {{tag}}", {
                tag: tag.trim(),
              })
            )
        } catch {
          toast.error(t("general_error"))
        } finally {
          setBusy(false)
        }
      }}
    >
      <Input
        className="sm:w-56"
        autoComplete="off"
        placeholder={t("assets.scan", "Scan or type a tag")}
        value={tag}
        onChange={(e) => setTag(e.target.value)}
      />
      <Button type="submit" variant="outline" disabled={busy}>
        <ScanLineIcon />
        {t("assets.find", "Find")}
      </Button>
    </form>
  )
}

const AssetsPage = () => {
  const { t } = useTranslation()
  const label = useCodeLabel()
  const { user } = useAuth()
  const { assets, stores } = useLoaderData() as {
    assets: AssetPage
    stores: Store[]
  }
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

  const columns: ColumnDef<Asset>[] = [
    {
      id: "tag",
      header: t("assets.tag", "Tag"),
      cell: ({ row }) => (
        <Link
          to={withId(ROUTES.ASSET_DETAILS, row.original.uniqueId)}
          className="font-mono text-sm font-medium hover:underline"
        >
          {row.original.tag}
          {row.original.isKit && (
            <span className="ml-1 font-sans text-xs text-muted-foreground">
              ({t("assets.kit", "kit")})
            </span>
          )}
        </Link>
      ),
    },
    {
      id: "product",
      header: t("products.product", "Product"),
      cell: ({ row }) => (
        <div>
          {row.original.product.name}
          <div className="text-xs text-muted-foreground">
            {[
              row.original.serialNumber,
              row.original.vehicle?.registrationNumber,
            ]
              .filter(Boolean)
              .join(" · ") || row.original.product.categoryName}
          </div>
        </div>
      ),
    },
    {
      id: "where",
      header: t("assets.where", "Where"),
      cell: ({ row }) =>
        row.original.custodian ? (
          <span className="text-sm">
            {row.original.custodian.fullName}
            <span className="block text-xs text-muted-foreground">
              {row.original.custodian.employeeNumber}
            </span>
          </span>
        ) : (
          <span className="text-sm">
            {row.original.store?.name ?? "—"}
            <span className="block text-xs text-muted-foreground">
              {row.original.location?.path}
            </span>
          </span>
        ),
    },
    {
      id: "condition",
      header: t("assets.condition", "Condition"),
      cell: ({ row }) => <ToneBadge code={row.original.condition} />,
    },
    {
      id: "status",
      header: t("common.status", "Status"),
      cell: ({ row }) => <ToneBadge code={row.original.status} />,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("assets.title", "Asset register")}
        description={t(
          "assets.subtitle",
          "Every company-owned unit of equipment and every vehicle, with its tag, location or holder and condition."
        )}
        actions={
          <>
            <ScanBox />
            {hasPermission(user, P.ASSET_TAG_PRINT) && (
              <Button variant="outline" asChild>
                <Link to={ROUTES.ASSET_TAGS}>
                  <PrinterIcon />
                  {t("nav.tags", "Asset tags")}
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
            data={assets.data}
            total={assets.total}
            page={assets.page}
            pageSize={assets.limit}
            isLoading={navigation.state === "loading"}
            onPageChange={(p) => update({ page: String(p) })}
            onPageSizeChange={(s) => update({ limit: String(s) })}
            searchPlaceholder={t(
              "assets.search",
              "Tag, serial, product or registration"
            )}
            searchValue={params.get("q") ?? ""}
            onSearch={(v) => update({ q: v, page: "" })}
            filters={[
              {
                key: "store",
                label: t("stores.store", "Store"),
                options: stores.map((s) => ({
                  value: s.uniqueId,
                  label: s.name,
                })),
              },
              {
                key: "status",
                label: t("common.status", "Status"),
                options: ASSET_STATUSES.map((s) => ({
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
                key: "vehicles",
                label: t("assets.vehicles", "Vehicles"),
                options: [
                  {
                    value: "yes",
                    label: t("assets.vehicles_only", "Vehicles only"),
                  },
                ],
              },
            ]}
            activeFilters={{
              store: params.get("store") ?? "",
              status: params.get("status") ?? "",
              category: params.get("category") ?? "",
              vehicles: params.get("vehicles") ?? "",
            }}
            onFilterChange={(k, v) => update({ [k]: v, page: "" })}
            onClearFilters={() =>
              update({
                q: "",
                store: "",
                status: "",
                category: "",
                vehicles: "",
                product: "",
                page: "",
              })
            }
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default AssetsPage
