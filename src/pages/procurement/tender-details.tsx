import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { useTranslation } from "react-i18next"
import {
  AwardIcon,
  CheckIcon,
  FilePlusIcon,
  MailIcon,
  PencilIcon,
  PrinterIcon,
  SendIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  UnlockIcon,
  UsersIcon,
  XCircleIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldLabel } from "@/components/ui/field"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
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
import { useCodeLabel } from "@/components/app/use-code-label"
import { useRun } from "@/components/app/use-run"
import { formatStamp } from "@/lib/format"
import { cn } from "@/lib/utils"
import { ROUTES, withId } from "@/routes/routeConstants"
import type { UploadedFile } from "@/services/products"
import {
  answerClarification,
  appointCommittee,
  cancelTender,
  chooseWinner,
  confirmOpening,
  createOrdersFromAward,
  declareCoi,
  fetchCommitteeCandidates,
  fetchTender,
  issueAddendum,
  negotiate,
  overrideCompliance,
  publishTender,
  saveEvaluationNote,
  sendLetters,
  submitAward,
  updateTender,
  type Offer,
  type Tender,
} from "@/services/procurement"
import { FileUpload, Files, FormDialog, Info, Loading } from "./shared"
import { tzs, useLoad } from "./shared-utils"
import { TenderFields, type TenderFieldsValue } from "./queue"

const local = (iso: string | null) => {
  if (!iso) return ""
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function CommitteeDialog({
  tender,
  onClose,
  onDone,
}: {
  tender: Tender
  onClose: () => void
  onDone: (t: Tender) => void
}) {
  const { t } = useTranslation()
  const run = useRun()
  const c = useLoad(fetchCommitteeCandidates)
  const [sel, setSel] = useState<Set<string>>(
    new Set(tender.committee.map((m) => m.userUniqueId))
  )
  const [chair, setChair] = useState(
    tender.committee.find((m) => m.isChair)?.userUniqueId ?? ""
  )
  return (
    <FormDialog
      title={t("tenders.committee", "Evaluation committee")}
      description={t(
        "tenders.committee_hint",
        "Per tender: owning department + Finance + another department. The officer who created or published the tender and the final award approver (CEO) cannot sit on it."
      )}
      confirmLabel={t("actions.save", "Save")}
      canConfirm={sel.size >= (tender.openingQuorum ?? 2)}
      onClose={onClose}
      onConfirm={() =>
        run(
          async () =>
            onDone(
              await appointCommittee(
                tender.uniqueId,
                [...sel],
                chair || undefined
              )
            ),
          t("common.saved", "Saved")
        )
      }
    >
      {!c.data ? (
        <Loading error={c.error} />
      ) : (
        <div className="space-y-2">
          {c.data.map((u) => (
            <label key={u.uniqueId} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={sel.has(u.uniqueId)}
                onCheckedChange={(on) =>
                  setSel((p) => {
                    const n = new Set(p)
                    if (on) n.add(u.uniqueId)
                    else n.delete(u.uniqueId)
                    return n
                  })
                }
              />
              {u.name}{" "}
              <span className="text-muted-foreground">· {u.department}</span>
            </label>
          ))}
          <Field>
            <FieldLabel>{t("tenders.chair", "Chair")}</FieldLabel>
            <NativeSelect
              className="w-full"
              value={chair}
              onChange={(e) => setChair(e.target.value)}
            >
              <NativeSelectOption value="">—</NativeSelectOption>
              {c.data
                .filter((u) => sel.has(u.uniqueId))
                .map((u) => (
                  <NativeSelectOption key={u.uniqueId} value={u.uniqueId}>
                    {u.name}
                  </NativeSelectOption>
                ))}
            </NativeSelect>
          </Field>
        </div>
      )}
    </FormDialog>
  )
}

function OfferCell({ o }: { o: Offer }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-1 text-xs">
      <ul>
        {o.compliance.map((c, i) => (
          <li key={i} className={c.complies ? "" : "text-destructive"}>
            {c.complies ? "✓" : "✗"} {c.spec}
            {c.offered && (
              <span className="text-muted-foreground"> — {c.offered}</span>
            )}
          </li>
        ))}
      </ul>
      {(o.brand || o.model || o.countryOfOrigin) && (
        <div className="text-muted-foreground">
          {[o.brand, o.model, o.countryOfOrigin].filter(Boolean).join(" · ")}
        </div>
      )}
      <Files files={o.files} />
      {o.disqualifyReason && (
        <div className="text-destructive">{o.disqualifyReason}</div>
      )}
      {o.overrideReason && (
        <div className="text-amber-700 dark:text-amber-400">
          {t("tenders.override", "Committee override")}: {o.overrideReason}
        </div>
      )}
      {o.negotiationNote && (
        <div className="text-muted-foreground">
          {t("tenders.negotiation", "Negotiation")}: {o.negotiationNote}
        </div>
      )}
    </div>
  )
}

