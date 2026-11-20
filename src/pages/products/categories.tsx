import { useState } from "react"
import { useLoaderData, useRevalidator } from "react-router"
import { useTranslation } from "react-i18next"
import { PencilIcon, PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader } from "@/components/app/page-header"
import { ActiveBadge } from "@/components/app/status-badge"
import { useRun } from "@/components/app/use-run"
import { saveCategory, type Category } from "@/services/products"

function CategoryDialog({
  category,
  onClose,
  onSaved,
}: {
  category: Category | null
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const run = useRun()
  const [code, setCode] = useState(category?.code ?? "")
  const [name, setName] = useState(category?.name ?? "")
  const [prefix, setPrefix] = useState(category?.tagPrefix ?? "")
  const [active, setActive] = useState(category?.isActive ?? true)
  const [criteria, setCriteria] = useState(
    (category?.criteria ?? [])
      .filter((c) => c.isActive)
      .map((c) => c.text)
      .join("\n")
  )
  const [busy, setBusy] = useState(false)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {category
              ? t("categories.edit", "Edit category")
              : t("categories.new", "New category")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "categories.hint",
              "Products are grouped by category; its receiving criteria form a library departments pick from."
            )}
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="c-code">
                {t("common.code", "Code")}
              </FieldLabel>
              <Input
                id="c-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="c-name">
                {t("common.name", "Name")}
              </FieldLabel>
              <Input
                id="c-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="c-prefix">
              {t("categories.prefix", "Asset tag prefix")}
            </FieldLabel>
            <Input
              id="c-prefix"
              className="max-w-32"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.toUpperCase())}
            />
            <FieldDescription>
              {t(
                "categories.prefix_hint",
                "Tags read AZM-{{p}}-000123. Fixed once tags are issued.",
                { p: prefix || "CAM" }
              )}
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="c-crit">
              {t("categories.criteria", "Receiving criteria (one per line)")}
            </FieldLabel>
            <Textarea
              id="c-crit"
              rows={7}
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={active} onCheckedChange={setActive} />
            {t("common.active", "Active")}
          </label>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("actions.cancel", "Cancel")}
          </Button>
          <Button
            disabled={
              busy ||
              code.length < 2 ||
              name.trim().length < 2 ||
              prefix.length < 2
            }
            onClick={async () => {
              setBusy(true)
              const ok = await run(
                () =>
                  saveCategory({
                    uniqueId: category?.uniqueId,
                    code,
                    name: name.trim(),
                    tagPrefix: prefix,
                    isActive: active,
                    criteria: criteria
                      .split("\n")
                      .map((c) => c.trim())
                      .filter((c) => c.length >= 3),
                  }),
                t("common.saved", "Saved")
              )
              setBusy(false)
              if (ok) onSaved()
            }}
          >
            {t("common.save", "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const CategoriesPage = () => {
  const { t } = useTranslation()
  const { revalidate } = useRevalidator()
  const { categories } = useLoaderData() as { categories: Category[] }
  const [editing, setEditing] = useState<Category | null | "new">(null)
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("categories.title", "Product categories")}
        description={t(
          "categories.subtitle",
          "Categories, asset tag series and the receiving-criteria library."
        )}
        actions={
          <Button onClick={() => setEditing("new")}>
            <PlusIcon />
            {t("categories.new", "New category")}
          </Button>
        }
      />
      <Card>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.code", "Code")}</TableHead>
                <TableHead>{t("common.name", "Name")}</TableHead>
                <TableHead>
                  {t("categories.prefix", "Asset tag prefix")}
                </TableHead>
                <TableHead className="text-right">
                  {t("categories.criteria_n", "Criteria")}
                </TableHead>
                <TableHead>{t("common.status", "Status")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((c) => (
                <TableRow key={c.uniqueId}>
                  <TableCell className="font-mono text-xs">{c.code}</TableCell>
                  <TableCell>{c.name}</TableCell>
                  <TableCell className="font-mono text-xs">
                    AZM-{c.tagPrefix}-…
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.criteria.filter((x) => x.isActive).length}
                  </TableCell>
                  <TableCell>
                    <ActiveBadge active={c.isActive} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("actions.edit", "Edit")}
                      onClick={() => setEditing(c)}
                    >
                      <PencilIcon />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {editing && (
        <CategoryDialog
          category={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            revalidate()
          }}
        />
      )}
    </div>
  )
}

export default CategoriesPage
