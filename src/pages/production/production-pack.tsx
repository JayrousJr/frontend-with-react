import type { ReactNode } from "react"
import { Link, useParams } from "react-router"
import { useTranslation } from "react-i18next"
import { FileSpreadsheetIcon, PrinterIcon, SaveIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/app/page-header"
import { useRun } from "@/components/app/use-run"
import { formatDay, formatStamp } from "@/lib/format"
import { ROUTES, withId } from "@/routes/routeConstants"
import {
  downloadProductionPack,
  fetchProductionDocs,
  storeProductionPack,
} from "@/services/production"
import { Loading } from "./ui"
import { clock, money, useLoad } from "./utils"

/** One printable document per page. */
function Doc({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section className="break-after-page space-y-4 rounded-lg border bg-background p-6 print:border-0 print:p-0">
      <div className="flex items-start justify-between gap-4 border-b pb-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <img src="/logo.png" alt="AzamTV" className="h-8" />
      </div>
      {children}
    </section>
  )
}

function Grid({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k} className="border-b">
            <th className="w-56 py-1 pr-2 text-left font-medium">{k}</th>
            <td className="py-1">{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Table({
  head,
  rows,
  foot,
}: {
  head: string[]
  rows: ReactNode[][]
  foot?: ReactNode[]
}) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="bg-muted print:bg-gray-100">
          {head.map((h) => (
            <th key={h} className="border px-2 py-1 text-left font-medium">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j} className="border px-2 py-1">
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
      {foot && (
        <tfoot>
          <tr className="font-semibold">
            {foot.map((c, j) => (
              <td key={j} className="border px-2 py-1">
                {c}
              </td>
            ))}
          </tr>
        </tfoot>
      )}
    </table>
  )
}

/**
 * Documents produced for a production: production (crew) document, cost
 * estimate, crew allowance list, equipment used and retirement. Printable
 * (PDF) and downloadable as one Excel workbook; also stored automatically in
 * the production's documents when the production is completed.
 */
const ProductionPackPage = () => {
  const { t } = useTranslation()
  const run = useRun()
  const { uniqueId = "" } = useParams()
  const d = useLoad(() => fetchProductionDocs(uniqueId), [uniqueId])
  if (!d.data) return <Loading error={d.error} />
  const { crewDocument: c, equipmentUsed: eq, budget: b } = d.data
  const crewLines = b?.lines.filter((l) => l.kind === "CREW") ?? []
  const expenseLines = b?.lines.filter((l) => l.kind !== "CREW") ?? []
  const retired =
    b &&
    (["RETIREMENT_SUBMITTED", "RETIRED"].includes(b.status) ||
      b.lines.some((l) => l.actualAmount != null))
  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          title={t("pack.title", "Production documents — {{n}}", {
            n: c.number,
          })}
          description={
            <Link
              className="underline"
              to={`${withId(ROUTES.PRODUCTION_DETAILS, uniqueId)}?tab=budget`}
            >
              {c.title}
            </Link>
          }
          actions={
            <>
              <Button
                variant="outline"
                onClick={() =>
                  run(() => downloadProductionPack(uniqueId, c.number))
                }
              >
                <FileSpreadsheetIcon />
                {t("budget.excel", "Production pack (Excel)")}
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  run(
                    () => storeProductionPack(uniqueId),
                    t("pack.stored", "Saved to the production's documents")
                  )
                }
              >
                <SaveIcon />
                {t("pack.store", "Save to documents")}
              </Button>
              <Button onClick={() => window.print()}>
                <PrinterIcon />
                {t("actions.print", "Print / PDF")}
              </Button>
            </>
          }
        />
      </div>

      <Doc title={t("pack.crew_doc", "Production Document")}>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <div className="text-xs text-muted-foreground uppercase">
              {c.category}
            </div>
            <div className="text-lg font-semibold text-red-600">{c.title}</div>
            <div className="text-xs uppercase">{c.venues}</div>
            <div className="mt-2 text-xs text-muted-foreground">
              {t("pack.crew_leader", "Crew leader / producer")}
            </div>
            <div className="text-sky-700">{c.producer}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">
              {t("pack.call_time", "Call time")}
            </div>
            <div className="text-3xl">{clock(c.callTime)}hrs</div>
            <div className="text-xs text-muted-foreground">
              {t("pack.live_time", "Live time")}
            </div>
            <div className="text-3xl">{clock(c.liveTime)}hrs</div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div>
              {t("pack.from", "FROM")}: {formatStamp(c.from)}
            </div>
            <div>
              {t("pack.to", "TO")}: {formatStamp(c.to)}
            </div>
            <div className="mt-2 font-medium text-foreground">
              {t("pack.facilities", "FACILITIES")}
            </div>
            {c.facilities.map((f) => (
              <div key={f}>{f}</div>
            ))}
          </div>
        </div>
        <Table
          head={[
            "S/N",
            t("callsheet.name", "Name"),
            t("pack.emp_no", "Employee no."),
            t("productions.role", "Role"),
            t("pack.job_title", "Job title"),
            t("productions.department", "Department"),
          ]}
          rows={c.crew.map((x, i) => [
            i + 1,
            x.name,
            x.employeeNumber,
            x.role,
            x.jobTitle,
            x.department,
          ])}
        />
      </Doc>

      {b && (
        <Doc title={t("pack.budget", "Live Event Production — Cost estimate")}>
          <Grid
            rows={[
              [t("pack.prod_no", "Production number"), b.number],
              [t("pack.production", "Production"), b.title],
              [t("budget.city", "City"), b.city ?? ""],
              [
                t("pack.travel", "Date of travelling / return"),
                `${formatDay(b.travelFrom)} – ${formatDay(b.travelReturn)}`,
              ],
              [
                t("pack.live", "Timing for live production"),
                `${b.liveFrom ?? ""} – ${b.liveTo ?? ""}`,
              ],
              [
                t("budget.equipment", "Equipment list (OB van, DSNG…)"),
                b.equipmentNote ?? "",
              ],
              [t("pack.crew_no", "Number of production crew"), b.crewCount],
              [
                t("budget.total", "Total expected"),
                <b>
                  {money(b.totals.all.TZS)}
                  {b.totals.all.USD
                    ? ` + ${money(b.totals.all.USD, "USD")}`
                    : ""}
                  {b.totals.allInTzs != null
                    ? ` (≈ ${money(b.totals.allInTzs)})`
                    : ""}
                </b>,
              ],
              [t("common.status", "Status"), t(`codes.${b.status}`, b.status)],
            ]}
          />
          <Table
            head={[
              t("budget.expenses", "Details of expenses"),
              t("budget.payee", "Name / payee"),
              t("budget.amount", "Amount"),
              t("budget.km", "Km"),
              t("budget.litres", "Litres"),
              t("budget.from", "From (SSB/UPL)"),
              t("budget.remarks", "Remarks"),
            ]}
            rows={[
              ...expenseLines.map((l) => [
                l.description,
                l.payee ?? "",
                l.amount ? money(l.amount, l.currency) : "",
                l.km ?? "",
                l.litres ?? "",
                l.supplier ?? "",
                l.remarks ?? "",
              ]),
              [
                <b>
                  {t(
                    "pack.allowances",
                    "Allowances to production crew — as per list"
                  )}
                </b>,
                "",
                <b>
                  {money(b.totals.crew.TZS)}
                  {b.totals.crew.USD
                    ? ` + ${money(b.totals.crew.USD, "USD")}`
                    : ""}
                </b>,
                "",
                "",
                "",
                "",
              ],
            ]}
            foot={[
              t("pack.total_expenses", "Total expenses"),
              "",
              `${money(b.totals.all.TZS)}${b.totals.all.USD ? ` + ${money(b.totals.all.USD, "USD")}` : ""}`,
              "",
              `${b.totals.litres} L`,
              "",
              "",
            ]}
          />
        </Doc>
      )}

      {b && (
        <Doc
          title={t(
            "pack.allowance_list",
            "Daily allowances to production crew"
          )}
        >
          <Table
            head={[
              t("pack.emp_name", "Employee name"),
              t("pack.emp_no", "Employee no."),
              t("budget.days", "Days"),
              t("budget.amount_day", "Rate"),
              t("budget.amount", "Amount"),
              t("budget.bank", "Bank"),
              t("budget.account", "A/C no."),
            ]}
            rows={crewLines.map((l) => [
              `${l.role ? `${l.role}: ` : ""}${l.description}`,
              l.employeeNumber ?? "",
              l.days ?? "",
              money(l.rate, l.currency),
              money(l.amount, l.currency),
              l.bankName ?? "",
              l.bankAccount ?? "",
            ])}
            foot={[
              "TOTAL",
              "",
              "",
              "",
              `${money(b.totals.crew.TZS)}${b.totals.crew.USD ? ` + ${money(b.totals.crew.USD, "USD")}` : ""}`,
              "",
              "",
            ]}
          />
          {crewLines.some((l) => l.rateOverrideReason) && (
            <p className="text-xs text-muted-foreground">
              {t("pack.rate_notes", "Rate notes")}:{" "}
              {crewLines
                .filter((l) => l.rateOverrideReason)
                .map((l) => `${l.description}: ${l.rateOverrideReason}`)
                .join("; ")}
            </p>
          )}
        </Doc>
      )}

      <Doc title={t("pack.equipment", "Equipment and items used")}>
        <Table
          head={[
            t("bookings.number", "Booking"),
            t("bookings.tag", "Tag"),
            t("bookings.item", "Item"),
            t("productions.category", "Category"),
            t("productions.quantity", "Qty"),
            t("bookings.out", "Out"),
            t("bookings.in", "Returned"),
            t("bookings.report", "Report"),
          ]}
          rows={eq.map((e) => [
            e.booking,
            e.tag,
            e.item,
            e.category,
            e.quantity,
            e.out
              ? t(`codes.${e.out}`, e.out)
              : e.consumable
                ? t("bookings.consumable_short", "consumable")
                : "",
            typeof e.returned === "string"
              ? t(`codes.${e.returned}`, e.returned)
              : e.returned,
            e.report,
          ])}
        />
        {!eq.length && (
          <p className="text-sm text-muted-foreground">
            {t(
              "pack.no_equipment",
              "No equipment checked out for this production."
            )}
          </p>
        )}
      </Doc>

      {b && retired && (
        <Doc
          title={t("pack.retirement", "Retirement — {{n}}", { n: b.number })}
        >
          <Table
            head={[
              t("budget.payment", "Payment details"),
              t("pack.emp_no", "Employee no."),
              t("budget.estimated", "Estimated"),
              t("budget.actual", "Actual"),
              t("budget.receipt", "Receipt / invoice no."),
              t("pack.signature", "Signature"),
            ]}
            rows={b.lines
              .filter((l) => l.amount > 0 || (l.actualAmount ?? 0) > 0)
              .map((l) => [
                `${l.kind === "CREW" && l.role ? `${l.role}: ` : ""}${l.description}`,
                l.employeeNumber ?? "",
                money(l.amount, l.currency),
                l.actualAmount == null ? "" : money(l.actualAmount, l.currency),
                l.receiptRef ?? "",
                "",
              ])}
          />
          <Grid
            rows={[
              [
                t("budget.actual_total", "Actual total"),
                `${money(b.totals.actual.TZS)}${b.totals.actual.USD ? ` + ${money(b.totals.actual.USD, "USD")}` : ""}`,
              ],
              [
                t("budget.advance", "Advance taken (TZS)"),
                money(b.advanceTaken),
              ],
              [t("budget.balance", "Refund (+) / owed (−)"), money(b.balance)],
              [t("common.status", "Status"), t(`codes.${b.status}`, b.status)],
            ]}
          />
        </Doc>
      )}
    </div>
  )
}

export default ProductionPackPage
