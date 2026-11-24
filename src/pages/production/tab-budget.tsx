import { useState } from "react"
import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import {
  FileSpreadsheetIcon,
  FileTextIcon,
  PlusIcon,
  RefreshCwIcon,
  SaveIcon,
  SendIcon,
  Trash2Icon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldLabel } from "@/components/ui/field"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { ToneBadge } from "@/components/app/tone-badge"
import { useRun } from "@/components/app/use-run"
import { ROUTES, withId } from "@/routes/routeConstants"
import {
  createBudget,
  downloadProductionPack,
  fetchBudget,
  refreshBudgetCrew,
  saveRetirement,
  submitBudget,
  updateBudget,
  type AllowanceRate,
  type Budget,
  type BudgetLine,
  type Production,
} from "@/services/production"
import { Loading, Section, Stat } from "./ui"
import { money, useLoad } from "./utils"

type Full = Extract<Budget, { exists: true }>
const n = (v: string) => (v === "" ? null : Number(v))

function totalsOf(lines: BudgetLine[]) {
  const t = { TZS: 0, USD: 0, crewTZS: 0, crewUSD: 0 }
  for (const l of lines) {
    const amt =
      l.kind === "CREW" ? (l.days ?? 0) * (l.rate ?? 0) : (l.amount ?? 0)
    t[l.currency] += amt
    if (l.kind === "CREW")
      t[l.currency === "TZS" ? "crewTZS" : "crewUSD"] += amt
  }
  return t
}

