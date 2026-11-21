import { useState } from "react"
import { Link, useLoaderData, useNavigate, useSearchParams } from "react-router"
import { useTranslation } from "react-i18next"
import {
  ArrowRightIcon,
  ChevronRightIcon,
  PlusIcon,
  SendIcon,
  Trash2Icon,
  TruckIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { PageHeader } from "@/components/app/page-header"
import { ToneBadge } from "@/components/app/tone-badge"
import { useCodeLabel } from "@/components/app/use-code-label"
import { AsyncPicker, type PickerOption } from "@/components/app/async-picker"
import { useRun } from "@/components/app/use-run"
import { useAuth } from "@/context/auth-context"
import { formatStamp } from "@/lib/format"
import { P, hasPermission } from "@/lib/permissions"
import { ROUTES, withId } from "@/routes/routeConstants"
import {
  createTransfer,
  fetchAssets,
  TRANSFER_REASONS,
  type Store,
  type Transfer,
  type TransferReason,
} from "@/services/store"
import { QuantityLineEditor } from "./stock-line"
import { newQtyLine, splitSource, type QtyLine } from "./stock-line-utils"

const OPEN = ["REQUESTED", "APPROVED", "DISPATCHED", "DISCREPANCY"]

const TransfersPage = () => {
  const { t } = useTranslation()
  const label = useCodeLabel()
  const { user } = useAuth()
  const { transfers } = useLoaderData() as { transfers: Transfer[] }
  const [params, setParams] = useSearchParams()
  const tab = params.get("tab") ?? "open"
  const shown = transfers.filter((x) =>
    tab === "open" ? OPEN.includes(x.status) : true
  )
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("transfers.title", "Transfers")}
        description={t(
          "transfers.subtitle",
          "Every movement between stores. Stock is reserved on approval, in transit after dispatch, and counted into the receiving store when it confirms."
        )}
        actions={
          hasPermission(user, P.TRANSFER_CREATE) && (
            <Button asChild>
              <Link to={ROUTES.TRANSFER_NEW}>
                <PlusIcon />
                {t("transfers.new", "New transfer")}
              </Link>
            </Button>
          )
        }
      />
      <Tabs
        value={tab}
        onValueChange={(v) => setParams({ tab: v }, { replace: true })}
      >
        <TabsList variant="line">
          <TabsTrigger value="open">{t("transfers.open", "Open")}</TabsTrigger>
          <TabsTrigger value="all">{t("transfers.all", "All")}</TabsTrigger>
        </TabsList>
      </Tabs>
      {shown.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-sm text-muted-foreground">
            <TruckIcon className="size-8" />
            {t("transfers.none", "No transfers here.")}
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <CardContent className="divide-y p-0">
            {shown.map((x) => (
              <Link
                key={x.uniqueId}
                to={withId(ROUTES.TRANSFER_DETAILS, x.uniqueId)}
                className="flex items-center gap-4 px-4 py-3 hover:bg-muted sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-medium">{x.number}</span>
                    <span className="inline-flex items-center gap-1">
                      {x.fromStore.name} <ArrowRightIcon className="size-3" />{" "}
                      {x.toStore.name}
                    </span>
                    <ToneBadge code={x.status} />
                    {x.overdue && (
                      <Badge variant="destructive">
                        {t("transfers.overdue", "Overdue")}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {label(x.reason)} ·{" "}
                    {t("transfers.lines_n", "{{n}} lines", { n: x.lineCount })}{" "}
                    · {x.requestedBy} · {formatStamp(x.createdAt)}
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

export default TransfersPage

type AssetLine = { key: number; asset: PickerOption | null }
let aseq = 0

/** New transfer: assets (kits travel whole) and quantities. */
export function TransferFormPage() {
  const { t } = useTranslation()
  const label = useCodeLabel()
  const run = useRun()
  const navigate = useNavigate()
  const { stores } = useLoaderData() as { stores: Store[] }
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [reason, setReason] = useState<TransferReason>("RESTOCK")
  const [note, setNote] = useState("")
  const [assets, setAssets] = useState<AssetLine[]>([])
  const [qty, setQty] = useState<QtyLine[]>([])
  const [busy, setBusy] = useState(false)

  const valid =
    !!from &&
    !!to &&
    from !== to &&
    assets.length + qty.length > 0 &&
    assets.every((a) => a.asset) &&
    qty.every((q) => q.product && q.source && Number(q.quantity) > 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("transfers.new", "New transfer")}
        description={t(
          "transfers.form_hint",
          "Only available stock and in-store assets in good or fair condition can be sent. Kit components travel with their kit."
        )}
        actions={
          <Button variant="outline" asChild>
            <Link to={ROUTES.TRANSFERS}>{t("actions.cancel", "Cancel")}</Link>
          </Button>
        }
      />
      <Card>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="tr-from">
                  {t("transfers.from", "From store")}
                </FieldLabel>
                <NativeSelect
                  id="tr-from"
                  className="w-full"
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value)
                    setAssets([])
                    setQty([])
                  }}
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
                <FieldLabel htmlFor="tr-to">
                  {t("transfers.to", "To store")}
                </FieldLabel>
                <NativeSelect
                  id="tr-to"
                  className="w-full"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                >
                  <NativeSelectOption value="">
                    {t("common.choose", "— Choose —")}
                  </NativeSelectOption>
                  {stores
                    .filter((s) => s.uniqueId !== from)
                    .map((s) => (
                      <NativeSelectOption key={s.uniqueId} value={s.uniqueId}>
                        {s.name}
                      </NativeSelectOption>
                    ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="tr-reason">
                  {t("transfers.reason", "Reason")}
                </FieldLabel>
                <NativeSelect
                  id="tr-reason"
                  className="w-full"
                  value={reason}
                  onChange={(e) => setReason(e.target.value as TransferReason)}
                >
                  {TRANSFER_REASONS.map((r) => (
                    <NativeSelectOption key={r} value={r}>
                      {label(r)}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="tr-note">
                {t("transfers.note", "Note (optional)")}
              </FieldLabel>
              <Textarea
                id="tr-note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("transfers.assets", "Assets")}</CardTitle>
          <CardDescription>
            {t("transfers.assets_hint", "Search by tag, serial or product.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {assets.map((a) => (
            <div key={a.key} className="flex items-center gap-2">
              <div className="flex-1">
                <AsyncPicker
                  selected={a.asset}
                  placeholder={t("assets.tag", "Tag")}
                  onChange={(o) =>
                    setAssets((p) =>
                      p.map((x) => (x.key === a.key ? { ...x, asset: o } : x))
                    )
                  }
                  search={async (q) =>
                    (
                      await fetchAssets(
                        {
                          storeUniqueId: from,
                          statuses: ["IN_STORE"],
                          search: q || undefined,
                        },
                        1,
                        20
                      )
                    ).data
                      .filter(
                        (x) =>
                          !x.parent && ["GOOD", "FAIR"].includes(x.condition)
                      )
                      .map((x) => ({
                        value: x.uniqueId,
                        label: `${x.tag} — ${x.product.name}`,
                        hint: [
                          x.serialNumber,
                          x.isKit ? t("assets.kit", "kit") : null,
                          x.location?.path,
                        ]
                          .filter(Boolean)
                          .join(" · "),
                      }))
                  }
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("actions.remove", "Remove")}
                onClick={() =>
                  setAssets((p) => p.filter((x) => x.key !== a.key))
                }
              >
                <Trash2Icon />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            disabled={!from}
            onClick={() =>
              setAssets((p) => [...p, { key: ++aseq, asset: null }])
            }
          >
            <PlusIcon />
            {t("transfers.add_asset", "Add asset")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {t("transfers.quantities", "Consumables and spares")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {qty.map((q) => (
            <div key={q.key} className="flex items-start gap-2">
              <div className="flex-1">
                <QuantityLineEditor
                  storeUniqueId={from}
                  line={q}
                  onChange={(patch) =>
                    setQty((p) =>
                      p.map((x) => (x.key === q.key ? { ...x, ...patch } : x))
                    )
                  }
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("actions.remove", "Remove")}
                onClick={() => setQty((p) => p.filter((x) => x.key !== q.key))}
              >
                <Trash2Icon />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            disabled={!from}
            onClick={() => setQty((p) => [...p, newQtyLine()])}
          >
            <PlusIcon />
            {t("transfers.add_quantity", "Add quantity line")}
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          disabled={busy || !valid}
          onClick={async () => {
            setBusy(true)
            let id = ""
            const ok = await run(
              async () => {
                const tr = await createTransfer({
                  fromStoreUniqueId: from,
                  toStoreUniqueId: to,
                  reason,
                  note: note.trim() || null,
                  lines: [
                    ...assets.map((a) => ({ assetUniqueId: a.asset!.value })),
                    ...qty.map((q) => {
                      const { locationUniqueId, batchNumber } = splitSource(
                        q.source
                      )
                      return {
                        productUniqueId: q.product!.value,
                        fromLocationUniqueId: locationUniqueId,
                        batchNumber,
                        quantity: Number(q.quantity),
                      }
                    }),
                  ],
                })
                id = tr.uniqueId
              },
              t("transfers.created", "Transfer requested")
            )
            setBusy(false)
            if (ok) navigate(withId(ROUTES.TRANSFER_DETAILS, id))
          }}
        >
          <SendIcon />
          {t("transfers.request", "Request transfer")}
        </Button>
      </div>
    </div>
  )
}
