import { useState } from "react"
import { useParams } from "react-router"
import { useTranslation } from "react-i18next"
import { SaveIcon, SendIcon, UndoIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldLabel } from "@/components/ui/field"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { ToneBadge } from "@/components/app/tone-badge"
import { useRun } from "@/components/app/use-run"
import { formatStamp } from "@/lib/format"
import type { FileRef } from "@/services/procurement"
import {
  portalAsk,
  portalOpenFile,
  portalSaveBid,
  portalTender,
  portalUpload,
  portalWithdraw,
  type Compliance,
  type PortalTender,
} from "@/services/portal"
import { Info, Loading } from "../procurement/shared"
import { tzs, useLoad } from "../procurement/shared-utils"

type Draft = {
  on: boolean
  price: string
  days: string
  brand: string
  model: string
  country: string
  compliance: Record<number, { complies: boolean; offered: string }>
  files: FileRef[]
}

function FileLinks({ files }: { files: FileRef[] }) {
  return (
    <span className="flex flex-wrap gap-2">
      {files.map((f) => (
        <button
          key={f.uniqueId}
          type="button"
          className="text-xs underline"
          onClick={() => void portalOpenFile(f)}
        >
          {f.filename}
        </button>
      ))}
    </span>
  )
}

const draftOf = (d: PortalTender) =>
  Object.fromEntries(
    d.lines.map((l) => {
      const o = l.myOffer
      return [
        l.lineNo,
        {
          on: !!o,
          price: o ? String(o.unitPrice) : "",
          days: o ? String(o.deliveryDays) : "",
          brand: o?.brand ?? "",
          model: o?.model ?? "",
          country: o?.countryOfOrigin ?? "",
          compliance: Object.fromEntries(
            l.specs.map((s) => {
              const c = o?.compliance.find((x) => x.specId === s.id)
              return [
                s.id,
                { complies: c?.complies ?? true, offered: c?.offered ?? "" },
              ]
            })
          ),
          files: o?.files ?? [],
        } satisfies Draft,
      ]
    })
  ) as Record<number, Draft>

