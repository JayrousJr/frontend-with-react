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
  ChevronRightIcon,
  PlusIcon,
  SendIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  Trash2Icon,
  XCircleIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { ReasonDialog } from "@/components/app/reason-dialog"
import { AsyncPicker, type PickerOption } from "@/components/app/async-picker"
import { useRun } from "@/components/app/use-run"
import { useAuth } from "@/context/auth-context"
import { formatStamp } from "@/lib/format"
import { P, hasPermission } from "@/lib/permissions"
import { ROUTES, withId } from "@/routes/routeConstants"
import { fetchProducts } from "@/services/products"
import { PurchaseFileCard } from "@/pages/procurement/purchase-file"
import { Documents } from "@/pages/procurement/documents"
import {
  cancelPurchaseRequest,
  createPurchaseRequest,
  fetchInternalRequest,
  submitPurchaseRequest,
  type PurchaseRequest,
} from "@/services/requests"

const PurchaseRequestsPage = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { requests } = useLoaderData() as { requests: PurchaseRequest[] }
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("purchase.title", "Purchase requests")}
        description={t(
          "purchase.subtitle",
          "Raised by the owning department's HOD for its own products only. CEO review → Procurement review → CEO decision. No budget is shown."
        )}
        actions={
          hasPermission(user, P.PURCHASE_REQUEST_CREATE) && (
            <Button asChild>
              <Link to={ROUTES.PURCHASE_REQUEST_NEW}>
                <PlusIcon />
                {t("purchase.new", "New purchase request")}
              </Link>
            </Button>
          )
        }
      />
      {requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-sm text-muted-foreground">
            <ShoppingCartIcon className="size-8" />
            {t("purchase.none", "No purchase requests.")}
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <CardContent className="divide-y p-0">
            {requests.map((r) => (
              <Link
                key={r.uniqueId}
                to={withId(ROUTES.PURCHASE_REQUEST_DETAILS, r.uniqueId)}
                className="flex items-center gap-4 px-4 py-3 hover:bg-muted sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-medium">{r.number}</span>
                    <span>{r.department.name}</span>
                    <ToneBadge code={r.status} />
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {r.lines
                      .map((l) => `${l.quantity} × ${l.productName}`)
                      .join(", ")}{" "}
                    · {r.createdBy} · {formatStamp(r.createdAt)}
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

export default PurchaseRequestsPage

type Line = {
  key: number
  product: PickerOption | null
  quantity: string
  internalRequestUniqueId: string | null
  label: string | null
}
let seq = 0

export function PurchaseRequestFormPage() {
  const { t } = useTranslation()
  const run = useRun()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [justification, setJustification] = useState("")
  const [lines, setLines] = useState<Line[]>([
    {
      key: ++seq,
      product: null,
      quantity: "1",
      internalRequestUniqueId: null,
      label: null,
    },
  ])
  const [busy, setBusy] = useState(false)
  const fromRequest = params.get("request")

  useEffect(() => {
    if (!fromRequest) return
    void fetchInternalRequest(fromRequest).then((r) => {
      setLines([
        {
          key: ++seq,
          product: {
            value: r.product.uniqueId,
            label: r.product.name,
            hint: r.product.code ?? "",
          },
          quantity: String(r.toPurchaseQty),
          internalRequestUniqueId: r.uniqueId,
          label: `${r.number} — ${r.requestingDepartment.name}${r.beneficiary ? `, ${r.beneficiary.fullName}` : ""}`,
        },
      ])
      setJustification(`For internal request ${r.number}: ${r.justification}`)
    })
  }, [fromRequest])

  const valid =
    justification.trim().length >= 3 &&
    lines.length > 0 &&
    lines.every((l) => l.product && Number(l.quantity) >= 1)
  async function save(submit: boolean) {
    setBusy(true)
    let id = ""
    const ok = await run(
      async () => {
        const pr = await createPurchaseRequest({
          justification: justification.trim(),
          lines: lines.map((l) => ({
            productUniqueId: l.product!.value,
            quantity: Number(l.quantity),
            internalRequestUniqueId: l.internalRequestUniqueId,
          })),
        })
        id = pr.uniqueId
        if (submit) await submitPurchaseRequest(id)
      },
      submit
        ? t("purchase.submitted", "Sent for approval")
        : t("common.saved", "Saved")
    )
    setBusy(false)
    if (ok) navigate(withId(ROUTES.PURCHASE_REQUEST_DETAILS, id))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("purchase.new", "New purchase request")}
        description={t(
          "purchase.form_hint",
          "Only your department's products. Lines from internal requests keep their beneficiary for traceability."
        )}
        actions={
          <Button variant="outline" asChild>
            <Link to={ROUTES.PURCHASE_REQUESTS}>
              {t("actions.cancel", "Cancel")}
            </Link>
          </Button>
        }
      />
      <Card>
        <CardContent>
          <Field>
            <FieldLabel htmlFor="pr-just">
              {t("requests.justification", "Justification")}
            </FieldLabel>
            <Textarea
              id="pr-just"
              rows={3}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
            />
          </Field>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("purchase.lines", "Lines")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {lines.map((l) => (
            <div key={l.key} className="space-y-1">
              <div className="flex items-start gap-2">
                <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_8rem]">
                  <AsyncPicker
                    selected={l.product}
                    disabled={!!l.internalRequestUniqueId}
                    onChange={(o) =>
                      setLines((p) =>
                        p.map((x) =>
                          x.key === l.key ? { ...x, product: o } : x
                        )
                      )
                    }
                    search={async (q) =>
                      (
                        await fetchProducts(
                          {
                            search: q || undefined,
                            statuses: ["ACTIVE", "SUBMITTED", "IN_REVIEW"],
                          },
                          1,
                          20
                        )
                      ).data.map((p) => ({
                        value: p.uniqueId,
                        label: p.name,
                        hint: `${p.code ?? ""} · ${p.departmentName}`,
                      }))
                    }
                  />
                  <Input
                    type="number"
                    min={1}
                    aria-label={t("movements.qty", "Qty")}
                    value={l.quantity}
                    onChange={(e) =>
                      setLines((p) =>
                        p.map((x) =>
                          x.key === l.key
                            ? { ...x, quantity: e.target.value }
                            : x
                        )
                      )
                    }
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("actions.remove", "Remove")}
                  disabled={lines.length === 1}
                  onClick={() =>
                    setLines((p) => p.filter((x) => x.key !== l.key))
                  }
                >
                  <Trash2Icon />
                </Button>
              </div>
              {l.label && (
                <p className="text-xs text-muted-foreground">
                  {t("purchase.from_request", "From")} {l.label}
                </p>
              )}
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setLines((p) => [
                ...p,
                {
                  key: ++seq,
                  product: null,
                  quantity: "1",
                  internalRequestUniqueId: null,
                  label: null,
                },
              ])
            }
          >
            <PlusIcon />
            {t("adjustments.add_line", "Add line")}
          </Button>
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
          {t("purchase.submit", "Send for approval")}
        </Button>
      </div>
    </div>
  )
}

export function PurchaseRequestDetailsPage() {
  const { t } = useTranslation()
  const run = useRun()
  const { revalidate } = useRevalidator()
  const { request: r } = useLoaderData() as { request: PurchaseRequest }
  const { user } = useAuth()
  const [cancelling, setCancelling] = useState(false)
  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{r.number}</span>
            <ToneBadge code={r.status} />
          </span>
        }
        description={`${r.department.name} · ${r.createdBy} · ${formatStamp(r.createdAt)}`}
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
              <Button variant="outline" onClick={() => setCancelling(true)}>
                <XCircleIcon />
                {t("actions.cancel", "Cancel")}
              </Button>
            )}
            {r.can.submit && (
              <Button
                onClick={() =>
                  run(
                    async () => {
                      await submitPurchaseRequest(r.uniqueId)
                      revalidate()
                    },
                    t("purchase.submitted", "Sent for approval")
                  )
                }
              >
                <SendIcon />
                {t("purchase.submit", "Send for approval")}
              </Button>
            )}
          </>
        }
      />
      <Card>
        <CardContent className="space-y-4">
          <p className="text-sm whitespace-pre-line">{r.justification}</p>
          {r.status === "APPROVED" && (
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              {t(
                "purchase.approved_hint",
                "Approved. Procurement takes it from here (tender / quotation / cash purchase)."
              )}
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>{t("products.product", "Product")}</TableHead>
                <TableHead className="text-right">
                  {t("movements.qty", "Qty")}
                </TableHead>
                <TableHead>
                  {t("purchase.beneficiary", "For (traceability)")}
                </TableHead>
                <TableHead>
                  {t("purchase.internal", "Internal request")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {r.lines.map((l) => (
                <TableRow key={l.lineNo}>
                  <TableCell>{l.lineNo}</TableCell>
                  <TableCell>
                    <Link
                      className="hover:underline"
                      to={withId(ROUTES.PRODUCT_DETAILS, l.productUniqueId)}
                    >
                      {l.productName}
                    </Link>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="font-mono">{l.productCode}</span>
                      {l.productStatus !== "ACTIVE" && (
                        <ToneBadge code={l.productStatus} />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {l.quantity}{" "}
                    <span className="text-xs text-muted-foreground">
                      {l.unit}
                    </span>
                  </TableCell>
                  <TableCell>{l.beneficiary ?? "—"}</TableCell>
                  <TableCell>
                    {l.internalRequestUniqueId ? (
                      <Link
                        className="font-mono underline"
                        to={withId(
                          ROUTES.INTERNAL_REQUEST_DETAILS,
                          l.internalRequestUniqueId
                        )}
                      >
                        {l.internalRequestNumber}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {hasPermission(user, P.PURCHASE_FILE_VIEW) &&
        !["DRAFT", "IN_APPROVAL", "RETURNED"].includes(r.status) && (
          <>
            <PurchaseFileCard purchaseRequestUniqueId={r.uniqueId} />
            <Documents type="PurchaseRequest" id={r.uniqueId} />
          </>
        )}
      {cancelling && (
        <ReasonDialog
          title={t("purchase.cancel_title", "Cancel this purchase request?")}
          confirmLabel={t("purchase.cancel_confirm", "Cancel request")}
          destructive
          onClose={() => setCancelling(false)}
          onConfirm={async (reason) => {
            const ok = await run(() =>
              cancelPurchaseRequest(r.uniqueId, reason)
            )
            if (ok) revalidate()
            return ok
          }}
        />
      )}
    </div>
  )
}
