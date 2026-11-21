import { useEffect, useState } from "react"
import { Link, useLoaderData, useRevalidator } from "react-router"
import { useTranslation } from "react-i18next"
import QRCode from "qrcode"
import {
  CheckCircle2Icon,
  KeyRoundIcon,
  MailIcon,
  MessageSquareWarningIcon,
  PrinterIcon,
  XCircleIcon,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { useCodeLabel } from "@/components/app/use-code-label"
import { ReasonDialog } from "@/components/app/reason-dialog"
import { useRun } from "@/components/app/use-run"
import { formatDay, formatStamp, resolveImageUrl } from "@/lib/format"
import { ROUTES, withId } from "@/routes/routeConstants"
import {
  acknowledgeHandover,
  acknowledgeWithCode,
  cancelHandover,
  disputeHandover,
  resolveDispute,
  sendHandoverCode,
  sendHandoverLink,
  type Handover,
} from "@/services/custody"

/** Handover document and printable Handover Certificate (B3 §4.5). */
const HandoverDetailsPage = () => {
  const { t } = useTranslation()
  const label = useCodeLabel()
  const run = useRun()
  const { revalidate } = useRevalidator()
  const { handover: h } = useLoaderData() as { handover: Handover }
  const [dialog, setDialog] = useState<
    null | "dispute" | "cancel" | "code" | "resend" | "resolveCancel"
  >(null)
  const [code, setCode] = useState("")
  const [devCode, setDevCode] = useState<string | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  useEffect(
    () =>
      void QRCode.toDataURL(h.number, { margin: 1, width: 110 }).then(setQr),
    [h.number]
  )
  const done = () => {
    setDialog(null)
    revalidate()
  }
  const info: [string, string | null][] = [
    [
      t("custody.custodian", "Custodian"),
      `${h.custodian.fullName} (${h.custodian.employeeNumber}) · ${h.department?.name ?? ""}`,
    ],
    [t("custody.source", "Request"), `${label(h.source)} ${h.sourceRef ?? ""}`],
    [t("stores.store", "Store"), h.store.name],
    [t("custody.purpose", "Purpose"), h.purpose],
    [
      t("custody.return_by", "Return by"),
      h.expectedReturnDate
        ? formatDay(h.expectedReturnDate)
        : t("custody.open_ended", "Open-ended"),
    ],
    [
      t("custody.prepared", "Prepared"),
      `${h.preparedBy ?? "—"} · ${formatStamp(h.createdAt)}`,
    ],
    [
      t("custody.acknowledged", "Acknowledged"),
      h.acknowledgedAt
        ? `${formatStamp(h.acknowledgedAt)} · ${label(h.ackMethod ?? "")}${h.ackBy ? ` · ${h.ackBy}` : ""}`
        : null,
    ],
    [t("custody.dispute", "Difference reported"), h.disputeNote],
    [t("custody.cancelled", "Cancelled"), h.cancelReason],
  ]
  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          title={
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-mono">{h.number}</span>
              <ToneBadge code={h.status} />
            </span>
          }
          description={`${h.custodian.fullName} · ${h.lines.length} ${t("custody.items_n", "items")}`}
          actions={
            <>
              <Button variant="outline" onClick={() => window.print()}>
                <PrinterIcon />
                {t("custody.certificate", "Handover certificate")}
              </Button>
              {h.can.cancel && (
                <Button variant="outline" onClick={() => setDialog("cancel")}>
                  <XCircleIcon />
                  {t("actions.cancel", "Cancel")}
                </Button>
              )}
              {h.can.sendLink && (
                <Button
                  variant="outline"
                  onClick={() =>
                    run(
                      async () => {
                        const r = await sendHandoverLink(h.uniqueId)
                        if (r.devLink) {
                          toast.info(
                            t(
                              "custody.dev_link",
                              "Development: no mail server, link shown here"
                            ),
                            { description: r.devLink, duration: 30000 }
                          )
                          console.info("Handover link:", r.devLink)
                        }
                      },
                      t("custody.link_sent", "Link emailed to {{email}}", {
                        email: h.custodian.companyEmail,
                      })
                    )
                  }
                >
                  <MailIcon />
                  {t("custody.send_link", "Email acknowledgement link")}
                </Button>
              )}
              {h.can.counterCode && (
                <Button
                  variant="outline"
                  onClick={() =>
                    run(
                      async () => {
                        const r = await sendHandoverCode(h.uniqueId)
                        setDevCode(r.devCode)
                        setDialog("code")
                      },
                      t("custody.code_sent", "Code emailed to the custodian")
                    )
                  }
                >
                  <KeyRoundIcon />
                  {t("custody.counter_code", "Counter code")}
                </Button>
              )}
              {h.can.resolveDispute && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setDialog("resolveCancel")}
                  >
                    {t("custody.dispute_cancel", "Cancel handover")}
                  </Button>
                  <Button onClick={() => setDialog("resend")}>
                    {t("custody.dispute_resend", "Corrected — ask again")}
                  </Button>
                </>
              )}
              {h.can.dispute && (
                <Button variant="outline" onClick={() => setDialog("dispute")}>
                  <MessageSquareWarningIcon />
                  {t("my_items.dispute", "Report a difference")}
                </Button>
              )}
              {h.can.acknowledge && (
                <Button
                  onClick={() =>
                    run(
                      async () => {
                        await acknowledgeHandover(h.uniqueId)
                        revalidate()
                      },
                      t("my_items.acknowledged", "Acknowledged")
                    )
                  }
                >
                  <CheckCircle2Icon />
                  {t(
                    "my_items.ack",
                    "I received these items and accept the terms"
                  )}
                </Button>
              )}
            </>
          }
        />
      </div>
      <div className="hidden items-center justify-between print:flex">
        <div>
          <div className="text-xs uppercase">
            AzamTV — {t("custody.certificate", "Handover certificate")}
          </div>
          <div className="font-mono text-2xl font-bold">{h.number}</div>
        </div>
        {qr && <img src={qr} alt="" className="size-24" />}
      </div>
      {h.status === "AWAITING_ACKNOWLEDGEMENT" && (
        <Alert className="print:hidden">
          <AlertTitle>
            {t(
              "custody.awaiting",
              "Waiting for the custodian's acknowledgement"
            )}
          </AlertTitle>
          <AlertDescription>
            {h.custodianHasUser
              ? t(
                  "custody.awaiting_user",
                  "The custodian confirms in My items. You can also use a counter code when they collect in person."
                )
              : t(
                  "custody.awaiting_email",
                  "The custodian has no user account: send the email link (72 h) or use a counter code (15 min) at the counter."
                )}
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {info
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
          </dl>
          {h.internalRequestUniqueId && (
            <Link
              className="mt-3 inline-block text-sm underline print:hidden"
              to={withId(
                ROUTES.INTERNAL_REQUEST_DETAILS,
                h.internalRequestUniqueId
              )}
            >
              {t("custody.open_request", "Open the request")}
            </Link>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("custody.items", "Items")}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("assets.tag", "Tag")}</TableHead>
                <TableHead>{t("products.product", "Product")}</TableHead>
                <TableHead>{t("assets.condition", "Condition")}</TableHead>
                <TableHead>
                  {t("custody.accessories_short", "Accessories / components")}
                </TableHead>
                <TableHead>{t("custody.returned", "Returned")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {h.lines.map((l) => (
                <TableRow key={l.assetUniqueId}>
                  <TableCell className="font-mono text-sm">
                    <Link
                      className="hover:underline"
                      to={withId(ROUTES.ASSET_DETAILS, l.assetUniqueId)}
                    >
                      {l.tag}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {l.productName}
                    <div className="text-xs text-muted-foreground">
                      {l.serialNumber}
                    </div>
                    <div className="flex flex-wrap gap-2 print:hidden">
                      {l.photos.map((p) => (
                        <a
                          key={p.uniqueId}
                          className="text-xs underline"
                          href={resolveImageUrl(p.uri)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {p.filename}
                        </a>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <ToneBadge code={l.condition} />
                  </TableCell>
                  <TableCell className="text-sm">
                    {[...l.accessories, ...l.components].join(", ") || "—"}
                  </TableCell>
                  <TableCell>
                    {l.returnedAt ? formatDay(l.returnedAt) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {h.termsText && (
        <Card>
          <CardHeader>
            <CardTitle>{t("custody.terms", "Terms of use")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-line">
            {h.termsText}
          </CardContent>
        </Card>
      )}
      <div className="hidden grid-cols-2 gap-8 pt-12 text-sm print:grid">
        <div className="border-t pt-2">
          {t("custody.sign_store", "Storekeeper (name, signature, date)")}
        </div>
        <div className="border-t pt-2">
          {t("custody.sign_custodian", "Custodian (name, signature, date)")}
        </div>
      </div>

      {dialog === "code" && (
        <Dialog open onOpenChange={(o) => !o && setDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {t("custody.counter_code", "Counter code")}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "custody.code_hint",
                  "The code was emailed to {{email}}. Enter the code the custodian reads out (valid 15 minutes).",
                  { email: h.custodian.companyEmail }
                )}
              </DialogDescription>
            </DialogHeader>
            {devCode && (
              <p className="rounded-md bg-amber-500/10 p-2 text-xs">
                {t(
                  "custody.dev_code",
                  "Development (no mail server): the code is"
                )}{" "}
                <span className="font-mono font-bold">{devCode}</span>
              </p>
            )}
            <Input
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialog(null)}>
                {t("actions.cancel", "Cancel")}
              </Button>
              <Button
                disabled={code.length !== 6}
                onClick={async () => {
                  const ok = await run(
                    () => acknowledgeWithCode(h.uniqueId, code),
                    t("my_items.acknowledged", "Acknowledged")
                  )
                  if (ok) done()
                }}
              >
                {t("custody.confirm_code", "Confirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {dialog === "dispute" && (
        <ReasonDialog
          title={t("my_items.dispute", "Report a difference")}
          confirmLabel={t("my_items.dispute_send", "Send")}
          onClose={() => setDialog(null)}
          onConfirm={async (note) => {
            const ok = await run(() => disputeHandover(h.uniqueId, note))
            if (ok) revalidate()
            return ok
          }}
        />
      )}
      {(dialog === "cancel" || dialog === "resolveCancel") && (
        <ReasonDialog
          title={t("custody.cancel_title", "Cancel this handover?")}
          description={t(
            "custody.cancel_hint",
            "The items go back into the store."
          )}
          confirmLabel={t("custody.cancel_confirm", "Cancel handover")}
          destructive
          onClose={() => setDialog(null)}
          onConfirm={async (reason) => {
            const ok = await run(() =>
              dialog === "cancel"
                ? cancelHandover(h.uniqueId, reason)
                : resolveDispute(h.uniqueId, "CANCEL", reason)
            )
            if (ok) revalidate()
            return ok
          }}
        />
      )}
      {dialog === "resend" && (
        <ReasonDialog
          title={t("custody.dispute_resend", "Corrected — ask again")}
          description={t(
            "custody.resend_hint",
            "Say what was corrected; the custodian is asked to acknowledge again."
          )}
          confirmLabel={t("custody.ask_again", "Ask again")}
          onClose={() => setDialog(null)}
          onConfirm={async (note) => {
            const ok = await run(() =>
              resolveDispute(h.uniqueId, "RESEND", note)
            )
            if (ok) revalidate()
            return ok
          }}
        />
      )}
    </div>
  )
}

export default HandoverDetailsPage