const PortalTenderPage = () => {
  const { t } = useTranslation()
  const run = useRun()
  const { uniqueId = "" } = useParams()
  const x = useLoad(() => portalTender(uniqueId), [uniqueId])
  const [edited, setDraft] = useState<Record<number, Draft> | null>(null)
  const [editedValidity, setValidity] = useState<string | null>(null)
  const [question, setQuestion] = useState("")
  if (!x.data) return <Loading error={x.error} />
  const d = x.data
  // The form starts from the saved bid and resets when the server answers.
  const draft = edited ?? draftOf(d)
  const validity =
    editedValidity ?? String(d.myBid?.validityDays ?? d.bidValidityDays)
  const set = (n: number, patch: Partial<Draft>) =>
    setDraft({ ...draft, [n]: { ...draft[n], ...patch } })
  const fresh = (next: PortalTender) => {
    x.set(next)
    setDraft(null)
    setValidity(null)
  }
  const save = (submit: boolean) =>
    run(
      async () =>
        fresh(
          await portalSaveBid(
            d.uniqueId,
            {
              validityDays: Number(validity) || 0,
              lines: d.lines
                .filter((l) => draft[l.lineNo]?.on)
                .map((l) => {
                  const g = draft[l.lineNo]
                  return {
                    lineNo: l.lineNo,
                    unitPrice: Number(g.price) || 0,
                    deliveryDays: Number(g.days) || 0,
                    brand: g.brand,
                    model: g.model,
                    countryOfOrigin: g.country,
                    compliance: l.specs.map((s): Compliance => ({
                      specId: s.id,
                      complies: g.compliance[s.id]?.complies ?? false,
                      offered: g.compliance[s.id]?.offered,
                    })),
                    fileUniqueIds: g.files.map((f) => f.uniqueId),
                  }
                }),
            },
            submit
          )
        ),
      submit
        ? t("portal.submitted", "Bid submitted (sealed until the opening)")
        : t("portal.saved", "Draft saved")
    )
  const editable = d.canBid
  const chosen = d.lines.filter((l) => draft[l.lineNo]?.on)
  const total = chosen.reduce(
    (n, l) => n + (Number(draft[l.lineNo].price) || 0) * l.quantity,
    0
  )
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold">
          <span className="font-mono">{d.number}</span> · {d.title}
        </h1>
        <ToneBadge code={d.status} />
        {d.myBid && <ToneBadge code={d.myBid.status} />}
      </div>
      <Card>
        <CardContent>
          <Info
            items={[
              [
                t("tenders.closing_at", "Closing"),
                `${formatStamp(d.closingAt)} (EAT, server time)`,
              ],
              [
                t("portal.server_time", "Server time now"),
                formatStamp(d.serverTime),
              ],
              [
                t("tenders.validity", "Bid validity (days)"),
                `${t("portal.at_least", "at least")} ${d.bidValidityDays}`,
              ],
              [
                t("portal.questions_until", "Questions until"),
                d.clarifyUntil && formatStamp(d.clarifyUntil),
              ],
              [t("tenders.description", "Description"), d.description],
              [
                t("tenders.delivery_terms", "Delivery requirements"),
                d.deliveryTerms,
              ],
              [t("tenders.terms", "Terms"), d.terms],
              [
                t("portal.submitted_at", "Submitted"),
                d.myBid?.submittedAt && formatStamp(d.myBid.submittedAt),
              ],
            ]}
          />
        </CardContent>
      </Card>
      {d.addenda.map((a) => (
        <Alert key={a.number}>
          <AlertDescription>
            <strong>
              {t("tenders.addendum", "Addendum")} {a.number}:
            </strong>{" "}
            {a.text}
            {a.newClosingAt &&
              ` — ${t("tenders.new_closing", "New closing")}: ${formatStamp(a.newClosingAt)}`}{" "}
            {a.file && <FileLinks files={[a.file]} />}
          </AlertDescription>
        </Alert>
      ))}
      {d.lines.map((l) => {
        const g = draft[l.lineNo]
        if (!g) return null
        return (
          <Card key={l.lineNo}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                {editable && (
                  <Checkbox
                    checked={g.on}
                    onCheckedChange={(v) => set(l.lineNo, { on: v === true })}
                    aria-label={t("portal.bid_on", "Bid on this item")}
                  />
                )}
                {l.lineNo}. {l.productName}
                <span className="font-normal text-muted-foreground">
                  {l.quantity} {l.unit} · {l.categoryName} · VAT {l.vatRate}%
                </span>
                {l.outcome && <ToneBadge code={l.outcome} />}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{l.description}</p>
            </CardHeader>
            {(g.on || l.myOffer) && (
              <CardContent className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-5">
                  <Field>
                    <FieldLabel>
                      {t("portal.unit_price", "Unit price incl. VAT (TZS)")}
                    </FieldLabel>
                    <Input
                      type="number"
                      min={0}
                      disabled={!editable}
                      value={g.price}
                      onChange={(e) => set(l.lineNo, { price: e.target.value })}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>
                      {t("tenders.delivery_days", "Delivery (days)")}
                    </FieldLabel>
                    <Input
                      type="number"
                      min={1}
                      disabled={!editable}
                      value={g.days}
                      onChange={(e) => set(l.lineNo, { days: e.target.value })}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>{t("portal.brand", "Brand")}</FieldLabel>
                    <Input
                      disabled={!editable}
                      value={g.brand}
                      onChange={(e) => set(l.lineNo, { brand: e.target.value })}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>{t("portal.model", "Model")}</FieldLabel>
                    <Input
                      disabled={!editable}
                      value={g.model}
                      onChange={(e) => set(l.lineNo, { model: e.target.value })}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>
                      {t("portal.country", "Country of origin")}
                    </FieldLabel>
                    <Input
                      disabled={!editable}
                      value={g.country}
                      onChange={(e) =>
                        set(l.lineNo, { country: e.target.value })
                      }
                    />
                  </Field>
                </div>
                {Number(g.price) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t(
                      "portal.calc",
                      "Excl. VAT {{e}} + VAT {{v}} per unit · line total {{t}} for the full quantity",
                      {
                        e: tzs(
                          Math.round(
                            (Number(g.price) / (1 + l.vatRate / 100)) * 100
                          ) / 100
                        ),
                        v: tzs(
                          Math.round(
                            (Number(g.price) -
                              Number(g.price) / (1 + l.vatRate / 100)) *
                              100
                          ) / 100
                        ),
                        t: tzs(Number(g.price) * l.quantity),
                      }
                    )}
                  </p>
                )}
                <div className="space-y-2">
                  <div className="text-sm font-medium">
                    {t(
                      "portal.compliance",
                      "Compliance with each specification"
                    )}
                  </div>
                  {l.specs.map((s) => (
                    <div
                      key={s.id}
                      className="grid gap-2 sm:grid-cols-[1fr_10rem_14rem] sm:items-center"
                    >
                      <span className="text-sm">{s.text}</span>
                      <NativeSelect
                        disabled={!editable}
                        value={g.compliance[s.id]?.complies ? "yes" : "no"}
                        onChange={(e) =>
                          set(l.lineNo, {
                            compliance: {
                              ...g.compliance,
                              [s.id]: {
                                ...g.compliance[s.id],
                                complies: e.target.value === "yes",
                              },
                            },
                          })
                        }
                      >
                        <NativeSelectOption value="yes">
                          {t("portal.complies", "Complies")}
                        </NativeSelectOption>
                        <NativeSelectOption value="no">
                          {t("portal.not_comply", "Does not comply")}
                        </NativeSelectOption>
                      </NativeSelect>
                      <Input
                        placeholder={t("portal.offered", "Offered value")}
                        disabled={!editable}
                        value={g.compliance[s.id]?.offered ?? ""}
                        onChange={(e) =>
                          set(l.lineNo, {
                            compliance: {
                              ...g.compliance,
                              [s.id]: {
                                ...g.compliance[s.id],
                                offered: e.target.value,
                              },
                            },
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium">
                    {t("portal.attachments", "Brochures / certificates")}
                  </div>
                  <FileLinks files={g.files} />
                  {editable && (
                    <input
                      type="file"
                      multiple
                      className="block text-sm"
                      onChange={async (e) => {
                        const list = [...(e.target.files ?? [])]
                        e.target.value = ""
                        const up = await Promise.all(list.map(portalUpload))
                        set(l.lineNo, { files: [...g.files, ...up] })
                      }}
                    />
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}
      {editable && (
        <Card>
          <CardContent className="flex flex-wrap items-end gap-3">
            <Field className="w-40">
              <FieldLabel htmlFor="pt-v">
                {t("tenders.validity", "Bid validity (days)")}
              </FieldLabel>
              <Input
                id="pt-v"
                type="number"
                value={validity}
                onChange={(e) => setValidity(e.target.value)}
              />
            </Field>
            <div className="mr-auto text-sm">
              {chosen.length} {t("tenders.items", "items")} ·{" "}
              {t("portal.bid_total", "bid total")} <strong>{tzs(total)}</strong>{" "}
              {t("portal.vat_incl", "VAT incl.")}
            </div>
            <Button variant="outline" onClick={() => save(false)}>
              <SaveIcon />
              {t("portal.save_draft", "Save draft")}
            </Button>
            {d.myBid?.status === "SUBMITTED" && (
              <Button
                variant="outline"
                onClick={() =>
                  run(
                    async () => fresh(await portalWithdraw(d.uniqueId)),
                    t("portal.withdrawn", "Bid withdrawn")
                  )
                }
              >
                <UndoIcon />
                {t("portal.withdraw", "Withdraw")}
              </Button>
            )}
            <Button disabled={!chosen.length} onClick={() => save(true)}>
              <SendIcon />
              {d.myBid?.status === "SUBMITTED"
                ? t("portal.resubmit", "Resubmit bid")
                : t("portal.submit", "Submit bid")}
            </Button>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>{t("tenders.clarifications", "Clarifications")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {d.clarifications.length === 0 && (
            <p className="text-muted-foreground">
              {t("tenders.no_questions", "No questions.")}
            </p>
          )}
          {d.clarifications.map((c, i) => (
            <div key={i} className="rounded-md border p-2">
              <div>
                <strong>Q:</strong> {c.question}{" "}
                {c.mine && (
                  <span className="text-xs text-muted-foreground">
                    ({t("portal.yours", "yours")})
                  </span>
                )}
              </div>
              <div>
                <strong>A:</strong>{" "}
                {c.answer ?? (
                  <span className="text-muted-foreground">
                    {t("portal.awaiting_answer", "waiting for an answer")}
                  </span>
                )}
              </div>
            </div>
          ))}
          {d.canAsk && (
            <div className="flex gap-2">
              <Textarea
                rows={2}
                value={question}
                placeholder={t(
                  "portal.ask",
                  "Ask a question (the answer goes to every invited vendor, without your name)"
                )}
                onChange={(e) => setQuestion(e.target.value)}
              />
              <Button
                disabled={question.trim().length < 5}
                onClick={() =>
                  run(
                    async () => {
                      x.set(await portalAsk(d.uniqueId, question))
                      setQuestion("")
                    },
                    t("portal.asked", "Question sent")
                  )
                }
              >
                {t("portal.send", "Send")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}

export default PortalTenderPage
