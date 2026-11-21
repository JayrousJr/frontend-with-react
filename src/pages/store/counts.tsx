import { useEffect, useState } from "react"
import { Link, useLoaderData, useNavigate, useRevalidator } from "react-router"
import { useTranslation } from "react-i18next"
import {
  ChevronRightIcon,
  ClipboardCheckIcon,
  PlayIcon,
  RefreshCwIcon,
  ScanLineIcon,
  SendIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
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
import { useRun } from "@/components/app/use-run"
import { useAuth } from "@/context/auth-context"
import { errorMessage } from "@/services/api"
import { formatStamp } from "@/lib/format"
import { P, hasPermission } from "@/lib/permissions"
import { cn } from "@/lib/utils"
import { ROUTES, withId } from "@/routes/routeConstants"
import { fetchCategories, type Category } from "@/services/products"
import {
  cancelCount,
  recordCount,
  retryPostCount,
  scanCount,
  startCount,
  submitCount,
  type CountScope,
  type StockCount,
  type Store,
} from "@/services/store"

function StartDialog({
  stores,
  onClose,
}: {
  stores: Store[]
  onClose: () => void
}) {
  const { t } = useTranslation()
  const run = useRun()
  const navigate = useNavigate()
  const [store, setStore] = useState(
    stores.length === 1 ? stores[0].uniqueId : ""
  )
  const [scope, setScope] = useState<CountScope>("LOCATION")
  const [locs, setLocs] = useState<string[]>([])
  const [category, setCategory] = useState("")
  const [categories, setCategories] = useState<Category[]>([])
  const [busy, setBusy] = useState(false)
  useEffect(() => void fetchCategories().then(setCategories), [])
  const s = stores.find((x) => x.uniqueId === store)
  const ok =
    !!store &&
    (scope === "FULL" || (scope === "LOCATION" ? locs.length > 0 : !!category))
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("counts.start", "Start a stock count")}</DialogTitle>
          <DialogDescription>
            {t(
              "counts.start_hint",
              "Expected stock is captured now and movements are frozen for what you count until the count is approved or cancelled."
            )}
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="c-store">
                {t("stores.store", "Store")}
              </FieldLabel>
              <NativeSelect
                id="c-store"
                className="w-full"
                value={store}
                onChange={(e) => {
                  setStore(e.target.value)
                  setLocs([])
                }}
              >
                <NativeSelectOption value="">
                  {t("common.choose", "— Choose —")}
                </NativeSelectOption>
                {stores.map((x) => (
                  <NativeSelectOption key={x.uniqueId} value={x.uniqueId}>
                    {x.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="c-scope">
                {t("counts.scope", "What to count")}
              </FieldLabel>
              <NativeSelect
                id="c-scope"
                className="w-full"
                value={scope}
                onChange={(e) => setScope(e.target.value as CountScope)}
              >
                <NativeSelectOption value="LOCATION">
                  {t("counts.scope_location", "Locations (cycle count)")}
                </NativeSelectOption>
                <NativeSelectOption value="CATEGORY">
                  {t("counts.scope_category", "A category (cycle count)")}
                </NativeSelectOption>
                <NativeSelectOption value="FULL">
                  {t("counts.scope_full", "Whole store (full count)")}
                </NativeSelectOption>
              </NativeSelect>
            </Field>
          </div>
          {scope === "LOCATION" && s && (
            <div className="max-h-48 space-y-1 overflow-auto rounded-md border p-2">
              {s.locations
                .filter((l) => l.kind === "GENERAL" && l.isActive)
                .map((l) => (
                  <label
                    key={l.uniqueId}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={locs.includes(l.uniqueId)}
                      onCheckedChange={(on) =>
                        setLocs((p) =>
                          on
                            ? [...p, l.uniqueId]
                            : p.filter((x) => x !== l.uniqueId)
                        )
                      }
                    />
                    {l.path}
                  </label>
                ))}
            </div>
          )}
          {scope === "CATEGORY" && (
            <NativeSelect
              className="w-full"
              value={category}
              aria-label={t("products.category", "Category")}
              onChange={(e) => setCategory(e.target.value)}
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
          )}
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("actions.cancel", "Cancel")}
          </Button>
          <Button
            disabled={busy || !ok}
            onClick={async () => {
              setBusy(true)
              let id = ""
              const done = await run(
                async () => {
                  const c = await startCount({
                    storeUniqueId: store,
                    scope,
                    locationUniqueIds: scope === "LOCATION" ? locs : undefined,
                    categoryUniqueId:
                      scope === "CATEGORY" ? category : undefined,
                  })
                  id = c.uniqueId
                },
                t("counts.started", "Count started")
              )
              setBusy(false)
              if (done) navigate(withId(ROUTES.COUNT_DETAILS, id))
            }}
          >
            <PlayIcon />
            {t("counts.start_button", "Start count")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const CountsPage = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { counts, stores } = useLoaderData() as {
    counts: StockCount[]
    stores: Store[]
  }
  const [starting, setStarting] = useState(false)
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("counts.title", "Stock counts")}
        description={t(
          "counts.subtitle",
          "Full and cycle counts. Counting is blind; variances go to Store Managers and then adjust the stock. Assets not found become missing."
        )}
        actions={
          hasPermission(user, P.STOCK_COUNT_CREATE) && (
            <Button onClick={() => setStarting(true)}>
              <PlayIcon />
              {t("counts.start", "Start a stock count")}
            </Button>
          )
        }
      />
      {counts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-sm text-muted-foreground">
            <ClipboardCheckIcon className="size-8" />
            {t("counts.none", "No counts yet.")}
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <CardContent className="divide-y p-0">
            {counts.map((c) => (
              <Link
                key={c.uniqueId}
                to={withId(ROUTES.COUNT_DETAILS, c.uniqueId)}
                className="flex items-center gap-4 px-4 py-3 hover:bg-muted sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-medium">{c.number}</span>
                    <span>{c.store.name}</span>
                    <ToneBadge code={c.status} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {c.scopeLabel} ·{" "}
                    {t("counts.progress", "{{done}} of {{all}} counted", {
                      done: c.countedCount,
                      all: c.lineCount,
                    })}
                    {c.varianceCount != null &&
                      ` · ${t("counts.variances", "{{n}} variances", { n: c.varianceCount })}`}{" "}
                    · {formatStamp(c.createdAt)}
                  </div>
                </div>
                <ChevronRightIcon className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
      {starting && (
        <StartDialog stores={stores} onClose={() => setStarting(false)} />
      )}
    </div>
  )
}

export default CountsPage

/** Count sheet: scan assets, enter quantities (blind), submit. */
export function CountDetailsPage() {
  const { t } = useTranslation()
  const run = useRun()
  const { revalidate } = useRevalidator()
  const { count: initial } = useLoaderData() as { count: StockCount }
  const [c, setC] = useState(initial)
  const [prev, setPrev] = useState(initial)
  if (prev !== initial) {
    setPrev(initial)
    setC(initial)
  }
  const [tag, setTag] = useState("")
  const [qty, setQty] = useState<Record<number, string>>({})
  const [cancelling, setCancelling] = useState(false)
  const counting = c.status === "COUNTING"

  async function scan() {
    if (!tag.trim()) return
    try {
      setC(await scanCount(c.uniqueId, tag.trim()))
      toast.success(
        t("counts.scanned", "{{tag}} counted", {
          tag: tag.trim().toUpperCase(),
        })
      )
    } catch (e) {
      toast.error(errorMessage(e, t("general_error")))
    }
    setTag("")
  }

  const pending = Object.entries(qty).filter(([, v]) => v !== "")

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{c.number}</span>
            <ToneBadge code={c.status} />
          </span>
        }
        description={`${c.store.name} · ${c.scopeLabel} · ${c.createdBy} · ${formatStamp(c.createdAt)}`}
        actions={
          <>
            {c.approvalRequestUniqueId && (
              <Button variant="outline" asChild>
                <Link
                  to={withId(
                    ROUTES.APPROVAL_DETAILS,
                    c.approvalRequestUniqueId
                  )}
                >
                  <ShieldCheckIcon />
                  {t("products.open_approval", "Approval")}
                </Link>
              </Button>
            )}
            {c.can.cancel && (
              <Button variant="outline" onClick={() => setCancelling(true)}>
                <XCircleIcon />
                {t("counts.cancel", "Cancel count")}
              </Button>
            )}
            {c.can.retry && (
              <Button
                variant="outline"
                onClick={() =>
                  run(async () => setC(await retryPostCount(c.uniqueId)))
                }
              >
                <RefreshCwIcon />
                {t("adjustments.retry", "Try posting again")}
              </Button>
            )}
            {counting && (
              <Button
                disabled={!c.can.submit}
                onClick={() =>
                  run(
                    async () => {
                      setC(await submitCount(c.uniqueId))
                      revalidate()
                    },
                    t("counts.submitted", "Sent to Store Managers")
                  )
                }
              >
                <SendIcon />
                {t("counts.submit", "Submit count")}
              </Button>
            )}
          </>
        }
      />
      {c.postError && (
        <Alert variant="destructive">
          <XCircleIcon />
          <AlertDescription>{c.postError}</AlertDescription>
        </Alert>
      )}
      {counting && c.can.count && (
        <Card>
          <CardHeader>
            <CardTitle>{t("counts.counting", "Counting")}</CardTitle>
            <CardDescription>
              {t(
                "counts.counting_hint",
                "Scan every asset tag you find (assets not on the list are recorded too). Enter what you count for consumables — expected quantities stay hidden. A storekeeper cannot be the only counter."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                void scan()
              }}
            >
              <Input
                autoFocus
                className="sm:w-72"
                autoComplete="off"
                placeholder={t("assets.scan", "Scan or type a tag")}
                value={tag}
                onChange={(e) => setTag(e.target.value)}
              />
              <Button type="submit" variant="outline">
                <ScanLineIcon />
                {t("counts.scan", "Count tag")}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>
            {t("counts.progress", "{{done}} of {{all}} counted", {
              done: c.countedCount,
              all: c.lineCount,
            })}
          </CardTitle>
          {counting && pending.length > 0 && (
            <Button
              size="sm"
              onClick={() =>
                run(
                  async () => {
                    setC(
                      await recordCount(
                        c.uniqueId,
                        pending.map(([id, v]) => ({
                          lineId: Number(id),
                          countedQty: Number(v),
                        }))
                      )
                    )
                    setQty({})
                  },
                  t("common.saved", "Saved")
                )
              }
            >
              {t("counts.save_n", "Save {{n}} counts", { n: pending.length })}
            </Button>
          )}
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("products.product", "Product")}</TableHead>
                <TableHead>{t("locations.path", "Location")}</TableHead>
                {!counting && (
                  <TableHead className="text-right">
                    {t("counts.expected", "Expected")}
                  </TableHead>
                )}
                <TableHead className="text-right">
                  {t("counts.counted", "Counted")}
                </TableHead>
                {!counting && (
                  <TableHead className="text-right">
                    {t("counts.variance", "Variance")}
                  </TableHead>
                )}
                <TableHead>{t("counts.by", "Counted by")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {c.lines.map((l) => (
                <TableRow
                  key={l.id}
                  className={cn(l.variance && "bg-amber-500/5")}
                >
                  <TableCell>
                    {l.assetUniqueId ? (
                      <Link
                        className="font-mono text-sm underline"
                        to={withId(ROUTES.ASSET_DETAILS, l.assetUniqueId)}
                      >
                        {l.assetTag}
                      </Link>
                    ) : null}
                    <div>{l.productName}</div>
                    <div className="text-xs text-muted-foreground">
                      {[l.productCode, l.serialNumber, l.batchNumber]
                        .filter(Boolean)
                        .join(" · ")}
                      {l.unexpected &&
                        ` · ${t("counts.unexpected", "not expected here")}`}
                    </div>
                  </TableCell>
                  <TableCell>{l.location}</TableCell>
                  {!counting && (
                    <TableCell className="text-right tabular-nums">
                      {l.expectedQty}
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    {counting && c.can.count ? (
                      l.assetTag ? (
                        <label className="inline-flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={
                              (qty[l.id] ?? String(l.countedQty ?? "")) === "1"
                            }
                            onCheckedChange={(on) =>
                              setQty((p) => ({ ...p, [l.id]: on ? "1" : "0" }))
                            }
                          />
                          {l.countedQty == null && qty[l.id] == null
                            ? t("counts.not_yet", "not counted")
                            : (qty[l.id] ?? String(l.countedQty)) === "1"
                              ? t("counts.found", "found")
                              : t("counts.not_found", "not found")}
                        </label>
                      ) : (
                        <Input
                          type="number"
                          min={0}
                          className="ml-auto w-24 text-right"
                          aria-label={t("counts.counted", "Counted")}
                          value={
                            qty[l.id] ??
                            (l.countedQty != null ? String(l.countedQty) : "")
                          }
                          onChange={(e) =>
                            setQty((p) => ({ ...p, [l.id]: e.target.value }))
                          }
                        />
                      )
                    ) : (
                      <span className="tabular-nums">
                        {l.countedQty ?? "—"}
                      </span>
                    )}
                  </TableCell>
                  {!counting && (
                    <TableCell
                      className={cn(
                        "text-right tabular-nums",
                        (l.variance ?? 0) < 0 && "text-destructive",
                        (l.variance ?? 0) > 0 &&
                          "text-emerald-700 dark:text-emerald-400"
                      )}
                    >
                      {l.variance == null
                        ? "—"
                        : l.variance > 0
                          ? `+${l.variance}`
                          : l.variance}
                    </TableCell>
                  )}
                  <TableCell className="text-sm">
                    {l.countedBy ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {cancelling && (
        <ReasonDialog
          title={t("counts.cancel_title", "Cancel this count?")}
          description={t(
            "counts.cancel_hint",
            "Movements are unfrozen; nothing is adjusted."
          )}
          confirmLabel={t("counts.cancel", "Cancel count")}
          destructive
          onClose={() => setCancelling(false)}
          onConfirm={async (reason) => {
            const ok = await run(async () =>
              setC(await cancelCount(c.uniqueId, reason))
            )
            if (ok) revalidate()
            return ok
          }}
        />
      )}
    </div>
  )
}
