import { useEffect, useMemo, useState } from "react"
import { Link, useLoaderData, useNavigate } from "react-router"
import { useTranslation } from "react-i18next"
import {
  AlertTriangleIcon,
  PaperclipIcon,
  PlusIcon,
  SendIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { PageHeader } from "@/components/app/page-header"
import { ToneBadge } from "@/components/app/tone-badge"
import { useCodeLabel } from "@/components/app/use-code-label"
import { useRun } from "@/components/app/use-run"
import { useAuth } from "@/context/auth-context"
import { formatFileSize } from "@/lib/format"
import { P, hasPermission } from "@/lib/permissions"
import { ROUTES, withId } from "@/routes/routeConstants"
import { fetchDepartments, type Department } from "@/services/org"
import {
  createProduct,
  fetchSimilarProducts,
  submitProduct,
  updateProductDraft,
  uploadFile,
  SPEC_RULES,
  type Category,
  type Product,
  type ProductSummary,
  type SpecRule,
  type UploadedFile,
  type VersionInput,
} from "@/services/products"

type SpecRow = {
  attribute: string
  rule: SpecRule
  value: string
  valueMax: string
  unit: string
}

const emptySpec = (): SpecRow => ({
  attribute: "",
  rule: "EXACT",
  value: "",
  valueMax: "",
  unit: "",
})

/** Create a product, or edit the open (draft / returned) version. */
const ProductFormPage = () => {
  const { t } = useTranslation()
  const label = useCodeLabel()
  const run = useRun()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { product, categories } = useLoaderData() as {
    product: Product | null
    categories: Category[]
  }
  const v = product?.pending ?? null

  const [name, setName] = useState(v?.name ?? "")
  const [description, setDescription] = useState(v?.description ?? "")
  const [categoryId, setCategoryId] = useState(v?.category.uniqueId ?? "")
  const [unit, setUnit] = useState(v?.unit ?? "pcs")
  const [price, setPrice] = useState(
    v?.referencePrice != null ? String(v.referencePrice) : ""
  )
  const [specs, setSpecs] = useState<SpecRow[]>(
    v?.specs.length
      ? v.specs.map((s) => ({
          attribute: s.attribute,
          rule: s.rule,
          value: s.value,
          valueMax: s.valueMax ?? "",
          unit: s.unit ?? "",
        }))
      : [emptySpec()]
  )
  // Criteria: texts; library ones are matched by text.
  const [criteria, setCriteria] = useState<string[]>(
    v?.criteria.map((c) => c.text) ?? []
  )
  const [customCriterion, setCustomCriterion] = useState("")
  const [files, setFiles] = useState<UploadedFile[]>(v?.attachments ?? [])
  const [uploading, setUploading] = useState(false)
  const [departmentId, setDepartmentId] = useState(
    product?.owningDepartment.uniqueId ?? user?.department.uniqueId ?? ""
  )
  const [departments, setDepartments] = useState<Department[]>([])
  const [similar, setSimilar] = useState<ProductSummary[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!product && hasPermission(user, P.DEPARTMENT_VIEW)) {
      void fetchDepartments().then(setDepartments)
    }
  }, [product, user])

  // Own department and its sections (item.create is own_department).
  const ownDepartments = useMemo(() => {
    const own = user?.department.uniqueId
    return departments.filter(
      (d) => d.uniqueId === own || d.parent?.uniqueId === own
    )
  }, [departments, user])

  // Search before create: similar names, debounced.
  useEffect(() => {
    if (name.trim().length < 3) return
    const handle = setTimeout(() => {
      void fetchSimilarProducts(name, product?.uniqueId).then(setSimilar)
    }, 400)
    return () => clearTimeout(handle)
  }, [name, product])
  const shownSimilar = name.trim().length < 3 ? [] : similar

  const category = categories.find((c) => c.uniqueId === categoryId)
  const library = category?.criteria ?? []
  const libraryTexts = new Set(library.map((c) => c.text))

  const input = (): VersionInput => ({
    name: name.trim(),
    description: description.trim(),
    categoryUniqueId: categoryId,
    unit: unit.trim(),
    referencePrice: price ? Number(price) : null,
    specs: specs
      .filter((s) => s.attribute.trim() && s.value.trim())
      .map((s) => ({
        attribute: s.attribute.trim(),
        rule: s.rule,
        value: s.value.trim(),
        valueMax: s.rule === "RANGE" ? s.valueMax.trim() : null,
        unit: s.unit.trim() || null,
      })),
    criteria: criteria.map((text) => ({
      text,
      libraryUniqueId: library.find((c) => c.text === text)?.uniqueId ?? null,
    })),
    attachmentUniqueIds: files.map((f) => f.uniqueId),
  })

  const complete = input()
  const canSave =
    complete.name.length >= 3 &&
    complete.description.length >= 3 &&
    !!categoryId &&
    !!complete.unit
  const canSubmit =
    canSave && complete.specs.length > 0 && complete.criteria.length > 0

  async function save(andSubmit: boolean) {
    setBusy(true)
    let saved: Product | null = null
    const ok = await run(
      async () => {
        saved = product
          ? await updateProductDraft(product.uniqueId, complete)
          : await createProduct({
              ...complete,
              departmentUniqueId: departmentId || undefined,
            })
        if (andSubmit) saved = await submitProduct(saved.uniqueId)
      },
      andSubmit
        ? t("products.submitted", "Submitted for activation")
        : t("common.saved", "Saved")
    )
    setBusy(false)
    if (ok && saved) {
      navigate(withId(ROUTES.PRODUCT_DETAILS, (saved as Product).uniqueId))
    }
  }

  async function addFiles(list: FileList | null) {
    if (!list?.length) return
    setUploading(true)
    await run(async () => {
      const added: UploadedFile[] = []
      for (const f of Array.from(list)) added.push(await uploadFile(f))
      setFiles((prev) => [...prev, ...added])
    })
    setUploading(false)
  }

  const setSpec = (i: number, patch: Partial<SpecRow>) =>
    setSpecs((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)))

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          product
            ? t("products.edit_title", "Edit {{name}} (version {{v}})", {
                name: v?.name,
                v: v?.version,
              })
            : t("products.new", "New product")
        }
        description={t(
          "products.form_hint",
          "Describe the product exactly as you want it bought and inspected. At least one specification and one receiving criterion are needed to submit."
        )}
        actions={
          <Button variant="outline" asChild>
            <Link
              to={
                product
                  ? withId(ROUTES.PRODUCT_DETAILS, product.uniqueId)
                  : ROUTES.PRODUCTS
              }
            >
              {t("actions.cancel", "Cancel")}
            </Link>
          </Button>
        }
      />

      {v?.status === "RETURNED" && (
        <Alert>
          <AlertTriangleIcon />
          <AlertTitle>
            {t("products.returned", "Returned for changes")}
          </AlertTitle>
          <AlertDescription>
            {t(
              "products.returned_hint",
              "See the approval history on the product page for the reason, change the product and submit it again."
            )}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("products.description", "Description")}</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="p-name">
                {t("common.name", "Name")}
              </FieldLabel>
              <Input
                id="p-name"
                value={name}
                maxLength={150}
                onChange={(e) => setName(e.target.value)}
              />
              {shownSimilar.length > 0 && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                  <div className="mb-1 flex items-center gap-2 font-medium text-amber-700 dark:text-amber-400">
                    <AlertTriangleIcon className="size-4" />
                    {t(
                      "products.similar",
                      "Similar products already exist — use one of these if it fits:"
                    )}
                  </div>
                  <ul className="space-y-1">
                    {shownSimilar.map((s) => (
                      <li
                        key={s.uniqueId}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <Link
                          to={withId(ROUTES.PRODUCT_DETAILS, s.uniqueId)}
                          target="_blank"
                          className="underline"
                        >
                          {s.name}
                        </Link>
                        <span className="font-mono text-xs text-muted-foreground">
                          {s.code}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {s.departmentName}
                        </span>
                        <ToneBadge code={s.status} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="p-cat">
                  {t("products.category", "Category")}
                </FieldLabel>
                <NativeSelect
                  id="p-cat"
                  className="w-full"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <NativeSelectOption value="">
                    {t("common.choose", "— Choose —")}
                  </NativeSelectOption>
                  {categories.map((c) => (
                    <NativeSelectOption key={c.uniqueId} value={c.uniqueId}>
                      {c.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              {!product && ownDepartments.length > 1 && (
                <Field>
                  <FieldLabel htmlFor="p-dept">
                    {t("products.owner", "Owning department")}
                  </FieldLabel>
                  <NativeSelect
                    id="p-dept"
                    className="w-full"
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                  >
                    {ownDepartments.map((d) => (
                      <NativeSelectOption key={d.uniqueId} value={d.uniqueId}>
                        {d.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
              )}
              <Field>
                <FieldLabel htmlFor="p-unit">
                  {t("products.unit", "Unit of measure")}
                </FieldLabel>
                <Input
                  id="p-unit"
                  value={unit}
                  maxLength={20}
                  placeholder="pcs, m, box…"
                  onChange={(e) => setUnit(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="p-price">
                  {t(
                    "products.reference_price",
                    "Reference unit price (TZS, optional)"
                  )}
                </FieldLabel>
                <Input
                  id="p-price"
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="p-desc">
                {t("products.description", "Description")}
              </FieldLabel>
              <Textarea
                id="p-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {t("products.specifications", "Specifications")}
          </CardTitle>
          <CardDescription>
            {t(
              "products.specs_hint",
              "Structured, so vendors quote exactly and inspection checks the same. RANGE takes a minimum and a maximum; ONE_OF takes values separated by |."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {specs.map((s, i) => (
            <div
              key={i}
              className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1.4fr_0.9fr_1fr_0.8fr_0.6fr_auto] sm:border-0 sm:p-0"
            >
              <Input
                aria-label={t("products.attribute", "Attribute")}
                placeholder={t("products.attribute", "Attribute")}
                value={s.attribute}
                onChange={(e) => setSpec(i, { attribute: e.target.value })}
              />
              <NativeSelect
                className="w-full"
                aria-label={t("products.rule", "Rule")}
                value={s.rule}
                onChange={(e) =>
                  setSpec(i, { rule: e.target.value as SpecRule })
                }
              >
                {SPEC_RULES.map((r) => (
                  <NativeSelectOption key={r} value={r}>
                    {label(r)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <Input
                aria-label={t("products.value", "Value")}
                placeholder={
                  s.rule === "RANGE"
                    ? t("products.minimum", "Minimum")
                    : s.rule === "ONE_OF"
                      ? "a | b | c"
                      : t("products.value", "Value")
                }
                value={s.value}
                onChange={(e) => setSpec(i, { value: e.target.value })}
              />
              <Input
                aria-label={t("products.maximum", "Maximum")}
                placeholder={t("products.maximum", "Maximum")}
                disabled={s.rule !== "RANGE"}
                value={s.valueMax}
                onChange={(e) => setSpec(i, { valueMax: e.target.value })}
              />
              <Input
                aria-label={t("products.spec_unit", "Unit")}
                placeholder={t("products.spec_unit", "Unit")}
                value={s.unit}
                onChange={(e) => setSpec(i, { unit: e.target.value })}
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("actions.remove", "Remove")}
                onClick={() =>
                  setSpecs((prev) => prev.filter((_, j) => j !== i))
                }
              >
                <Trash2Icon />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSpecs((p) => [...p, emptySpec()])}
          >
            <PlusIcon />
            {t("products.add_spec", "Add specification")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("products.criteria", "Receiving criteria")}</CardTitle>
          <CardDescription>
            {t(
              "products.criteria_hint",
              "Pass/fail checks your department's inspector applies on delivery. Tick standard ones from the category library and add your own."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!category && (
            <p className="text-sm text-muted-foreground">
              {t(
                "products.pick_category",
                "Choose a category to see its library."
              )}
            </p>
          )}
          {library.map((c) => (
            <label key={c.uniqueId} className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={criteria.includes(c.text)}
                onCheckedChange={(on) =>
                  setCriteria((prev) =>
                    on ? [...prev, c.text] : prev.filter((x) => x !== c.text)
                  )
                }
              />
              {c.text}
            </label>
          ))}
          {criteria
            .filter((c) => !libraryTexts.has(c))
            .map((c) => (
              <div key={c} className="flex items-start gap-2 text-sm">
                <Checkbox checked disabled />
                <span className="flex-1">{c}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  aria-label={t("actions.remove", "Remove")}
                  onClick={() =>
                    setCriteria((prev) => prev.filter((x) => x !== c))
                  }
                >
                  <XIcon />
                </Button>
              </div>
            ))}
          <div className="flex gap-2">
            <Input
              placeholder={t(
                "products.own_criterion",
                "Department-specific criterion"
              )}
              value={customCriterion}
              onChange={(e) => setCustomCriterion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && customCriterion.trim().length >= 3) {
                  setCriteria((p) => [
                    ...new Set([...p, customCriterion.trim()]),
                  ])
                  setCustomCriterion("")
                }
              }}
            />
            <Button
              variant="outline"
              disabled={customCriterion.trim().length < 3}
              onClick={() => {
                setCriteria((p) => [...new Set([...p, customCriterion.trim()])])
                setCustomCriterion("")
              }}
            >
              <PlusIcon />
              {t("actions.add", "Add")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("products.attachments", "Attachments")}</CardTitle>
          <CardDescription>
            {t(
              "products.attachments_hint",
              "Datasheets, drawings or photos (optional)."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {files.map((f) => (
            <div key={f.uniqueId} className="flex items-center gap-2 text-sm">
              <PaperclipIcon className="size-4 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{f.filename}</span>
              <span className="text-xs text-muted-foreground">
                {formatFileSize(f.size)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                aria-label={t("actions.remove", "Remove")}
                onClick={() =>
                  setFiles((p) => p.filter((x) => x.uniqueId !== f.uniqueId))
                }
              >
                <XIcon />
              </Button>
            </div>
          ))}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
            {uploading ? <Spinner /> : <PaperclipIcon className="size-4" />}
            {t("products.attach", "Attach files")}
            <input
              type="file"
              multiple
              className="sr-only"
              disabled={uploading}
              onChange={(e) => void addFiles(e.target.files)}
            />
          </label>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          disabled={busy || !canSave}
          onClick={() => save(false)}
        >
          {t("products.save_draft", "Save draft")}
        </Button>
        {hasPermission(user, P.ITEM_SUBMIT) && (
          <Button disabled={busy || !canSubmit} onClick={() => save(true)}>
            <SendIcon />
            {t("products.save_submit", "Save and submit for activation")}
          </Button>
        )}
      </div>
    </div>
  )
}

export default ProductFormPage