const TenderDetailsPage = () => {
  const { t } = useTranslation()
  const label = useCodeLabel()
  const run = useRun()
  const navigate = useNavigate()
  const { uniqueId = "" } = useParams()
  const x = useLoad(() => fetchTender(uniqueId), [uniqueId])
  const [dialog, setDialog] = useState<
    null | "edit" | "committee" | "cancel" | "addendum" | "coi"
  >(null)
  const [edit, setEdit] = useState<TenderFieldsValue | null>(null)
  const [addendum, setAddendum] = useState<{
    text: string
    closing: string
    files: UploadedFile[]
  }>({ text: "", closing: "", files: [] })
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [override, setOverride] = useState<{
    o: Offer
    compliant: boolean
  } | null>(null)
  const [winner, setWinner] = useState<{
    lineNo: number
    bidLineId: number | null
  } | null>(null)
  const [neg, setNeg] = useState<{
    o: Offer
    price: string
    days: string
    note: string
  } | null>(null)
  const [note, setNote] = useState<string | null>(null)
  if (!x.data) return <Loading error={x.error} />
  const d = x.data
  const act = (fn: () => Promise<Tender>, ok?: string) =>
    run(async () => x.set(await fn()), ok)
  const confirmed = d.committee.filter((m) => m.openingConfirmed).length
  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          title={
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-mono">{d.number}</span>
              <ToneBadge code={d.status} />
            </span>
          }
          description={`${d.title} · ${label(d.route)}${d.singleSourceVendor ? ` (${d.singleSourceVendor})` : ""}`}
          actions={
            <>
              {d.can.viewBids && (
                <Button variant="outline" onClick={() => window.print()}>
                  <PrinterIcon />
                  {t("tenders.evaluation_report", "Evaluation report")}
                </Button>
              )}
              {d.awardApprovalUniqueId && (
                <Button variant="outline" asChild>
                  <Link
                    to={withId(
                      ROUTES.APPROVAL_DETAILS,
                      d.awardApprovalUniqueId
                    )}
                  >
                    <ShieldCheckIcon />
                    {t("tenders.award_approval", "Award approval")}
                  </Link>
                </Button>
              )}
              {d.can.edit && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setEdit({
                      title: d.title,
                      closingAt: local(d.closingAt),
                      bidValidityDays: String(d.bidValidityDays),
                      description: d.description ?? "",
                      deliveryTerms: d.deliveryTerms ?? "",
                      terms: d.terms ?? "",
                    })
                    setDialog("edit")
                  }}
                >
                  <PencilIcon />
                  {t("actions.edit", "Edit")}
                </Button>
              )}
              {d.can.appointCommittee && (
                <Button
                  variant="outline"
                  onClick={() => setDialog("committee")}
                >
                  <UsersIcon />
                  {t("tenders.committee", "Evaluation committee")}
                </Button>
              )}
              {d.can.addendum && (
                <Button variant="outline" onClick={() => setDialog("addendum")}>
                  <FilePlusIcon />
                  {t("tenders.addendum", "Addendum")}
                </Button>
              )}
              {d.can.cancel && (
                <Button variant="outline" onClick={() => setDialog("cancel")}>
                  <XCircleIcon />
                  {t("actions.cancel", "Cancel")}
                </Button>
              )}
              {d.can.publish && (
                <Button
                  onClick={() =>
                    act(
                      () => publishTender(d.uniqueId),
                      t("tenders.published", "Published to eligible vendors")
                    )
                  }
                >
                  <SendIcon />
                  {t("tenders.publish", "Publish")}
                </Button>
              )}
              {d.can.confirmOpening && (
                <Button
                  onClick={() =>
                    act(
                      () => confirmOpening(d.uniqueId),
                      t("tenders.opening_confirmed", "Opening confirmed")
                    )
                  }
                >
                  <UnlockIcon />
                  {t("tenders.confirm_opening", "Confirm bid opening")}
                </Button>
              )}
              {d.can.submitAward && (
                <Button
                  onClick={() =>
                    act(
                      () => submitAward(d.uniqueId),
                      t("tenders.award_sent", "Sent for award approval")
                    )
                  }
                >
                  <AwardIcon />
                  {t("tenders.submit_award", "Send for award approval")}
                </Button>
              )}
              {d.can.sendLetters && (
                <Button
                  onClick={() =>
                    act(
                      () => sendLetters(d.uniqueId),
                      t("tenders.letters_sent", "Award and regret letters sent")
                    )
                  }
                >
                  <MailIcon />
                  {t("tenders.send_letters", "Send award / regret letters")}
                </Button>
              )}
              {d.can.createOrders && (
                <Button
                  onClick={() =>
                    run(
                      async () => {
                        const orders = await createOrdersFromAward(d.uniqueId)
                        navigate(
                          orders.length === 1
                            ? withId(ROUTES.ORDER_DETAILS, orders[0].uniqueId)
                            : ROUTES.ORDERS
                        )
                      },
                      t("tenders.orders_created", "Draft LPOs created")
                    )
                  }
                >
                  <ShoppingCartIcon />
                  {t("tenders.create_orders", "Create LPOs")}
                </Button>
              )}
            </>
          }
        />
      </div>
      <div className="hidden print:block">
        <div className="text-xs uppercase">
          AzamTV — {t("tenders.evaluation_report", "Evaluation report")}
        </div>
        <div className="font-mono text-2xl font-bold">{d.number}</div>
        <div>{d.title}</div>
      </div>

      {d.status === "CANCELLED" && d.cancelReason && (
        <Alert variant="destructive">
          <AlertDescription>{d.cancelReason}</AlertDescription>
        </Alert>
      )}
      {d.isMember && !d.myCoiDeclared && d.can.declareCoi && (
        <Alert className="print:hidden">
          <AlertDescription className="flex flex-wrap items-center gap-2">
            {t(
              "tenders.coi_needed",
              "As a committee member, declare whether you have a conflict of interest before acting on this tender."
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDialog("coi")}
            >
              {t("tenders.declare", "Declare")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent>
          <Info
            items={[
              [t("tenders.closing_at", "Closing"), formatStamp(d.closingAt)],
              [t("tenders.validity", "Bid validity (days)"), d.bidValidityDays],
              [
                t("tenders.created", "Created"),
                `${d.createdBy} · ${formatStamp(d.createdAt)}`,
              ],
              [
                t("tenders.published_at", "Published"),
                d.publishedAt && formatStamp(d.publishedAt),
              ],
              [
                t("tenders.opened_at", "Opened"),
                d.openedAt && formatStamp(d.openedAt),
              ],
              [
                t("tenders.awarded_at", "Awarded"),
                d.awardedAt && formatStamp(d.awardedAt),
              ],
              [
                t("tenders.invited", "invited"),
                d.invited.map((v) => v.name).join(", "),
              ],
              [
                t("tenders.sealed", "Sealed bids received"),
                !d.can.viewBids && d.status !== "DRAFT"
                  ? String(d.sealedBids)
                  : null,
              ],
              [t("tenders.description", "Description"), d.description],
              [
                t("tenders.delivery_terms", "Delivery requirements"),
                d.deliveryTerms,
              ],
              [t("tenders.terms", "Terms"), d.terms],
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {t("tenders.committee", "Evaluation committee")}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {d.committee.length === 0 && (
            <p className="text-muted-foreground">
              {t(
                "tenders.no_committee",
                "Appoint the committee before publishing."
              )}
            </p>
          )}
          <ul className="space-y-1">
            {d.committee.map((m) => (
              <li
                key={m.userUniqueId}
                className="flex flex-wrap items-center gap-2"
              >
                <span className="font-medium">{m.name}</span>
                <span className="text-muted-foreground">{m.department}</span>
                {m.isChair && (
                  <Badge variant="secondary">
                    {t("tenders.chair", "Chair")}
                  </Badge>
                )}
                <Badge variant={m.coiDeclared ? "outline" : "destructive"}>
                  {m.coiDeclared
                    ? t("tenders.no_conflict", "No conflict declared")
                    : t("tenders.no_declaration", "No declaration")}
                </Badge>
                {m.coiStatement && !m.coiDeclared && (
                  <span className="text-destructive">{m.coiStatement}</span>
                )}
                {m.openingConfirmed && (
                  <Badge variant="outline">
                    {t("tenders.opening_ok", "Confirmed opening")}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
          {d.status === "CLOSED" && (
            <p className="mt-2 text-muted-foreground">
              {t("tenders.quorum", "Opening confirmations: {{n}} of {{q}}", {
                n: confirmed,
                q: d.openingQuorum ?? 2,
              })}
            </p>
          )}
        </CardContent>
      </Card>

      {d.lines.map((l) => {
        const winnerOffer = l.offers.find((o) => o.isWinner)
        return (
          <Card key={l.lineNo} className="break-inside-avoid">
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                {l.lineNo}. {l.productName}
                <span className="font-normal text-muted-foreground">
                  {l.quantity} {l.unit} · {l.productCode} · VAT {l.vatRate}%
                </span>
                <ToneBadge code={l.status} />
                {l.tie && !l.awardReason && (
                  <Badge variant="destructive">
                    {t("tenders.tie", "Tie — committee decision")}
                  </Badge>
                )}
              </CardTitle>
              <div className="text-xs text-muted-foreground">
                {t("tenders.specs", "Specifications")}: {l.specs.join("; ")} ·{" "}
                {t("tenders.from", "From")}{" "}
                {l.sources.map((s) => (
                  <Link
                    key={`${s.purchaseRequestUniqueId}${s.lineNo}`}
                    className="underline"
                    to={withId(
                      ROUTES.PURCHASE_REQUEST_DETAILS,
                      s.purchaseRequestUniqueId
                    )}
                  >
                    {s.purchaseRequestNumber}/{s.lineNo} ({s.quantity}){" "}
                  </Link>
                ))}
              </div>
              {l.awardReason && (
                <div className="text-xs">
                  {t("tenders.award_reason", "Committee decision")}:{" "}
                  {l.awardReason}
                </div>
              )}
            </CardHeader>
            {d.can.viewBids && (
              <CardContent className="overflow-x-auto">
                {l.offers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("tenders.no_offers", "No offers for this item.")}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>{t("vendors.vendor", "Vendor")}</TableHead>
                        <TableHead className="text-right">
                          {t("tenders.unit_price", "Unit price incl. VAT")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("tenders.total", "Total")}
                        </TableHead>
                        <TableHead>
                          {t("tenders.delivery", "Delivery")}
                        </TableHead>
                        <TableHead>
                          {t("tenders.compliance", "Compliance")}
                        </TableHead>
                        <TableHead className="print:hidden" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {l.offers.map((o) => (
                        <TableRow
                          key={o.bidLineId}
                          className={cn(
                            o.isWinner && "bg-emerald-500/10",
                            o.compliant === false && "text-muted-foreground"
                          )}
                        >
                          <TableCell>{o.rank ?? "—"}</TableCell>
                          <TableCell className="font-medium">
                            {o.vendorName}
                            {o.isWinner && (
                              <CheckIcon className="ml-1 inline size-4 text-emerald-600" />
                            )}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {o.negotiatedPrice != null ? (
                              <>
                                <s className="text-muted-foreground">
                                  {tzs(o.unitPrice)}
                                </s>{" "}
                                {tzs(o.negotiatedPrice)}
                              </>
                            ) : (
                              tzs(o.unitPrice)
                            )}
                            <div className="text-xs text-muted-foreground">
                              {t("tenders.excl", "excl.")}{" "}
                              {tzs(o.unitPriceExclVat)} + VAT {tzs(o.unitVat)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {tzs(
                              (o.negotiatedPrice ?? o.unitPrice) * l.quantity
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {o.negotiatedDays ?? o.deliveryDays}{" "}
                            {t("tenders.days", "days")}
                          </TableCell>
                          <TableCell className="min-w-64">
                            <OfferCell o={o} />
                          </TableCell>
                          <TableCell className="space-y-1 text-right print:hidden">
                            {d.can.evaluate && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    setOverride({ o, compliant: !o.compliant })
                                  }
                                >
                                  {o.compliant
                                    ? t("tenders.disqualify", "Disqualify")
                                    : t(
                                        "tenders.qualify",
                                        "Accept as compliant"
                                      )}
                                </Button>
                                {o.compliant && !o.isWinner && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      setWinner({
                                        lineNo: l.lineNo,
                                        bidLineId: o.bidLineId,
                                      })
                                    }
                                  >
                                    {t("tenders.choose", "Choose as winner")}
                                  </Button>
                                )}
                              </>
                            )}
                            {d.can.negotiate && o.compliant && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setNeg({
                                    o,
                                    price: String(o.negotiatedPrice ?? ""),
                                    days: String(o.negotiatedDays ?? ""),
                                    note: o.negotiationNote ?? "",
                                  })
                                }
                              >
                                {t("tenders.negotiate", "Record negotiation")}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                {d.can.evaluate && winnerOffer && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2 print:hidden"
                    onClick={() =>
                      setWinner({ lineNo: l.lineNo, bidLineId: null })
                    }
                  >
                    {t("tenders.no_award", "Do not award this item")}
                  </Button>
                )}
              </CardContent>
            )}
          </Card>
        )
      })}

      {(d.can.evaluate || d.evaluationNote) && (
        <Card>
          <CardHeader>
            <CardTitle>{t("tenders.minutes", "Evaluation minutes")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {d.can.evaluate ? (
              <>
                <Textarea
                  rows={4}
                  value={note ?? d.evaluationNote ?? ""}
                  onChange={(e) => setNote(e.target.value)}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="print:hidden"
                  disabled={note === null}
                  onClick={() =>
                    act(
                      () => saveEvaluationNote(d.uniqueId, note ?? ""),
                      t("common.saved", "Saved")
                    )
                  }
                >
                  {t("actions.save", "Save")}
                </Button>
              </>
            ) : (
              <p className="text-sm whitespace-pre-line">{d.evaluationNote}</p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2 print:hidden">
        <Card>
          <CardHeader>
            <CardTitle>
              {t("tenders.clarifications", "Clarifications")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {d.clarifications.length === 0 && (
              <p className="text-muted-foreground">
                {t("tenders.no_questions", "No questions.")}
              </p>
            )}
            {d.clarifications.map((c) => (
              <div key={c.uniqueId} className="space-y-1 rounded-md border p-2">
                <div>
                  <span className="font-medium">Q:</span> {c.question}{" "}
                  <span className="text-xs text-muted-foreground">
                    {formatStamp(c.askedAt)}
                  </span>
                </div>
                {c.answer ? (
                  <div>
                    <span className="font-medium">A:</span> {c.answer}
                  </div>
                ) : (
                  d.can.answer && (
                    <div className="flex gap-2">
                      <Input
                        value={answers[c.uniqueId] ?? ""}
                        onChange={(e) =>
                          setAnswers({
                            ...answers,
                            [c.uniqueId]: e.target.value,
                          })
                        }
                        placeholder={t(
                          "tenders.answer_hint",
                          "Answer (sent to every invited vendor)"
                        )}
                      />
                      <Button
                        size="sm"
                        disabled={!answers[c.uniqueId]?.trim()}
                        onClick={() =>
                          act(
                            () =>
                              answerClarification(
                                c.uniqueId,
                                answers[c.uniqueId]
                              ),
                            t("tenders.answered", "Answer sent")
                          )
                        }
                      >
                        {t("tenders.answer", "Answer")}
                      </Button>
                    </div>
                  )
                )}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("tenders.addenda", "Addenda")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {d.addenda.length === 0 && (
              <p className="text-muted-foreground">
                {t("tenders.no_addenda", "No addenda.")}
              </p>
            )}
            {d.addenda.map((a) => (
              <div key={a.number} className="rounded-md border p-2">
                <div className="font-medium">
                  {t("tenders.addendum", "Addendum")} {a.number} ·{" "}
                  {formatStamp(a.createdAt)}
                </div>
                <p className="whitespace-pre-line">{a.text}</p>
                {a.newClosingAt && (
                  <div className="text-xs">
                    {t("tenders.new_closing", "New closing")}:{" "}
                    {formatStamp(a.newClosingAt)}
                  </div>
                )}
                <Files files={[a.file]} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {dialog === "edit" && edit && (
        <FormDialog
          wide
          title={t("actions.edit", "Edit")}
          confirmLabel={t("actions.save", "Save")}
          onClose={() => setDialog(null)}
          onConfirm={() =>
            act(() =>
              updateTender(d.uniqueId, {
                title: edit.title,
                closingAt: edit.closingAt
                  ? new Date(edit.closingAt).toISOString()
                  : null,
                bidValidityDays: Number(edit.bidValidityDays) || null,
                description: edit.description,
                deliveryTerms: edit.deliveryTerms,
                terms: edit.terms,
              })
            )
          }
        >
          <TenderFields value={edit} onChange={setEdit} />
        </FormDialog>
      )}
      {dialog === "committee" && (
        <CommitteeDialog
          tender={d}
          onClose={() => setDialog(null)}
          onDone={(n) => x.set(n)}
        />
      )}
      {dialog === "cancel" && (
        <ReasonDialog
          title={t("tenders.cancel_title", "Cancel this tender?")}
          description={t(
            "tenders.cancel_hint",
            "Request lines go back to the Purchasing queue; invited vendors are told."
          )}
          confirmLabel={t("tenders.cancel_confirm", "Cancel tender")}
          destructive
          onClose={() => setDialog(null)}
          onConfirm={(reason) => act(() => cancelTender(d.uniqueId, reason))}
        />
      )}
      {dialog === "coi" && (
        <ReasonDialog
          title={t("tenders.coi_title", "Conflict of interest declaration")}
          description={t(
            "tenders.coi_desc",
            "Confirm you have no interest in any bidder. If you do, describe it and choose 'I have a conflict': Procurement will replace you."
          )}
          confirmLabel={t(
            "tenders.no_conflict_btn",
            "I have no conflict of interest"
          )}
          onClose={() => setDialog(null)}
          onConfirm={(statement) =>
            act(
              () => declareCoi(d.uniqueId, true, statement),
              t("common.saved", "Saved")
            )
          }
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              act(() =>
                declareCoi(
                  d.uniqueId,
                  false,
                  t("tenders.conflict_declared", "Conflict declared")
                )
              ).then(() => setDialog(null))
            }
          >
            {t("tenders.conflict_btn", "I have a conflict")}
          </Button>
        </ReasonDialog>
      )}
      {dialog === "addendum" && (
        <FormDialog
          title={t("tenders.addendum", "Addendum")}
          description={t(
            "tenders.addendum_hint",
            "Sent to every invited vendor. The closing time is extended to the policy minimum if needed."
          )}
          confirmLabel={t("tenders.issue", "Issue")}
          canConfirm={addendum.text.trim().length >= 5}
          onClose={() => setDialog(null)}
          onConfirm={() =>
            act(
              () =>
                issueAddendum(
                  d.uniqueId,
                  addendum.text,
                  addendum.closing
                    ? new Date(addendum.closing).toISOString()
                    : undefined,
                  addendum.files[0]?.uniqueId
                ),
              t("tenders.addendum_issued", "Addendum issued")
            )
          }
        >
          <Textarea
            rows={4}
            value={addendum.text}
            onChange={(e) => setAddendum({ ...addendum, text: e.target.value })}
          />
          <Field>
            <FieldLabel htmlFor="ad-close">
              {t("tenders.new_closing", "New closing")}
            </FieldLabel>
            <Input
              id="ad-close"
              type="datetime-local"
              value={addendum.closing}
              onChange={(e) =>
                setAddendum({ ...addendum, closing: e.target.value })
              }
            />
          </Field>
          <FileUpload
            multiple={false}
            files={addendum.files}
            onChange={(files) => setAddendum({ ...addendum, files })}
          />
        </FormDialog>
      )}
      {override && (
        <ReasonDialog
          title={
            override.compliant
              ? t("tenders.qualify", "Accept as compliant")
              : t("tenders.disqualify", "Disqualify")
          }
          description={`${override.o.vendorName} — ${t("tenders.override_hint", "A written reason is stored in the evaluation report.")}`}
          confirmLabel={t("actions.save", "Save")}
          onClose={() => setOverride(null)}
          onConfirm={(reason) =>
            act(() =>
              overrideCompliance(
                d.uniqueId,
                override.o.bidLineId,
                override.compliant,
                reason
              )
            )
          }
        />
      )}
      {winner && (
        <ReasonDialog
          title={
            winner.bidLineId
              ? t("tenders.choose", "Choose as winner")
              : t("tenders.no_award", "Do not award this item")
          }
          description={t(
            "tenders.winner_hint",
            "Equal prices and choices other than the recommendation need the committee's written reason."
          )}
          confirmLabel={t("actions.save", "Save")}
          onClose={() => setWinner(null)}
          onConfirm={(reason) =>
            act(() =>
              chooseWinner(d.uniqueId, winner.lineNo, winner.bidLineId, reason)
            )
          }
        />
      )}
      {neg && (
        <FormDialog
          title={`${t("tenders.negotiate", "Record negotiation")} — ${neg.o.vendorName}`}
          confirmLabel={t("actions.save", "Save")}
          onClose={() => setNeg(null)}
          onConfirm={() =>
            act(() =>
              negotiate(
                d.uniqueId,
                neg.o.bidLineId,
                neg.price ? Number(neg.price) : null,
                neg.days ? Number(neg.days) : null,
                neg.note
              )
            )
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="ng-p">
                {t("tenders.unit_price", "Unit price incl. VAT")}
              </FieldLabel>
              <Input
                id="ng-p"
                type="number"
                value={neg.price}
                onChange={(e) => setNeg({ ...neg, price: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="ng-d">
                {t("tenders.delivery_days", "Delivery (days)")}
              </FieldLabel>
              <Input
                id="ng-d"
                type="number"
                value={neg.days}
                onChange={(e) => setNeg({ ...neg, days: e.target.value })}
              />
            </Field>
          </div>
          <Textarea
            rows={2}
            placeholder={t("common.note", "Note")}
            value={neg.note}
            onChange={(e) => setNeg({ ...neg, note: e.target.value })}
          />
        </FormDialog>
      )}
    </div>
  )
}

export default TenderDetailsPage