function Editor({
  p,
  b,
  onSaved,
}: {
  p: Production
  b: Full
  onSaved: (x: Budget) => void
}) {
  const { t } = useTranslation()
  const run = useRun()
  const rates = b.settings.rates.filter((r) => r.isActive)
  const [h, setH] = useState({
    travelFrom: b.travelFrom?.slice(0, 10) ?? "",
    travelReturn: b.travelReturn?.slice(0, 10) ?? "",
    liveFrom: b.liveFrom ?? "",
    liveTo: b.liveTo ?? "",
    city: b.city ?? "",
    equipmentNote: b.equipmentNote ?? "",
    exchangeRate: b.exchangeRate == null ? "" : String(b.exchangeRate),
    notes: b.notes ?? "",
    rateId: b.rate?.id ? String(b.rate.id) : "",
  })
  const [lines, setLines] = useState<BudgetLine[]>(b.lines)
  const upd = (i: number, patch: Partial<BudgetLine>) =>
    setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  const rateBy = (code: string | null) => rates.find((r) => r.code === code)
  const setRate = (i: number, r: AllowanceRate | undefined) =>
    upd(
      i,
      r
        ? {
            rateCode: r.code,
            rate: r.amount,
            currency: r.currency,
            rateOverrideReason: null,
          }
        : { rateCode: null }
    )
  const applyAll = (r: AllowanceRate) =>
    setLines(
      lines.map((l) =>
        l.kind === "CREW" && !l.rateOverrideReason
          ? { ...l, rateCode: r.code, rate: r.amount, currency: r.currency }
          : l
      )
    )
  const tot = totalsOf(lines)
  const save = (then?: () => Promise<Budget>) =>
    run(
      async () => {
        let x = await updateBudget(p.uniqueId, {
          allowanceRateId: h.rateId ? Number(h.rateId) : null,
          travelFrom: h.travelFrom || null,
          travelReturn: h.travelReturn || null,
          liveFrom: h.liveFrom || null,
          liveTo: h.liveTo || null,
          city: h.city || null,
          equipmentNote: h.equipmentNote || null,
          exchangeRate: h.exchangeRate ? Number(h.exchangeRate) : null,
          notes: h.notes || null,
          lines,
        })
        if (then) x = await then()
        onSaved(x)
      },
      t("common.saved", "Saved")
    )
  const nonCrew = lines
    .map((l, i) => [l, i] as const)
    .filter(([l]) => l.kind !== "CREW")
  const crew = lines
    .map((l, i) => [l, i] as const)
    .filter(([l]) => l.kind === "CREW")
  return (
    <div className="space-y-6">
      <Section title={t("budget.header", "Production details")}>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field>
            <FieldLabel>
              {t("budget.travel_from", "Travelling from")}
            </FieldLabel>
            <Input
              type="date"
              value={h.travelFrom}
              onChange={(e) => setH({ ...h, travelFrom: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel>{t("budget.travel_return", "Return date")}</FieldLabel>
            <Input
              type="date"
              value={h.travelReturn}
              onChange={(e) => setH({ ...h, travelReturn: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel>{t("budget.live_from", "Live from")}</FieldLabel>
            <Input
              type="time"
              value={h.liveFrom}
              onChange={(e) => setH({ ...h, liveFrom: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel>{t("budget.live_to", "Live to")}</FieldLabel>
            <Input
              type="time"
              value={h.liveTo}
              onChange={(e) => setH({ ...h, liveTo: e.target.value })}
            />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel>{t("budget.city", "City")}</FieldLabel>
            <Input
              value={h.city}
              onChange={(e) => setH({ ...h, city: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel>
              {t("budget.exchange", "Exchange rate (TZS per USD, optional)")}
            </FieldLabel>
            <Input
              type="number"
              min={0}
              value={h.exchangeRate}
              onChange={(e) => setH({ ...h, exchangeRate: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel>{t("budget.rate", "Crew allowance rate")}</FieldLabel>
            <NativeSelect
              className="w-full"
              value={h.rateId}
              onChange={(e) => {
                setH({ ...h, rateId: e.target.value })
                const r = rates.find((x) => String(x.id) === e.target.value)
                if (r) applyAll(r)
              }}
            >
              <NativeSelectOption value="">—</NativeSelectOption>
              {rates.map((r) => (
                <NativeSelectOption key={r.id} value={String(r.id)}>
                  {r.name} — {money(r.amount, r.currency)}/day
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field className="sm:col-span-4">
            <FieldLabel>
              {t("budget.equipment", "Equipment list (OB van, DSNG…)")}
            </FieldLabel>
            <Input
              value={h.equipmentNote}
              onChange={(e) => setH({ ...h, equipmentNote: e.target.value })}
            />
          </Field>
        </div>
      </Section>

      <Section
        title={t("budget.expenses", "Details of expenses")}
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setLines([
                ...lines,
                {
                  kind: "EXPENSE",
                  description: "",
                  payee: null,
                  currency: "TZS",
                  amount: 0,
                  km: null,
                  litres: null,
                  supplier: null,
                  remarks: null,
                  employeeId: null,
                  role: null,
                  days: null,
                  rate: null,
                  rateCode: null,
                  rateOverrideReason: null,
                  bankName: null,
                  bankAccount: null,
                },
              ])
            }
          >
            <PlusIcon />
            {t("budget.add_line", "Add line")}
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-1 py-2">{t("budget.item", "Item")}</th>
                <th className="px-1 py-2">
                  {t("budget.payee", "Name / payee")}
                </th>
                <th className="px-1 py-2">{t("budget.currency", "Cur.")}</th>
                <th className="px-1 py-2">{t("budget.amount", "Amount")}</th>
                <th className="px-1 py-2">{t("budget.km", "Km")}</th>
                <th className="px-1 py-2">{t("budget.litres", "Litres")}</th>
                <th className="px-1 py-2">
                  {t("budget.from", "From (SSB/UPL)")}
                </th>
                <th className="px-1 py-2">{t("budget.remarks", "Remarks")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {nonCrew.map(([l, i]) => (
                <tr key={i} className="border-b">
                  <td className="px-1 py-1">
                    <Input
                      value={l.description}
                      onChange={(e) => upd(i, { description: e.target.value })}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <Input
                      value={l.payee ?? ""}
                      onChange={(e) => upd(i, { payee: e.target.value })}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <NativeSelect
                      value={l.currency}
                      onChange={(e) =>
                        upd(i, { currency: e.target.value as "TZS" | "USD" })
                      }
                    >
                      <NativeSelectOption value="TZS">TZS</NativeSelectOption>
                      <NativeSelectOption value="USD">USD</NativeSelectOption>
                    </NativeSelect>
                  </td>
                  <td className="px-1 py-1">
                    <Input
                      className="w-32"
                      type="number"
                      min={0}
                      value={l.amount || ""}
                      onChange={(e) =>
                        upd(i, { amount: Number(e.target.value) || 0 })
                      }
                    />
                  </td>
                  <td className="px-1 py-1">
                    <Input
                      className="w-20"
                      type="number"
                      min={0}
                      disabled={l.kind !== "FUEL"}
                      value={l.km ?? ""}
                      onChange={(e) => upd(i, { km: n(e.target.value) })}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <Input
                      className="w-20"
                      type="number"
                      min={0}
                      disabled={l.kind !== "FUEL"}
                      value={l.litres ?? ""}
                      onChange={(e) => upd(i, { litres: n(e.target.value) })}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <Input
                      className="w-24"
                      value={l.supplier ?? ""}
                      onChange={(e) => upd(i, { supplier: e.target.value })}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <Input
                      value={l.remarks ?? ""}
                      onChange={(e) => upd(i, { remarks: e.target.value })}
                    />
                  </td>
                  <td>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setLines(lines.filter((_, j) => j !== i))}
                    >
                      <Trash2Icon />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title={t("budget.crew", "Daily allowances to production crew")}
        description={t(
          "budget.crew_hint",
          "Pick the rate per person. A rate different from the standard one needs a reason. Bank details are remembered for next time."
        )}
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              run(
                async () => onSaved(await refreshBudgetCrew(p.uniqueId)),
                t("budget.crew_refreshed", "Crew added")
              )
            }
          >
            <RefreshCwIcon />
            {t("budget.refresh_crew", "Add newly assigned crew")}
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-1 py-2">
                  {t("budget.employee", "Employee")}
                </th>
                <th className="px-1 py-2">{t("productions.role", "Role")}</th>
                <th className="px-1 py-2">{t("budget.days", "Days")}</th>
                <th className="px-1 py-2">{t("budget.rate_type", "Rate")}</th>
                <th className="px-1 py-2">
                  {t("budget.amount_day", "Per day")}
                </th>
                <th className="px-1 py-2 text-right">
                  {t("budget.amount", "Amount")}
                </th>
                <th className="px-1 py-2">{t("budget.bank", "Bank")}</th>
                <th className="px-1 py-2">{t("budget.account", "A/C no.")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {crew.map(([l, i]) => {
                const std = rateBy(l.rateCode)
                const custom =
                  !std || std.amount !== l.rate || std.currency !== l.currency
                return (
                  <tr key={i} className="border-b align-top">
                    <td className="px-1 py-1">
                      {l.description}
                      <span className="block text-xs text-muted-foreground">
                        {l.employeeNumber}
                      </span>
                    </td>
                    <td className="px-1 py-1">
                      <Input
                        className="w-32"
                        value={l.role ?? ""}
                        onChange={(e) => upd(i, { role: e.target.value })}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <Input
                        className="w-16"
                        type="number"
                        min={0}
                        step="0.5"
                        value={l.days ?? ""}
                        onChange={(e) => upd(i, { days: n(e.target.value) })}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <NativeSelect
                        value={l.rateCode ?? ""}
                        onChange={(e) =>
                          setRate(
                            i,
                            rates.find((r) => r.code === e.target.value)
                          )
                        }
                      >
                        <NativeSelectOption value="">
                          {t("budget.custom", "Custom")}
                        </NativeSelectOption>
                        {rates.map((r) => (
                          <NativeSelectOption key={r.code} value={r.code}>
                            {r.name}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </td>
                    <td className="px-1 py-1">
                      <div className="flex gap-1">
                        <NativeSelect
                          value={l.currency}
                          onChange={(e) =>
                            upd(i, {
                              currency: e.target.value as "TZS" | "USD",
                            })
                          }
                        >
                          <NativeSelectOption value="TZS">
                            TZS
                          </NativeSelectOption>
                          <NativeSelectOption value="USD">
                            USD
                          </NativeSelectOption>
                        </NativeSelect>
                        <Input
                          className="w-28"
                          type="number"
                          min={0}
                          value={l.rate ?? ""}
                          onChange={(e) => upd(i, { rate: n(e.target.value) })}
                        />
                      </div>
                      {custom && (
                        <Input
                          className="mt-1"
                          placeholder={t(
                            "budget.override_reason",
                            "Reason for this rate"
                          )}
                          value={l.rateOverrideReason ?? ""}
                          onChange={(e) =>
                            upd(i, { rateOverrideReason: e.target.value })
                          }
                        />
                      )}
                    </td>
                    <td className="px-1 py-1 text-right tabular-nums">
                      {money((l.days ?? 0) * (l.rate ?? 0), l.currency)}
                    </td>
                    <td className="px-1 py-1">
                      <Input
                        className="w-24"
                        value={l.bankName ?? ""}
                        onChange={(e) => upd(i, { bankName: e.target.value })}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <Input
                        className="w-36"
                        value={l.bankAccount ?? ""}
                        onChange={(e) =>
                          upd(i, { bankAccount: e.target.value })
                        }
                      />
                    </td>
                    <td>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          setLines(lines.filter((_, j) => j !== i))
                        }
                      >
                        <Trash2Icon />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label={t("budget.crew_total", "Crew allowances")}
          value={money(tot.crewTZS)}
          hint={tot.crewUSD ? money(tot.crewUSD, "USD") : undefined}
        />
        <Stat
          label={t("budget.total_tzs", "Total TZS")}
          value={money(tot.TZS)}
        />
        <Stat
          label={t("budget.total_usd", "Total USD")}
          value={money(tot.USD, "USD")}
        />
        <Stat
          label={t("budget.total_in_tzs", "Total in TZS")}
          value={
            h.exchangeRate
              ? money(tot.TZS + tot.USD * Number(h.exchangeRate))
              : "—"
          }
          hint={
            h.exchangeRate
              ? `@ ${h.exchangeRate}`
              : t("budget.set_rate", "set an exchange rate")
          }
        />
      </div>
      <Textarea
        rows={2}
        placeholder={t("common.note", "Notes")}
        value={h.notes}
        onChange={(e) => setH({ ...h, notes: e.target.value })}
      />
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => save()}>
          <SaveIcon />
          {t("actions.save", "Save")}
        </Button>
        {b.can.submit && (
          <Button onClick={() => save(() => submitBudget(p.uniqueId))}>
            <SendIcon />
            {t("budget.submit", "Save and send for approval")}
          </Button>
        )}
      </div>
    </div>
  )
}

function Retirement({
  p,
  b,
  onSaved,
}: {
  p: Production
  b: Full
  onSaved: (x: Budget) => void
}) {
  const { t } = useTranslation()
  const run = useRun()
  const [advance, setAdvance] = useState(
    b.advanceTaken == null ? "" : String(b.advanceTaken)
  )
  const [note, setNote] = useState(b.retirementNote ?? "")
  const [rows, setRows] = useState(
    b.lines.map((l) => ({
      id: l.id!,
      actual: l.actualAmount == null ? "" : String(l.actualAmount),
      receipt: l.receiptRef ?? "",
      paid: !!l.paid,
    }))
  )
  const editable = b.can.retire
  const actual = b.lines.reduce(
    (s, l, i) => ({
      ...s,
      [l.currency]:
        s[l.currency] +
        (rows[i].actual === "" ? l.amount : Number(rows[i].actual)),
    }),
    { TZS: 0, USD: 0 } as Record<"TZS" | "USD", number>
  )
  const actualTzs = b.exchangeRate
    ? actual.TZS + actual.USD * b.exchangeRate
    : actual.TZS
  const send = (submit: boolean) =>
    run(
      async () =>
        onSaved(
          await saveRetirement(p.uniqueId, {
            advanceTaken: advance === "" ? null : Number(advance),
            retirementNote: note || null,
            lines: rows.map((r) => ({
              id: r.id,
              actualAmount: r.actual === "" ? null : Number(r.actual),
              receiptRef: r.receipt || null,
              paid: r.paid,
            })),
            submit,
          })
        ),
      submit
        ? t("budget.retirement_sent", "Retirement sent to Finance")
        : t("common.saved", "Saved")
    )
  return (
    <Section
      title={t("budget.retirement", "Retirement (actual spend)")}
      description={t(
        "budget.retirement_hint",
        "Record what was actually paid, receipt numbers and the advance taken. Finance confirms; the balance is the refund (+) or the amount still owed (−)."
      )}
      actions={
        b.retirementApproval && <ToneBadge code={b.retirementApproval.status} />
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-1 py-2">
                {t("budget.payment", "Payment details")}
              </th>
              <th className="px-1 py-2 text-right">
                {t("budget.estimated", "Estimated")}
              </th>
              <th className="px-1 py-2">{t("budget.actual", "Actual")}</th>
              <th className="px-1 py-2">
                {t("budget.receipt", "Receipt / invoice no.")}
              </th>
              <th className="px-1 py-2">{t("budget.paid", "Paid")}</th>
            </tr>
          </thead>
          <tbody>
            {b.lines.map((l, i) => (
              <tr key={l.id} className="border-b">
                <td className="px-1 py-1">
                  {l.kind === "CREW" && l.role ? `${l.role}: ` : ""}
                  {l.description}
                  {l.employeeNumber && (
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      ({l.employeeNumber})
                    </span>
                  )}
                </td>
                <td className="px-1 py-1 text-right tabular-nums">
                  {money(l.amount, l.currency)}
                </td>
                <td className="px-1 py-1">
                  <Input
                    className="w-32"
                    type="number"
                    min={0}
                    disabled={!editable}
                    placeholder={String(l.amount)}
                    value={rows[i].actual}
                    onChange={(e) =>
                      setRows(
                        rows.map((r, j) =>
                          j === i ? { ...r, actual: e.target.value } : r
                        )
                      )
                    }
                  />
                </td>
                <td className="px-1 py-1">
                  <Input
                    className="w-40"
                    disabled={!editable}
                    value={rows[i].receipt}
                    onChange={(e) =>
                      setRows(
                        rows.map((r, j) =>
                          j === i ? { ...r, receipt: e.target.value } : r
                        )
                      )
                    }
                  />
                </td>
                <td className="px-1 py-1">
                  <Checkbox
                    disabled={!editable}
                    checked={rows[i].paid}
                    onCheckedChange={(v) =>
                      setRows(
                        rows.map((r, j) =>
                          j === i ? { ...r, paid: v === true } : r
                        )
                      )
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <Field>
          <FieldLabel>{t("budget.advance", "Advance taken (TZS)")}</FieldLabel>
          <Input
            type="number"
            min={0}
            disabled={!editable}
            value={advance}
            onChange={(e) => setAdvance(e.target.value)}
          />
        </Field>
        <Stat
          label={t("budget.actual_total", "Actual total")}
          value={money(actual.TZS)}
          hint={actual.USD ? money(actual.USD, "USD") : undefined}
        />
        <Stat
          label={t("budget.balance", "Refund (+) / owed (−)")}
          value={advance === "" ? "—" : money(Number(advance) - actualTzs)}
          tone={
            advance !== "" && Number(advance) - actualTzs < 0
              ? "bad"
              : undefined
          }
        />
      </div>
      <Textarea
        className="mt-3"
        rows={2}
        disabled={!editable}
        placeholder={t("common.note", "Notes")}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      {editable && (
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="outline" onClick={() => send(false)}>
            <SaveIcon />
            {t("actions.save", "Save")}
          </Button>
          <Button onClick={() => send(true)}>
            <SendIcon />
            {t("budget.submit_retirement", "Send retirement to Finance")}
          </Button>
        </div>
      )}
    </Section>
  )
}

/** Cost estimate tab: expected spend, crew allowances, retirement. */
export function BudgetTab({ p }: { p: Production }) {
  const { t } = useTranslation()
  const run = useRun()
  const b = useLoad(() => fetchBudget(p.uniqueId), [p.uniqueId])
  const [rateId, setRateId] = useState("")
  if (!b.data) return <Loading error={b.error} />
  const d = b.data
  const docs = (
    <span className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" asChild>
        <Link to={withId(ROUTES.PRODUCTION_PACK, p.uniqueId)}>
          <FileTextIcon />
          {t("budget.documents", "Production documents (print)")}
        </Link>
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => run(() => downloadProductionPack(p.uniqueId, p.number))}
      >
        <FileSpreadsheetIcon />
        {t("budget.excel", "Production pack (Excel)")}
      </Button>
    </span>
  )
  if (!d.exists)
    return (
      <Section
        title={t("budget.title", "Cost estimate")}
        description={t(
          "budget.none_hint",
          "The money expected to be used on this production: expenses, fuel and crew allowances at the configured rates. Prepared from the assigned crew, trips and equipment."
        )}
        actions={docs}
      >
        {d.can.create ? (
          <div className="flex flex-wrap items-end gap-2">
            <Field>
              <FieldLabel>{t("budget.rate", "Crew allowance rate")}</FieldLabel>
              <NativeSelect
                value={rateId}
                onChange={(e) => setRateId(e.target.value)}
              >
                <NativeSelectOption value="">
                  {t("budget.pick_rate", "Pick the rate for this production")}
                </NativeSelectOption>
                {d.settings.rates
                  .filter((r) => r.isActive)
                  .map((r) => (
                    <NativeSelectOption key={r.id} value={String(r.id)}>
                      {r.name} — {money(r.amount, r.currency)}/day
                    </NativeSelectOption>
                  ))}
              </NativeSelect>
            </Field>
            <Button
              disabled={!rateId}
              onClick={() =>
                run(async () =>
                  b.set(await createBudget(p.uniqueId, Number(rateId)))
                )
              }
            >
              <PlusIcon />
              {t("budget.prepare", "Prepare cost estimate")}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t(
              "budget.not_yet",
              "No cost estimate yet (prepared after the production is approved)."
            )}
          </p>
        )}
      </Section>
    )
  return (
    <div className="space-y-6">
      <Section
        title={
          <span className="flex flex-wrap items-center gap-2">
            {t("budget.title", "Cost estimate")}
            <ToneBadge code={d.status} />
          </span>
        }
        description={`${d.crewCount} ${t("budget.crew_count", "crew")} · ${t("budget.rate", "Crew allowance rate")}: ${d.rate ? `${d.rate.name} (${money(d.rate.amount, d.rate.currency)}/day)` : "—"}`}
        actions={
          <span className="flex flex-wrap gap-2">
            {d.approval && (
              <Button size="sm" variant="outline" asChild>
                <Link to={withId(ROUTES.APPROVAL_DETAILS, d.approval.uniqueId)}>
                  {t("productions.approval", "Approval")}:{" "}
                  <ToneBadge code={d.approval.status} />
                </Link>
              </Button>
            )}
            {docs}
          </span>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label={t("budget.expenses_total", "Expenses")}
            value={money(d.totals.expenses.TZS)}
            hint={
              d.totals.expenses.USD
                ? money(d.totals.expenses.USD, "USD")
                : undefined
            }
          />
          <Stat
            label={t("budget.crew_total", "Crew allowances")}
            value={money(d.totals.crew.TZS)}
            hint={
              d.totals.crew.USD ? money(d.totals.crew.USD, "USD") : undefined
            }
          />
          <Stat
            label={t("budget.total", "Total expected")}
            value={money(d.totals.all.TZS)}
            hint={
              d.totals.all.USD
                ? `+ ${money(d.totals.all.USD, "USD")}`
                : undefined
            }
          />
          <Stat
            label={t("budget.fuel", "Fuel (litres)")}
            value={d.totals.litres}
          />
        </div>
      </Section>
      {d.can.edit ? (
        <Editor
          key={d.status + d.lines.length}
          p={p}
          b={d}
          onSaved={(x) => b.set(x)}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          {t(
            "budget.locked",
            "Sent for approval or approved: open the production documents to view or print it."
          )}
        </p>
      )}
      {["APPROVED", "RETIREMENT_SUBMITTED", "RETIRED"].includes(d.status) && (
        <Retirement key={d.status} p={p} b={d} onSaved={(x) => b.set(x)} />
      )}
    </div>
  )
}
