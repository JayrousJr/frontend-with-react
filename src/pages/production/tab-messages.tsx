import { useState } from "react"
import { useTranslation } from "react-i18next"
import { SendIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useRun } from "@/components/app/use-run"
import { useAuth } from "@/context/auth-context"
import { formatStamp } from "@/lib/format"
import { P, hasPermission } from "@/lib/permissions"
import {
  fetchAnnouncements,
  sendAnnouncement,
  type Production,
} from "@/services/production"
import { Loading, Section } from "./ui"
import { useLoad } from "./utils"

/** Production-specific messages to the producer, HODs and crew. */
export function MessagesTab({ p }: { p: Production }) {
  const { t } = useTranslation()
  const run = useRun()
  const { user } = useAuth()
  const rows = useLoad(() => fetchAnnouncements(p.uniqueId), [p.uniqueId])
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const canSend =
    hasPermission(user, P.ANNOUNCEMENT_SEND) && p.status !== "CLOSED"
  return (
    <div className="space-y-6">
      {canSend && (
        <Section
          title={t("messages.send", "Message the production team")}
          description={t(
            "messages.hint",
            "Goes to the producer, the HODs of the participating departments and the crew (in the system, or by company email for crew without a login)."
          )}
        >
          <div className="space-y-2">
            <Input
              placeholder={t("messages.title", "Subject")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              rows={3}
              placeholder={t("messages.body", "Message")}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <Button
              size="sm"
              disabled={!title.trim() || !body.trim()}
              onClick={() =>
                run(
                  async () => {
                    const a = await sendAnnouncement({
                      title,
                      body,
                      audience: "PRODUCTION",
                      productionUniqueId: p.uniqueId,
                    })
                    setTitle("")
                    setBody("")
                    rows.reload()
                    return a
                  },
                  t("messages.sent", "Message sent")
                )
              }
            >
              <SendIcon />
              {t("messages.send_btn", "Send")}
            </Button>
          </div>
        </Section>
      )}
      <Section title={t("messages.history", "Messages")}>
        {!rows.data ? (
          <Loading error={rows.error} />
        ) : rows.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("messages.none", "No messages yet.")}
          </p>
        ) : (
          <ul className="space-y-3">
            {rows.data.map((a) => (
              <li key={a.uniqueId} className="rounded-md border p-3 text-sm">
                <div className="font-medium">{a.title}</div>
                <p className="whitespace-pre-wrap">{a.body}</p>
                <div className="text-xs text-muted-foreground">
                  {a.sentBy} · {formatStamp(a.createdAt)} · {a.recipients}{" "}
                  {t("messages.recipients", "recipient(s)")}
                  {a.emailed > 0 &&
                    `, ${a.emailed} ${t("messages.by_email", "by email")}`}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}
