import { useState } from "react"
import { Link, useParams, useSearchParams } from "react-router"
import { useTranslation } from "react-i18next"
import { PrinterIcon, UndoIcon, UserCheckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldLabel } from "@/components/ui/field"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/app/page-header"
import { ToneBadge } from "@/components/app/tone-badge"
import { ReasonDialog } from "@/components/app/reason-dialog"
import { useRun } from "@/components/app/use-run"
import { formatStamp } from "@/lib/format"
import { ROUTES, withId } from "@/routes/routeConstants"
import {
  assignInspector,
  fetchInspection,
  fetchInspections,
  fetchInspectors,
  performInspection,
  returnToVendor,
  type Inspection,
} from "@/services/procurement"
import { FormDialog, Info, Loading } from "./shared"
import { useLoad } from "./shared-utils"

export const InspectionsPage = () => {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const open = params.get("all") !== "1"
  const grn = params.get("grn") ?? undefined
  const rows = useLoad(() => fetchInspections(open, grn), [open, grn])
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("inspections.title", "Receiving inspections")}
        description={t(
          "inspections.subtitle",
          "Goods received at the main store are inspected by the product's owning department against the receiving criteria of the product version on the LPO."
        )}
      />
      <Tabs
        value={open ? "open" : "all"}
        onValueChange={(v) =>
          setParams(v === "all" ? { all: "1" } : {}, { replace: true })
        }
      >
        <TabsList variant="line">
          <TabsTrigger value="open">
            {t("inspections.open", "To inspect")}
          </TabsTrigger>
          <TabsTrigger value="all">{t("inspections.all", "All")}</TabsTrigger>
        </TabsList>
      </Tabs>
      <Card className="py-0">
        <CardContent className="divide-y p-0">
          {!rows.data && (
            <div className="p-6">
              <Loading error={rows.error} />
            </div>
          )}
          {rows.data?.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground">
              {t("inspections.none", "Nothing to inspect.")}
            </p>
          )}
          {rows.data?.map((i) => (
            <Link
              key={i.uniqueId}
              to={withId(ROUTES.GOODS_INSPECTION_DETAILS, i.uniqueId)}
              className="block px-4 py-3 hover:bg-muted sm:px-6"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-medium">{i.number}</span>
                <span>
                  {i.productName} × {i.receivedQty}
                </span>
                <ToneBadge code={i.status} />
              </div>
              <div className="text-xs text-muted-foreground">
                {i.department} · {i.grn.number} · {i.vendor} ·{" "}
                {formatStamp(i.createdAt)}
                {i.assignedTo &&
                  ` · ${t("inspections.assigned_to", "assigned to")} ${i.assignedTo}`}
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export const InspectionDetailsPage = () => {
  const { t } = useTranslation()
  const run = useRun()
  const { uniqueId = "" } = useParams()
  const x = useLoad(() => fetchInspection(uniqueId), [uniqueId])
  const [results, setResults] = useState<
    Record<number, { pass: boolean; remark: string }>
  >({})
  const [passed, setPassed] = useState<string | null>(null)
  const [failedSerials, setFailedSerials] = useState<Set<string>>(new Set())
  const [remarks, setRemarks] = useState("")
  const [assigning, setAssigning] = useState(false)
  const [returning, setReturning] = useState(false)
  if (!x.data) return <Loading error={x.error} />
  const d = x.data
  const act = (fn: () => Promise<Inspection>, ok?: string) =>
    run(async () => x.set(await fn()), ok)
  const res = (id: number) => results[id] ?? { pass: true, remark: "" }
  const serialised = d.trackingType === "SERIALISED"
  const passedQty = serialised
    ? d.receivedQty - failedSerials.size
    : Number(passed ?? d.receivedQty)
  const complete = d.criteria.every(
    (c) => res(c.id).pass || res(c.id).remark.trim()
  )
  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          title={
            <span className="flex items-center gap-2">
              <span className="font-mono">{d.number}</span>
              <ToneBadge code={d.status} />
            </span>
          }
          description={`${d.productName} (v${d.productVersion}) × ${d.receivedQty} · ${d.department}`}
          actions={
            <>
              <Button variant="outline" onClick={() => window.print()}>
                <PrinterIcon />
                {t("inspections.print", "Inspection report")}
              </Button>
              {d.can.assign && (
                <Button variant="outline" onClick={() => setAssigning(true)}>
                  <UserCheckIcon />
                  {t("inspections.assign", "Assign inspector")}
                </Button>
              )}
              {d.can.returnToVendor && (
                <Button variant="outline" onClick={() => setReturning(true)}>
                  <UndoIcon />
                  {t("inspections.return", "Return failed goods to vendor")}
                </Button>
              )}
            </>
          }
        />
      </div>
      <div className="hidden print:block">
        <div className="text-xs uppercase">
          AzamTV — {t("inspections.print", "Inspection report")}
        </div>
        <div className="font-mono text-2xl font-bold">{d.number}</div>
      </div>
      <Card>
        <CardContent>
          <Info
            items={[
              [
                "GRN",
                <Link
                  className="underline print:no-underline"
                  to={withId(ROUTES.GRN_DETAILS, d.grn.uniqueId)}
                >
                  {d.grn.number}
                </Link>,
              ],
              [
                "LPO",
                <Link
                  className="underline print:no-underline"
                  to={withId(ROUTES.ORDER_DETAILS, d.order.uniqueId)}
                >
                  {d.order.number}
                </Link>,
              ],
              [t("vendors.vendor", "Vendor"), d.vendor],
              [t("inspections.assigned_to", "assigned to"), d.assignedTo],
              [
                t("inspections.by", "Inspected by"),
                d.inspectedBy &&
                  `${d.inspectedBy} · ${formatStamp(d.completedAt)}`,
              ],
              [
                t("inspections.result", "Result"),
                d.completedAt &&
                  `${d.passedQty} ${t("inspections.passed", "passed")}, ${d.failedQty} ${t("inspections.failed", "failed")}`,
              ],
              [
                t("inspections.failed_serials", "Failed serials"),
                d.failedSerials.join(", "),
              ],
              [
                t("inspections.returned", "Returned to vendor"),
                d.returnedToVendorAt && formatStamp(d.returnedToVendorAt),
              ],
              [t("grn.batch", "Batch number"), d.batchNumber],
              [t("inspections.remarks", "Remarks"), d.remarks],
            ]}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            {t("inspections.criteria", "Receiving criteria")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {d.completedAt
            ? d.results.map((r) => (
                <div key={r.criterionId} className="text-sm">
                  <span
                    className={
                      r.pass
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-destructive"
                    }
                  >
                    {r.pass ? "✓" : "✗"}
                  </span>{" "}
                  {r.text}
                  {r.remark && (
                    <span className="text-muted-foreground"> — {r.remark}</span>
                  )}
                </div>
              ))
            : d.criteria.map((c) => (
                <div
                  key={c.id}
                  className="grid gap-2 sm:grid-cols-[1fr_auto_16rem] sm:items-center"
                >
                  <span className="text-sm">{c.text}</span>
                  <NativeSelect
                    value={res(c.id).pass ? "pass" : "fail"}
                    disabled={!d.can.inspect}
                    onChange={(e) =>
                      setResults({
                        ...results,
                        [c.id]: {
                          ...res(c.id),
                          pass: e.target.value === "pass",
                        },
                      })
                    }
                  >
                    <NativeSelectOption value="pass">
                      {t("inspections.pass", "Pass")}
                    </NativeSelectOption>
                    <NativeSelectOption value="fail">
                      {t("inspections.fail", "Fail")}
                    </NativeSelectOption>
                  </NativeSelect>
                  <Input
                    placeholder={t(
                      "inspections.remark",
                      "Remark (required if failed)"
                    )}
                    disabled={!d.can.inspect}
                    value={res(c.id).remark}
                    onChange={(e) =>
                      setResults({
                        ...results,
                        [c.id]: { ...res(c.id), remark: e.target.value },
                      })
                    }
                  />
                </div>
              ))}
          {d.can.inspect && (
            <div className="space-y-3 border-t pt-3">
              {serialised ? (
                <Field>
                  <FieldLabel>
                    {t(
                      "inspections.tick_failed",
                      "Tick the units that FAIL (the others are stocked in and tagged)"
                    )}
                  </FieldLabel>
                  <div className="grid gap-1 sm:grid-cols-3">
                    {d.serialNumbers.map((s) => (
                      <label
                        key={s}
                        className="flex items-center gap-2 font-mono text-sm"
                      >
                        <Checkbox
                          checked={failedSerials.has(s)}
                          onCheckedChange={(on) =>
                            setFailedSerials((p) => {
                              const n = new Set(p)
                              if (on) n.add(s)
                              else n.delete(s)
                              return n
                            })
                          }
                        />
                        {s}
                      </label>
                    ))}
                  </div>
                </Field>
              ) : (
                <Field>
                  <FieldLabel htmlFor="in-pass">
                    {t("inspections.passed_qty", "Quantity passed (of {{n}})", {
                      n: d.receivedQty,
                    })}
                  </FieldLabel>
                  <Input
                    id="in-pass"
                    type="number"
                    min={0}
                    max={d.receivedQty}
                    value={passed ?? String(d.receivedQty)}
                    onChange={(e) => setPassed(e.target.value)}
                  />
                </Field>
              )}
              <Textarea
                rows={2}
                placeholder={t("inspections.remarks", "Remarks")}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                {t(
                  "inspections.summary",
                  "{{p}} pass → stock-in at the main store; {{f}} fail → Rejected location, back to the vendor.",
                  { p: passedQty, f: d.receivedQty - passedQty }
                )}
              </p>
              <Button
                disabled={
                  !complete || passedQty < 0 || passedQty > d.receivedQty
                }
                onClick={() =>
                  act(
                    () =>
                      performInspection(d.uniqueId, {
                        results: d.criteria.map((c) => ({
                          criterionId: c.id,
                          pass: res(c.id).pass,
                          remark: res(c.id).remark || null,
                        })),
                        passedQty,
                        failedSerials: [...failedSerials],
                        remarks: remarks || null,
                      }),
                    t("inspections.done", "Inspection recorded")
                  )
                }
              >
                {t("inspections.submit", "Record inspection")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      {assigning && (
        <AssignDialog
          id={d.uniqueId}
          onClose={() => setAssigning(false)}
          onDone={(i) => x.set(i)}
        />
      )}
      {returning && (
        <ReasonDialog
          title={t("inspections.return", "Return failed goods to vendor")}
          description={t(
            "inspections.return_hint",
            "{{n}} unit(s) leave the Rejected location.",
            { n: d.failedQty }
          )}
          confirmLabel={t("inspections.return_confirm", "Returned")}
          onClose={() => setReturning(false)}
          onConfirm={(note) => act(() => returnToVendor(d.uniqueId, note))}
        />
      )}
    </div>
  )
}

function AssignDialog({
  id,
  onClose,
  onDone,
}: {
  id: string
  onClose: () => void
  onDone: (i: Inspection) => void
}) {
  const { t } = useTranslation()
  const run = useRun()
  const list = useLoad(() => fetchInspectors(id), [id])
  const [user, setUser] = useState("")
  return (
    <FormDialog
      title={t("inspections.assign", "Assign inspector")}
      confirmLabel={t("actions.save", "Save")}
      canConfirm={!!user}
      onClose={onClose}
      onConfirm={() => run(async () => onDone(await assignInspector(id, user)))}
    >
      <NativeSelect
        className="w-full"
        value={user}
        onChange={(e) => setUser(e.target.value)}
      >
        <NativeSelectOption value="">—</NativeSelectOption>
        {(list.data ?? []).map((u) => (
          <NativeSelectOption key={u.uniqueId} value={u.uniqueId}>
            {u.name} ({u.email})
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </FormDialog>
  )
}
