import { useState } from "react"
import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import { PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { PageHeader } from "@/components/app/page-header"
import { ToneBadge } from "@/components/app/tone-badge"
import { useCodeLabel } from "@/components/app/use-code-label"
import { useAuth } from "@/context/auth-context"
import { formatStamp } from "@/lib/format"
import { P, hasPermission } from "@/lib/permissions"
import { ROUTES, withId } from "@/routes/routeConstants"
import {
  PRODUCTION_STATUSES,
  fetchConfig,
  fetchProductions,
} from "@/services/production"
import { Loading } from "./ui"
import { useLoad } from "./utils"

const ProductionsPage = () => {
  const { t } = useTranslation()
  const label = useCodeLabel()
  const { user } = useAuth()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [departmentId, setDepartmentId] = useState("")
  const [mine, setMine] = useState(false)
  const cfg = useLoad(fetchConfig)
  const rows = useLoad(
    () =>
      fetchProductions({
        search,
        status: status || undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
        departmentId: departmentId ? Number(departmentId) : undefined,
        mine,
      }),
    [search, status, categoryId, departmentId, mine]
  )
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("productions.title", "Productions")}
        description={t(
          "productions.subtitle",
          "Every outside production starts as a request from a Producer and is approved by the Production Manager."
        )}
        actions={
          hasPermission(user, P.PRODUCTION_CREATE) && (
            <Button asChild>
              <Link to={ROUTES.PRODUCTION_NEW}>
                <PlusIcon />
                {t("productions.new", "New production request")}
              </Link>
            </Button>
          )
        }
      />
      <div className="flex flex-wrap gap-2">
        <Input
          className="w-56"
          placeholder={t("common.search", "Search number or title")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <NativeSelect
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <NativeSelectOption value="">
            {t("common.all_statuses", "All statuses")}
          </NativeSelectOption>
          {PRODUCTION_STATUSES.map((s) => (
            <NativeSelectOption key={s} value={s}>
              {label(s)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <NativeSelectOption value="">
            {t("productions.all_categories", "All categories")}
          </NativeSelectOption>
          {cfg.data?.categories.map((c) => (
            <NativeSelectOption key={c.id} value={String(c.id)}>
              {c.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
        >
          <NativeSelectOption value="">
            {t("productions.all_departments", "All departments")}
          </NativeSelectOption>
          {cfg.data?.departments.map((d) => (
            <NativeSelectOption key={d.id} value={String(d.id)}>
              {d.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button
          variant={mine ? "default" : "outline"}
          onClick={() => setMine(!mine)}
        >
          {t("productions.mine", "Mine only")}
        </Button>
      </div>
      <Card className="py-0">
        <CardContent className="divide-y p-0">
          {!rows.data && (
            <div className="p-6">
              <Loading error={rows.error} />
            </div>
          )}
          {rows.data?.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground">
              {t("productions.none", "No productions found.")}
            </p>
          )}
          {rows.data?.map((x) => (
            <Link
              key={x.uniqueId}
              to={withId(ROUTES.PRODUCTION_DETAILS, x.uniqueId)}
              className="block px-4 py-3 hover:bg-muted sm:px-6"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-medium">{x.number}</span>
                <span className="font-medium">{x.title}</span>
                <ToneBadge code={x.status} />
              </div>
              <div className="text-xs text-muted-foreground">
                {x.category} · {formatStamp(x.startAt)} – {formatStamp(x.endAt)}{" "}
                · {x.venues.join(", ") || "—"} ·{" "}
                {t("productions.producer", "Producer")} {x.producer}
                {x.departments.length > 0 && ` · ${x.departments.join(", ")}`}
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export default ProductionsPage
