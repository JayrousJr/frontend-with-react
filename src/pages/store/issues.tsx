import { useEffect, useState } from "react"
import { Link, useLoaderData, useNavigate, useSearchParams } from "react-router"
import { useTranslation } from "react-i18next"
import {
  ChevronRightIcon,
  PackageMinusIcon,
  PackagePlusIcon,
  PlusIcon,
  PrinterIcon,
  ReceiptTextIcon,
  SendIcon,
  Trash2Icon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader } from "@/components/app/page-header"
import { AsyncPicker, type PickerOption } from "@/components/app/async-picker"
import { searchEmployeeOptions } from "@/components/app/pickers"
import { useCodeLabel } from "@/components/app/use-code-label"
import { useRun } from "@/components/app/use-run"
import { useAuth } from "@/context/auth-context"
import { formatStamp } from "@/lib/format"
import { P, hasPermission } from "@/lib/permissions"
import { ROUTES, withId } from "@/routes/routeConstants"
import { fetchDepartments, type Department } from "@/services/org"
import { fetchProducts } from "@/services/products"
import {
  createStockDocument,
  type BeneficiaryType,
  type StockDocType,
  type StockDocument,
  type Store,
} from "@/services/store"
import { QuantityLineEditor } from "./stock-line"
import { newQtyLine, splitSource, type QtyLine } from "./stock-line-utils"

