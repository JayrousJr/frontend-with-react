import { useEffect, useState } from "react"
import {
  Link,
  useLoaderData,
  useNavigate,
  useRevalidator,
  useSearchParams,
} from "react-router"
import { useTranslation } from "react-i18next"
import {
  CheckCircle2Icon,
  ChevronRightIcon,
  ClipboardListIcon,
  PackageMinusIcon,
  PlusIcon,
  SendIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  SplitIcon,
  UserCheckIcon,
  XCircleIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { PageHeader } from "@/components/app/page-header"
import { ToneBadge } from "@/components/app/tone-badge"
import { ReasonDialog } from "@/components/app/reason-dialog"
import { AsyncPicker, type PickerOption } from "@/components/app/async-picker"
import { searchEmployeeOptions } from "@/components/app/pickers"
import { useRun } from "@/components/app/use-run"
import { useAuth } from "@/context/auth-context"
import { formatDay, formatStamp } from "@/lib/format"
import { P, hasPermission } from "@/lib/permissions"
import { ROUTES, withId } from "@/routes/routeConstants"
import { fetchProducts } from "@/services/products"
import { fetchStores, type Store } from "@/services/store"
import {
  acceptInternalRequest,
  cancelInternalRequest,
  closeInternalRequest,
  createInternalRequest,
  planInternalRequest,
  submitInternalRequest,
  type InternalRequest,
  type IrView,
} from "@/services/requests"

const InternalRequestsPage = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { requests, view } = useLoaderData() as {
    requests: InternalRequest[]
    view: IrView
  }
  const [, setParams] = useSearchParams()
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("requests.title", "Internal requests")}
        description={t(
          "requests.subtitle",
          "HODs ask the department that owns a product, for a named employee or the department. The owner serves it from a store or buys it."
        )}
        actions={
          hasPermission(user, P.INTERNAL_REQUEST_CREATE) && (
            <Button asChild>
              <Link to={ROUTES.INTERNAL_REQUEST_NEW}>
                <PlusIcon />
                {t("requests.new", "New request")}
              </Link>
            </Button>
          )
        }
      />
      <Tabs
        value={view}
        onValueChange={(v) => setParams({ view: v }, { replace: true })}
      >
        <TabsList variant="line">
          <TabsTrigger value="mine">
            {t("requests.mine", "Raised by my department")}
          </TabsTrigger>
          <TabsTrigger value="owning">
            {t("requests.owning", "For my department's products")}
          </TabsTrigger>
          <TabsTrigger value="deliver">
            {t("requests.deliver", "To deliver (store)")}
          </TabsTrigger>
          <TabsTrigger value="all">
            {t("requests.all", "All I can see")}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-sm text-muted-foreground">
            <ClipboardListIcon className="size-8" />
            {t("requests.none", "No requests here.")}
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <CardContent className="divide-y p-0">
            {requests.map((r) => (
              <Link
                key={r.uniqueId}
                to={withId(ROUTES.INTERNAL_REQUEST_DETAILS, r.uniqueId)}
                className="flex items-center gap-4 px-4 py-3 hover:bg-muted sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-medium">{r.number}</span>
                    <span>
                      {r.quantity} × {r.product.name}
                    </span>
                    <ToneBadge code={r.status} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.requestingDepartment.name} → {r.owningDepartment.name}
                    {r.beneficiary &&
                      ` · ${t("requests.for", "for")} ${r.beneficiary.fullName}`}{" "}
                    · {formatStamp(r.createdAt)}
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

export default InternalRequestsPage

export function InternalRequestFormPage() {
  const { t } = useTranslation()
  const run = useRun()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [product, setProduct] = useState<PickerOption | null>(null)
  const [employee, setEmployee] = useState<PickerOption | null>(null)
  const [forDepartment, setForDepartment] = useState(false)
  const [quantity, setQuantity] = useState("1")
  const [requiredBy, setRequiredBy] = useState("")
  const [justification, setJustification] = useState("")
  const [production, setProduction] = useState("")
  const [busy, setBusy] = useState(false)
  const valid =
    !!product &&
    Number(quantity) >= 1 &&
    justification.trim().length >= 3 &&
    (forDepartment || !!employee)

  async function save(submit: boolean) {
    setBusy(true)
    let id = ""
    const ok = await run(
      async () => {
        const r = await createInternalRequest({
          productUniqueId: product!.value,
          beneficiaryEmployeeUniqueId: forDepartment
            ? undefined
            : employee!.value,
          quantity: Number(quantity),
          requiredBy: requiredBy || undefined,
          justification: justification.trim(),
          productionRef: production.trim() || undefined,
        })
        id = r.uniqueId
        if (submit) await submitInternalRequest(id)
      },
      submit
        ? t("requests.submitted", "Request sent")
        : t("common.saved", "Saved")
    )
    setBusy(false)
    if (ok) navigate(withId(ROUTES.INTERNAL_REQUEST_DETAILS, id))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("requests.new", "New request")}
        description={t(
          "requests.form_hint",
          "Choose an Active product; the request goes to the department that owns it. Staff do not raise requests — the HOD raises them for the employee."
        )}
        actions={
          <Button variant="outline" asChild>
            <Link to={ROUTES.INTERNAL_REQUESTS}>
              {t("actions.cancel", "Cancel")}
            </Link>
          </Button>
        }
      />
      <Card>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel>{t("products.product", "Product")}</FieldLabel>
              <AsyncPicker
                selected={product}
                onChange={setProduct}
                search={async (q) =>
                  (
                    await fetchProducts(
                      { search: q || undefined, statuses: ["ACTIVE"] },
                      1,
                      20
                    )
                  ).data.map((p) => ({
                    value: p.uniqueId,
                    label: p.name,
                    hint: `${p.code ?? ""} · ${t("requests.owned_by", "owned by")} ${p.departmentName}`,
                  }))
                }
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={forDepartment}
                onChange={(e) => setForDepartment(e.target.checked)}
              />
              {t(
                "requests.for_department",
                "For the department (no named employee)"
              )}
            </label>
            {!forDepartment && (
              <Field>
                <FieldLabel>
                  {t("requests.beneficiary", "For employee (your department)")}
                </FieldLabel>
                <AsyncPicker
                  selected={employee}
                  onChange={setEmployee}
                  search={searchEmployeeOptions({
                    departmentUniqueId: user?.department.uniqueId,
                  })}
                />
              </Field>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="ir-qty">
                  {t("movements.qty", "Qty")}
                </FieldLabel>
                <Input
                  id="ir-qty"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="ir-by">
                  {t("requests.required_by", "Required by")}
                </FieldLabel>
                <Input
                  id="ir-by"
                  type="date"
                  value={requiredBy}
                  onChange={(e) => setRequiredBy(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="ir-prod">
                  {t("requests.production", "Production (optional)")}
                </FieldLabel>
                <Input
                  id="ir-prod"
                  value={production}
                  onChange={(e) => setProduction(e.target.value)}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="ir-just">
                {t("requests.justification", "Justification")}
              </FieldLabel>
              <Textarea
                id="ir-just"
                rows={3}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
              />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          disabled={busy || !valid}
          onClick={() => save(false)}
        >
          {t("products.save_draft", "Save draft")}
        </Button>
        <Button disabled={busy || !valid} onClick={() => save(true)}>
          <SendIcon />
          {t("requests.send", "Send request")}
        </Button>
      </div>
    </div>
  )
}

function AcceptDialog({
  r,
  onClose,
  onDone,
}: {
  r: InternalRequest
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation()
  const run = useRun()
  const [qty, setQty] = useState(String(r.quantity))
  const [note, setNote] = useState("")
  const partial = Number(qty) < r.quantity
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("requests.accept", "Accept request")}</DialogTitle>
          <DialogDescription>
            {t(
              "requests.accept_hint",
              "Accept all or part. A partial acceptance needs a reason; the requesting HOD is told. Reject or return from the approval page."
            )}
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="acc-qty">
              {t("requests.accept_qty", "Quantity accepted (of {{n}})", {
                n: r.quantity,
              })}
            </FieldLabel>
            <Input
              id="acc-qty"
              type="number"
              min={1}
              max={r.quantity}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="acc-note">
              {partial
                ? t("common.reason", "Reason")
                : t("requests.note", "Note (optional)")}
            </FieldLabel>
            <Textarea
              id="acc-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("actions.cancel", "Cancel")}
          </Button>
          <Button
            disabled={
              Number(qty) < 1 ||
              Number(qty) > r.quantity ||
              (partial && note.trim().length < 3)
            }
            onClick={async () => {
              const ok = await run(
                () =>
                  acceptInternalRequest(
                    r.uniqueId,
                    Number(qty),
                    note.trim() || undefined
                  ),
                t("requests.accepted", "Accepted")
              )
              if (ok) onDone()
            }}
          >
            <CheckCircle2Icon />
            {t("requests.accept", "Accept request")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PlanDialog({
  r,
  onClose,
  onDone,
}: {
  r: InternalRequest
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation()
  const run = useRun()
  const accepted = r.acceptedQty ?? r.quantity
  const [stores, setStores] = useState<Store[]>([])
  const [store, setStore] = useState("")
  const [fromStore, setFromStore] = useState(String(accepted))
  useEffect(() => void fetchStores().then(setStores), [])
  const purchase = Math.max(accepted - Number(fromStore || 0), 0)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("requests.plan", "Plan fulfilment")}</DialogTitle>
          <DialogDescription>
            {t(
              "requests.plan_hint",
              "Check stock first (any store). What is not available goes to a purchase request."
            )}
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="pl-store">
              {t("requests.serving_store", "Serving store")}
            </FieldLabel>
            <NativeSelect
              id="pl-store"
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="pl-from">
                {t("requests.from_store", "From store")}
              </FieldLabel>
              <Input
                id="pl-from"
                type="number"
                min={0}
                max={accepted}
                value={fromStore}
                onChange={(e) => setFromStore(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>
                {t("requests.to_purchase", "To purchase")}
              </FieldLabel>
              <div className="flex h-9 items-center font-medium tabular-nums">
                {purchase}
              </div>
            </Field>
          </div>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("actions.cancel", "Cancel")}
          </Button>
          <Button
            disabled={
              Number(fromStore) < 0 ||
              Number(fromStore) > accepted ||
              (Number(fromStore) > 0 && !store)
            }
            onClick={async () => {
              const ok = await run(
                () =>
                  planInternalRequest(r.uniqueId, {
                    storeUniqueId: store || null,
                    fromStoreQty: Number(fromStore || 0),
                    toPurchaseQty: purchase,
                  }),
                t("common.saved", "Saved")
              )
              if (ok) onDone()
            }}
          >
            <SplitIcon />
            {t("requests.plan", "Plan fulfilment")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function InternalRequestDetailsPage() {
  const { t } = useTranslation()
  const run = useRun()
  const { user } = useAuth()
  const { revalidate } = useRevalidator()
  const { request: r } = useLoaderData() as { request: InternalRequest }
  const [dialog, setDialog] = useState<null | "accept" | "plan" | "cancel">(
    null
  )
  const done = () => {
    setDialog(null)
    revalidate()
  }
  const toDeliver = r.fromStoreQty - r.deliveredQty
  const canDeliver =
    toDeliver > 0 &&
    ["FULFILLED_FROM_STORE", "IN_PURCHASE"].includes(r.status) &&
    (r.product.trackingType === "SERIALISED"
      ? hasPermission(user, P.HANDOVER_PREPARE)
      : hasPermission(user, P.STOCK_ISSUE))
  const rows: [string, string | null][] = [
    [
      t("requests.requesting", "Requesting department"),
      r.requestingDepartment.name,
    ],
    [t("requests.owner", "Owning department"), r.owningDepartment.name],
    [
      t("requests.beneficiary_short", "For"),
      r.beneficiary
        ? `${r.beneficiary.fullName} (${r.beneficiary.employeeNumber})`
        : t("requests.department", "The department"),
    ],
    [
      t("requests.required_by", "Required by"),
      r.requiredBy ? formatDay(r.requiredBy) : null,
    ],
    [t("requests.production", "Production (optional)"), r.productionRef],
    [
      t("requests.raised", "Raised"),
      `${r.createdBy} · ${formatStamp(r.createdAt)}`,
    ],
    [
      t("requests.accepted_qty", "Accepted"),
      r.acceptedQty != null
        ? `${r.acceptedQty} ${r.acceptNote ? `— ${r.acceptNote}` : ""}`
        : null,
    ],
    [t("requests.serving_store", "Serving store"), r.store?.name ?? null],
    [
      t("requests.split", "From store / to purchase / delivered"),
      r.acceptedQty != null
        ? `${r.fromStoreQty} / ${r.toPurchaseQty} / ${r.deliveredQty}`
        : null,
    ],
  ]
  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{r.number}</span>
            <ToneBadge code={r.status} />
          </span>
        }
        description={`${r.quantity} × ${r.product.name} (${r.product.code ?? ""})`}
        actions={
          <>
            {r.approvalRequestUniqueId && (
              <Button variant="outline" asChild>
                <Link
                  to={withId(
                    ROUTES.APPROVAL_DETAILS,
                    r.approvalRequestUniqueId
                  )}
                >
                  <ShieldCheckIcon />
                  {t("products.open_approval", "Approval")}
                </Link>
              </Button>
            )}
            {r.can.cancel && (
              <Button variant="outline" onClick={() => setDialog("cancel")}>
                <XCircleIcon />
                {t("actions.cancel", "Cancel")}
              </Button>
            )}
            {r.can.submit && (
              <Button
                onClick={() =>
                  run(
                    async () => {
                      await submitInternalRequest(r.uniqueId)
                      revalidate()
                    },
                    t("requests.submitted", "Request sent")
                  )
                }
              >
                <SendIcon />
                {t("requests.send", "Send request")}
              </Button>
            )}
            {r.can.accept && (
              <Button onClick={() => setDialog("accept")}>
                <CheckCircle2Icon />
                {t("requests.accept", "Accept request")}
              </Button>
            )}
            {r.can.plan && (
              <Button onClick={() => setDialog("plan")}>
                <SplitIcon />
                {t("requests.plan", "Plan fulfilment")}
              </Button>
            )}
            {r.can.purchase && (
              <Button variant="outline" asChild>
                <Link
                  to={`${ROUTES.PURCHASE_REQUEST_NEW}?request=${r.uniqueId}`}
                >
                  <ShoppingCartIcon />
                  {t("requests.to_purchase_request", "Purchase request")}
                </Link>
              </Button>
            )}
            {canDeliver && (
              <Button asChild>
                <Link
                  to={
                    r.product.trackingType === "SERIALISED"
                      ? `${ROUTES.HANDOVER_NEW}?request=${r.uniqueId}`
                      : `${ROUTES.ISSUE_NEW}?request=${r.uniqueId}`
                  }
                >
                  {r.product.trackingType === "SERIALISED" ? (
                    <UserCheckIcon />
                  ) : (
                    <PackageMinusIcon />
                  )}
                  {r.product.trackingType === "SERIALISED"
                    ? t("requests.hand_over", "Hand over")
                    : t("requests.issue", "Issue")}
                </Link>
              </Button>
            )}
            {r.can.close && (
              <Button
                variant="outline"
                onClick={() =>
                  run(async () => {
                    await closeInternalRequest(r.uniqueId)
                    revalidate()
                  })
                }
              >
                {t("requests.close", "Close request")}
              </Button>
            )}
          </>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>{t("requests.justification", "Justification")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm whitespace-pre-line">{r.justification}</p>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {rows
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
          </dl>
        </CardContent>
      </Card>
      {dialog === "accept" && (
        <AcceptDialog r={r} onClose={() => setDialog(null)} onDone={done} />
      )}
      {dialog === "plan" && (
        <PlanDialog r={r} onClose={() => setDialog(null)} onDone={done} />
      )}
      {dialog === "cancel" && (
        <ReasonDialog
          title={t("requests.cancel_title", "Cancel this request?")}
          confirmLabel={t("requests.cancel_confirm", "Cancel request")}
          destructive
          onClose={() => setDialog(null)}
          onConfirm={async (reason) => {
            const ok = await run(() =>
              cancelInternalRequest(r.uniqueId, reason)
            )
            if (ok) revalidate()
            return ok
          }}
        />
      )}
    </div>
  )
}
