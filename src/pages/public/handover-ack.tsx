import { useEffect, useState } from "react"
import { useParams } from "react-router"
import { useTranslation } from "react-i18next"
import { CheckCircle2Icon, MessageSquareWarningIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { ToneBadge } from "@/components/app/tone-badge"
import { errorMessage } from "@/services/api"
import { formatDay } from "@/lib/format"
import { APP_NAME } from "@/lib/exports"
import {
  fetchPublicHandover,
  respondPublicHandover,
  type PublicHandover,
} from "@/services/custody"

/** Email-link acknowledgement for custodians without a user account (no login). */
const HandoverAckPage = () => {
  const { t } = useTranslation()
  const { uniqueId: token = "" } = useParams()
  const [h, setH] = useState<PublicHandover | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [disputing, setDisputing] = useState(false)
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    fetchPublicHandover(token)
      .then(setH)
      .catch((e) => setError(errorMessage(e, t("general_error"))))
  }, [token, t])

  async function respond(accept: boolean) {
    setBusy(true)
    try {
      await respondPublicHandover(
        token,
        accept,
        accept ? undefined : note.trim()
      )
      setDone(
        accept
          ? t("ack.thanks", "Thank you — the handover is acknowledged.")
          : t(
              "ack.reported",
              "Thank you — the store will contact you about the difference."
            )
      )
    } catch (e) {
      setError(errorMessage(e, t("general_error")))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-svh items-start justify-center bg-muted p-4 sm:p-10">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>{APP_NAME}</CardTitle>
          <CardDescription>
            {t("ack.subtitle", "Handover acknowledgement")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!h && !error && <Spinner />}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {done && (
            <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle2Icon className="size-4" />
              {done}
            </p>
          )}
          {h && !done && (
            <>
              <p className="text-sm">
                {t(
                  "ack.intro",
                  "Hello {{name}}, the store handed over these items to you ({{n}}). Please check them.",
                  { name: h.custodian, n: h.number }
                )}
              </p>
              <ul className="space-y-2">
                {h.items.map((i) => (
                  <li key={i.tag} className="rounded-md border p-2 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono">{i.tag}</span>
                      {i.product}
                      <ToneBadge code={i.condition} />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {[i.serialNumber, i.accessories.join(", ")]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                {h.purpose}
                {h.expectedReturnDate &&
                  ` · ${t("custody.return_by", "Return by")} ${formatDay(h.expectedReturnDate)}`}
              </p>
              {h.terms && (
                <p className="rounded-md bg-muted p-3 text-xs whitespace-pre-line">
                  {h.terms}
                </p>
              )}
              {disputing ? (
                <div className="space-y-2">
                  <Textarea
                    rows={3}
                    placeholder={t("ack.difference", "What is different?")}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setDisputing(false)}
                    >
                      {t("actions.cancel", "Cancel")}
                    </Button>
                    <Button
                      disabled={busy || note.trim().length < 3}
                      onClick={() => respond(false)}
                    >
                      {t("my_items.dispute_send", "Send")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button disabled={busy} onClick={() => respond(true)}>
                    <CheckCircle2Icon />
                    {t(
                      "my_items.ack",
                      "I received these items and accept the terms"
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setDisputing(true)}>
                    <MessageSquareWarningIcon />
                    {t("my_items.dispute", "Report a difference")}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default HandoverAckPage