const IssuesPage = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { documents } = useLoaderData() as { documents: StockDocument[] }
  const [params, setParams] = useSearchParams()
  const tab = params.get("tab") ?? "all"
  const shown = documents.filter((d) => tab === "all" || d.type === tab)
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("issues.title", "Issues & returns")}
        description={t(
          "issues.subtitle",
          "Consumables and spares given out (with who received them) and returned unused. Equipment goes through handover."
        )}
        actions={
          <>
            {hasPermission(user, P.STOCK_RETURN) && (
              <Button variant="outline" asChild>
                <Link to={`${ROUTES.ISSUE_NEW}?type=RETURN`}>
                  <PackagePlusIcon />
                  {t("issues.new_return", "Record return")}
                </Link>
              </Button>
            )}
            {hasPermission(user, P.STOCK_ISSUE) && (
              <Button asChild>
                <Link to={ROUTES.ISSUE_NEW}>
                  <PackageMinusIcon />
                  {t("issues.new_issue", "Issue stock")}
                </Link>
              </Button>
            )}
          </>
        }
      />
      <Tabs
        value={tab}
        onValueChange={(v) => setParams({ tab: v }, { replace: true })}
      >
        <TabsList variant="line">
          <TabsTrigger value="all">{t("issues.all", "All")}</TabsTrigger>
          <TabsTrigger value="ISSUE">
            {t("issues.issues", "Issues")}
          </TabsTrigger>
          <TabsTrigger value="RETURN">
            {t("issues.returns", "Returns")}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {shown.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-sm text-muted-foreground">
            <ReceiptTextIcon className="size-8" />
            {t("issues.none", "Nothing here yet.")}
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <CardContent className="divide-y p-0">
            {shown.map((d) => (
              <Link
                key={d.uniqueId}
                to={withId(ROUTES.ISSUE_DETAILS, d.uniqueId)}
                className="flex items-center gap-4 px-4 py-3 hover:bg-muted sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-medium">{d.number}</span>
                    <Badge
                      variant={d.type === "ISSUE" ? "default" : "secondary"}
                    >
                      {d.type === "ISSUE"
                        ? t("issues.issue", "Issue")
                        : t("issues.return", "Return")}
                    </Badge>
                    <span>{d.beneficiary}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {d.store.name} ·{" "}
                    {d.lines
                      .map((l) => `${l.quantity} × ${l.productName}`)
                      .join(", ")}{" "}
                    · {d.by} · {formatStamp(d.at)}
                  </div>
                </div>
                <ChevronRightIcon className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default IssuesPage

/** Issue voucher / return note entry. */
export function IssueFormPage() {
  const { t } = useTranslation()
  const label = useCodeLabel()
  const run = useRun()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { stores } = useLoaderData() as { stores: Store[] }
  const type: StockDocType =
    params.get("type") === "RETURN" ? "RETURN" : "ISSUE"
  const [store, setStore] = useState(
    stores.length === 1 ? stores[0].uniqueId : ""
  )
  const [kind, setKind] = useState<BeneficiaryType>("EMPLOYEE")
  const [employee, setEmployee] = useState<PickerOption | null>(null)
  const [department, setDepartment] = useState("")
  const [production, setProduction] = useState("")
  const [reference, setReference] = useState("")
  const [note, setNote] = useState("")
  const [lines, setLines] = useState<QtyLine[]>([newQtyLine()])
  const [departments, setDepartments] = useState<Department[]>([])
  const [busy, setBusy] = useState(false)
  // Returns go to any active location; issues come from stock with availability.
  const storeObj = stores.find((s) => s.uniqueId === store)
  const [returnLocs, setReturnLocs] = useState<
    Record<number, { loc: string; batch: string }>
  >({})
  const { user } = useAuth()
  const canListDepartments = hasPermission(user, P.DEPARTMENT_VIEW)
  useEffect(() => {
    if (canListDepartments) void fetchDepartments().then(setDepartments)
  }, [canListDepartments])

  const who =
    kind === "EMPLOYEE"
      ? !!employee
      : kind === "DEPARTMENT"
        ? !!department
        : production.trim().length >= 1
  const linesOk = lines.every((l) =>
    type === "ISSUE"
      ? l.product && l.source && Number(l.quantity) > 0
      : l.product && returnLocs[l.key]?.loc && Number(l.quantity) > 0
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          type === "ISSUE"
            ? t("issues.new_issue", "Issue stock")
            : t("issues.new_return", "Record return")
        }
        description={
          type === "ISSUE"
            ? t(
                "issues.issue_hint",
                "Records who received the stock, for traceability."
              )
            : t(
                "issues.return_hint",
                "Unused consumables coming back into the store."
              )
        }
        actions={
          <Button variant="outline" asChild>
            <Link to={ROUTES.ISSUES}>{t("actions.cancel", "Cancel")}</Link>
          </Button>
        }
      />
      <Card>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="is-store">
                  {t("stores.store", "Store")}
                </FieldLabel>
                <NativeSelect
                  id="is-store"
                  className="w-full"
                  value={store}
                  onChange={(e) => setStore(e.target.value)}
                >
                  <NativeSelectOption value="">
                    {t("common.choose", "— Choose —")}
                  </NativeSelectOption>
                  {stores.map((s) => (
                    <NativeSelectOption key={s.uniqueId} value={s.uniqueId}>
                      {s.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="is-kind">
                  {type === "ISSUE"
                    ? t("issues.to", "Issued to")
                    : t("issues.from", "Returned by")}
                </FieldLabel>
                <NativeSelect
                  id="is-kind"
                  className="w-full"
                  value={kind}
                  onChange={(e) => setKind(e.target.value as BeneficiaryType)}
                >
                  {(["EMPLOYEE", "DEPARTMENT", "PRODUCTION"] as const).map(
                    (k) => (
                      <NativeSelectOption key={k} value={k}>
                        {label(k)}
                      </NativeSelectOption>
                    )
                  )}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel>{label(kind)}</FieldLabel>
                {kind === "EMPLOYEE" && (
                  <AsyncPicker
                    selected={employee}
                    onChange={setEmployee}
                    search={searchEmployeeOptions()}
                  />
                )}
                {kind === "DEPARTMENT" && (
                  <NativeSelect
                    className="w-full"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    <NativeSelectOption value="">
                      {t("common.choose", "— Choose —")}
                    </NativeSelectOption>
                    {departments.map((d) => (
                      <NativeSelectOption key={d.uniqueId} value={d.uniqueId}>
                        {d.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                )}
                {kind === "PRODUCTION" && (
                  <Input
                    placeholder={t(
                      "issues.production_ref",
                      "Production name or reference"
                    )}
                    value={production}
                    onChange={(e) => setProduction(e.target.value)}
                  />
                )}
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="is-ref">
                  {t("issues.reference", "Reference (e.g. internal request)")}
                </FieldLabel>
                <Input
                  id="is-ref"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="is-note">
                  {t("issues.note", "Note")}
                </FieldLabel>
                <Textarea
                  id="is-note"
                  rows={1}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </Field>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("issues.items", "Items")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {lines.map((l) => (
            <div key={l.key} className="flex items-start gap-2">
              <div className="flex-1 space-y-2">
                {type === "ISSUE" ? (
                  <QuantityLineEditor
                    storeUniqueId={store}
                    line={l}
                    onChange={(p) =>
                      setLines((ls) =>
                        ls.map((x) => (x.key === l.key ? { ...x, ...p } : x))
                      )
                    }
                  />
                ) : (
                  <div className="grid gap-2 sm:grid-cols-[1.4fr_1fr_0.8fr_0.6fr]">
                    <QuantityProductOnly
                      storeUniqueId={store}
                      line={l}
                      onChange={(p) =>
                        setLines((ls) =>
                          ls.map((x) => (x.key === l.key ? { ...x, ...p } : x))
                        )
                      }
                    />
                    <NativeSelect
                      className="w-full"
                      aria-label={t("locations.path", "Location")}
                      value={returnLocs[l.key]?.loc ?? ""}
                      onChange={(e) =>
                        setReturnLocs((r) => ({
                          ...r,
                          [l.key]: {
                            loc: e.target.value,
                            batch: r[l.key]?.batch ?? "",
                          },
                        }))
                      }
                    >
                      <NativeSelectOption value="">
                        {t("locations.path", "Location")}
                      </NativeSelectOption>
                      {storeObj?.locations
                        .filter((x) => x.kind === "GENERAL" && x.isActive)
                        .map((x) => (
                          <NativeSelectOption
                            key={x.uniqueId}
                            value={x.uniqueId}
                          >
                            {x.path}
                          </NativeSelectOption>
                        ))}
                    </NativeSelect>
                    <Input
                      placeholder={t(
                        "adjustments.batch_number",
                        "Batch number"
                      )}
                      value={returnLocs[l.key]?.batch ?? ""}
                      onChange={(e) =>
                        setReturnLocs((r) => ({
                          ...r,
                          [l.key]: {
                            loc: r[l.key]?.loc ?? "",
                            batch: e.target.value,
                          },
                        }))
                      }
                    />
                    <Input
                      type="number"
                      min={1}
                      aria-label={t("movements.qty", "Qty")}
                      value={l.quantity}
                      onChange={(e) =>
                        setLines((ls) =>
                          ls.map((x) =>
                            x.key === l.key
                              ? { ...x, quantity: e.target.value }
                              : x
                          )
                        )
                      }
                    />
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("actions.remove", "Remove")}
                disabled={lines.length === 1}
                onClick={() =>
                  setLines((ls) => ls.filter((x) => x.key !== l.key))
                }
              >
                <Trash2Icon />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            disabled={!store}
            onClick={() => setLines((ls) => [...ls, newQtyLine()])}
          >
            <PlusIcon />
            {t("adjustments.add_line", "Add line")}
          </Button>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button
          disabled={busy || !store || !who || !linesOk}
          onClick={async () => {
            setBusy(true)
            let id = ""
            const ok = await run(
              async () => {
                const d = await createStockDocument({
                  type,
                  storeUniqueId: store,
                  beneficiaryType: kind,
                  employeeUniqueId:
                    kind === "EMPLOYEE" ? employee?.value : null,
                  departmentUniqueId: kind === "DEPARTMENT" ? department : null,
                  productionRef:
                    kind === "PRODUCTION" ? production.trim() : null,
                  reference: reference.trim() || null,
                  note: note.trim() || null,
                  lines: lines.map((l) => {
                    if (type === "ISSUE") {
                      const { locationUniqueId, batchNumber } = splitSource(
                        l.source
                      )
                      return {
                        productUniqueId: l.product!.value,
                        locationUniqueId,
                        batchNumber,
                        quantity: Number(l.quantity),
                      }
                    }
                    return {
                      productUniqueId: l.product!.value,
                      locationUniqueId: returnLocs[l.key].loc,
                      batchNumber: returnLocs[l.key].batch.trim() || null,
                      quantity: Number(l.quantity),
                    }
                  }),
                })
                id = d.uniqueId
              },
              type === "ISSUE"
                ? t("issues.issued", "Issued")
                : t("issues.returned", "Return recorded")
            )
            setBusy(false)
            if (ok) navigate(withId(ROUTES.ISSUE_DETAILS, id))
          }}
        >
          <SendIcon />
          {type === "ISSUE"
            ? t("issues.issue_button", "Issue")
            : t("issues.return_button", "Record return")}
        </Button>
      </div>
    </div>
  )
}

/** Product picker only (returns choose the location separately). */
function QuantityProductOnly({
  storeUniqueId,
  line,
  onChange,
}: {
  storeUniqueId: string
  line: QtyLine
  onChange: (p: Partial<QtyLine>) => void
}) {
  const { t } = useTranslation()
  return (
    <AsyncPicker
      selected={line.product}
      placeholder={t("products.product", "Product")}
      disabled={!storeUniqueId}
      onChange={(o) => onChange({ product: o })}
      search={async (q) =>
        (
          await fetchProducts(
            { search: q || undefined, statuses: ["ACTIVE"] },
            1,
            20
          )
        ).data
          .filter((p) => p.trackingType && p.trackingType !== "SERIALISED")
          .map((p) => ({
            value: p.uniqueId,
            label: p.name,
            hint: `${p.code ?? ""} · ${p.unit}`,
          }))
      }
    />
  )
}

/** Printable issue voucher / return note. */
export function IssueDetailsPage() {
  const { t } = useTranslation()
  const label = useCodeLabel()
  const { document: d } = useLoaderData() as { document: StockDocument }
  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{d.number}</span>
            {d.type === "ISSUE"
              ? t("issues.voucher", "Issue voucher")
              : t("issues.return_note", "Return note")}
          </span>
        }
        description={`${d.store.name} · ${formatStamp(d.at)}`}
        actions={
          <Button
            variant="outline"
            className="print:hidden"
            onClick={() => window.print()}
          >
            <PrinterIcon />
            {t("actions.print", "Print")}
          </Button>
        }
      />
      <Card>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">
                {d.type === "ISSUE"
                  ? t("issues.to", "Issued to")
                  : t("issues.from", "Returned by")}{" "}
                ({label(d.beneficiaryType)})
              </dt>
              <dd className="font-medium">{d.beneficiary}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                {t("issues.by", "Recorded by")}
              </dt>
              <dd className="font-medium">{d.by}</dd>
            </div>
            {d.reference && (
              <div>
                <dt className="text-muted-foreground">
                  {t("issues.reference", "Reference (e.g. internal request)")}
                </dt>
                <dd className="font-medium">{d.reference}</dd>
              </div>
            )}
            {d.note && (
              <div>
                <dt className="text-muted-foreground">
                  {t("issues.note", "Note")}
                </dt>
                <dd>{d.note}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>{t("products.product", "Product")}</TableHead>
                <TableHead>{t("locations.path", "Location")}</TableHead>
                <TableHead>
                  {t("adjustments.batch_number", "Batch number")}
                </TableHead>
                <TableHead className="text-right">
                  {t("movements.qty", "Qty")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.lines.map((l) => (
                <TableRow key={l.lineNo}>
                  <TableCell>{l.lineNo}</TableCell>
                  <TableCell>
                    {l.productName}
                    <div className="font-mono text-xs text-muted-foreground">
                      {l.productCode}
                    </div>
                  </TableCell>
                  <TableCell>{l.location}</TableCell>
                  <TableCell>{l.batchNumber ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {l.quantity}{" "}
                    <span className="text-xs text-muted-foreground">
                      {l.unit}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className="hidden grid-cols-2 gap-8 pt-12 text-sm print:grid">
        <div className="border-t pt-2">
          {t("issues.sign_store", "Storekeeper (signature, date)")}
        </div>
        <div className="border-t pt-2">
          {t(
            "issues.sign_receiver",
            "Received / returned by (signature, date)"
          )}
        </div>
      </div>
    </div>
  )
}
