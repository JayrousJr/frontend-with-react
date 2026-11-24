import { useState } from "react"
import { Link, useNavigate } from "react-router"
import { useTranslation } from "react-i18next"
import { PlusIcon, SearchIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader } from "@/components/app/page-header"
import { ToneBadge } from "@/components/app/tone-badge"
import { useRun } from "@/components/app/use-run"
import { useAuth } from "@/context/auth-context"
import { formatDay } from "@/lib/format"
import { P, hasPermission } from "@/lib/permissions"
import { ROUTES, withId } from "@/routes/routeConstants"
import { fetchCategories } from "@/services/products"
import {
  createVendor,
  fetchVendors,
  type Vendor,
  type VendorInput,
} from "@/services/procurement"
import { FormDialog, Loading } from "./shared"
import { useLoad } from "./shared-utils"

/** Vendor fields + categories; used for create and edit. */
export function VendorForm({
  value,
  onChange,
}: {
  value: VendorInput
  onChange: (v: VendorInput) => void
}) {
  const { t } = useTranslation()
  const cats = useLoad(() => fetchCategories())
  const set = (k: keyof VendorInput, v: string) =>
    onChange({ ...value, [k]: v })
  const field = (k: keyof VendorInput, label: string, type = "text") => (
    <Field>
      <FieldLabel htmlFor={`vf-${k}`}>{label}</FieldLabel>
      <Input
        id={`vf-${k}`}
        type={type}
        value={(value[k] as string) ?? ""}
        onChange={(e) => set(k, e.target.value)}
      />
    </Field>
  )
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {field("name", t("vendors.name", "Company name"))}
        {field("email", t("vendors.email", "Company email"), "email")}
        {field("tin", t("vendors.tin", "TIN"))}
        {field("vrn", t("vendors.vrn", "VRN"))}
        {field("phone", t("vendors.phone", "Phone"))}
        {field("contactPerson", t("vendors.contact", "Contact person"))}
        {field("address", t("vendors.address", "Address"))}
        {field(
          "registeredAt",
          t("vendors.registered", "Registered on (default today)"),
          "date"
        )}
      </div>
      <Field>
        <FieldLabel>
          {t("vendors.categories", "Supplies these categories")}
        </FieldLabel>
        <div className="grid gap-2 sm:grid-cols-2">
          {(cats.data ?? []).map((c) => (
            <label key={c.uniqueId} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={value.categoryUniqueIds.includes(c.uniqueId)}
                onCheckedChange={(on) =>
                  onChange({
                    ...value,
                    categoryUniqueIds: on
                      ? [...value.categoryUniqueIds, c.uniqueId]
                      : value.categoryUniqueIds.filter((x) => x !== c.uniqueId),
                  })
                }
              />
              {c.name}
            </label>
          ))}
        </div>
      </Field>
      <Field>
        <FieldLabel htmlFor="vf-note">{t("common.note", "Note")}</FieldLabel>
        <Textarea
          id="vf-note"
          rows={2}
          value={value.note ?? ""}
          onChange={(e) => set("note", e.target.value)}
        />
      </Field>
    </div>
  )
}

const emptyVendor: VendorInput = {
  name: "",
  email: "",
  categoryUniqueIds: [],
}

const VendorsPage = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const run = useRun()
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [q, setQ] = useState("")
  const rows = useLoad(() => fetchVendors(q), [q])
  const [creating, setCreating] = useState<VendorInput | null>(null)
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("vendors.title", "Vendors")}
        description={t(
          "vendors.subtitle",
          "Registered by Procurement after the outside application. Valid 2 years; expired or suspended vendors can sign in but cannot bid. Goods only, TZS only."
        )}
        actions={
          hasPermission(user, P.VENDOR_MANAGE) && (
            <Button onClick={() => setCreating(emptyVendor)}>
              <PlusIcon />
              {t("vendors.new", "Register vendor")}
            </Button>
          )
        }
      />
      <form
        className="flex max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          setQ(search)
        }}
      >
        <Input
          placeholder={t("vendors.search", "Name, number or TIN")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button
          type="submit"
          variant="outline"
          size="icon"
          aria-label={t("actions.search", "Search")}
        >
          <SearchIcon />
        </Button>
      </form>
      <Card className="py-0">
        <CardContent className="overflow-x-auto p-0">
          {!rows.data ? (
            <div className="p-6">
              <Loading error={rows.error} />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("vendors.vendor", "Vendor")}</TableHead>
                  <TableHead>
                    {t("vendors.categories_short", "Categories")}
                  </TableHead>
                  <TableHead>
                    {t("vendors.valid_until", "Valid until")}
                  </TableHead>
                  <TableHead>{t("common.status", "Status")}</TableHead>
                  <TableHead>{t("vendors.users", "Portal users")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      {t("vendors.none", "No vendors yet.")}
                    </TableCell>
                  </TableRow>
                )}
                {rows.data.map((v: Vendor) => (
                  <TableRow key={v.uniqueId}>
                    <TableCell>
                      <Link
                        className="font-medium hover:underline"
                        to={withId(ROUTES.VENDOR_DETAILS, v.uniqueId)}
                      >
                        {v.name}
                      </Link>
                      <div className="font-mono text-xs text-muted-foreground">
                        {v.number}
                        {v.tin && ` · TIN ${v.tin}`}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {v.categories.map((c) => c.name).join(", ")}
                    </TableCell>
                    <TableCell className={v.expired ? "text-destructive" : ""}>
                      {formatDay(v.validUntil)}
                    </TableCell>
                    <TableCell>
                      <ToneBadge
                        code={
                          v.expired && v.status === "ACTIVE"
                            ? "EXPIRED"
                            : v.status
                        }
                      />
                    </TableCell>
                    <TableCell>{v.users.length}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {creating && (
        <FormDialog
          wide
          title={t("vendors.new", "Register vendor")}
          confirmLabel={t("actions.save", "Save")}
          canConfirm={
            !!creating.name.trim() &&
            creating.email.includes("@") &&
            creating.categoryUniqueIds.length > 0
          }
          onClose={() => setCreating(null)}
          onConfirm={async () => {
            let id = ""
            const ok = await run(
              async () => {
                id = (await createVendor(creating)).uniqueId
              },
              t("vendors.created", "Vendor registered")
            )
            if (ok) navigate(withId(ROUTES.VENDOR_DETAILS, id))
            return ok
          }}
        >
          <VendorForm value={creating} onChange={setCreating} />
        </FormDialog>
      )}
    </div>
  )
}

export default VendorsPage
