import { useState } from "react"
import { useTranslation } from "react-i18next"
import { SendIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { PageHeader } from "@/components/app/page-header"
import { useRun } from "@/components/app/use-run"
import { useAuth } from "@/context/auth-context"
import { formatStamp } from "@/lib/format"
import { P, hasPermission } from "@/lib/permissions"
import {
  fetchAnnouncements,
  fetchConfig,
  fetchRecipients,
  sendAnnouncement,
  type Announcement,
} from "@/services/production"
import { Loading, Section } from "./ui"
import { useLoad } from "./utils"

/** Module 09: internal announcements (dashboard + email). */
const AnnouncementsPage = () => {
  const { t } = useTranslation()
  const run = useRun()
  const { user } = useAuth()
  const rows = useLoad(() => fetchAnnouncements())
  const cfg = useLoad(fetchConfig)
  const canSend = hasPermission(user, P.ANNOUNCEMENT_SEND)
  const [audience, setAudience] =
    useState<Exclude<Announcement["audience"], "PRODUCTION">>("DEPARTMENTS")
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [depts, setDepts] = useState<number[]>([])
  const [people, setPeople] = useState<{ employeeId: number; name: string }[]>(
    []
  )
  const [q, setQ] = useState("")
  const found = useLoad(
    () =>
      canSend && audience === "USERS" && q.length > 1
        ? fetchRecipients(q)
        : Promise.resolve([]),
    [q, audience]
  )
  const valid =
    title.trim() &&
    body.trim() &&
    (audience === "ALL" ||
      (audience === "DEPARTMENTS" ? depts.length : people.length))
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("announcements.title", "Announcements")}
        description={t(
          "announcements.subtitle",
          "Messages to everyone, departments or selected people — in the system, and by company email for employees without a login."
        )}
      />
      {canSend && (
        <Section title={t("announcements.new", "New announcement")}>
          <div className="space-y-3">
            <NativeSelect
              value={audience}
              onChange={(e) => setAudience(e.target.value as typeof audience)}
            >
              <NativeSelectOption value="DEPARTMENTS">
                {t("announcements.departments", "Departments")}
              </NativeSelectOption>
              <NativeSelectOption value="USERS">
                {t("announcements.people", "Selected people")}
              </NativeSelectOption>
              <NativeSelectOption value="ALL">
                {t("announcements.all", "Everyone")}
              </NativeSelectOption>
            </NativeSelect>
            {audience === "DEPARTMENTS" && (
              <div className="grid gap-2 sm:grid-cols-3">
                {cfg.data?.departments.map((d) => (
                  <label key={d.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={depts.includes(d.id)}
                      onCheckedChange={(c) =>
                        setDepts(
                          c === true
                            ? [...depts, d.id]
                            : depts.filter((x) => x !== d.id)
                        )
                      }
                    />
                    {d.name}
                  </label>
                ))}
              </div>
            )}
            {audience === "USERS" && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {people.map((p) => (
                    <Button
                      key={p.employeeId}
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setPeople(
                          people.filter((x) => x.employeeId !== p.employeeId)
                        )
                      }
                    >
                      {p.name}
                      <XIcon />
                    </Button>
                  ))}
                </div>
                <Input
                  placeholder={t("announcements.find", "Find people")}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  {found.data
                    ?.filter(
                      (f) => !people.some((p) => p.employeeId === f.employeeId)
                    )
                    .map((f) => (
                      <Button
                        key={f.employeeId}
                        size="sm"
                        variant="outline"
                        onClick={() => setPeople([...people, f])}
                      >
                        {f.name} · {f.department}
                      </Button>
                    ))}
                </div>
              </div>
            )}
            <Input
              placeholder={t("messages.title", "Subject")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              rows={4}
              placeholder={t("messages.body", "Message")}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <Button
              disabled={!valid}
              onClick={() =>
                run(
                  async () => {
                    const a = await sendAnnouncement({
                      title,
                      body,
                      audience,
                      departmentIds:
                        audience === "DEPARTMENTS" ? depts : undefined,
                      employeeIds:
                        audience === "USERS"
                          ? people.map((p) => p.employeeId)
                          : undefined,
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
      <Section title={t("announcements.received", "Announcements")}>
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
                  {a.sentBy} · {formatStamp(a.createdAt)} ·{" "}
                  {t(`codes.${a.audience}`, a.audience)}
                  {a.production && ` · ${a.production}`}
                  {a.mine &&
                    ` · ${a.recipients} ${t("messages.recipients", "recipient(s)")}, ${a.emailed} ${t("messages.by_email", "by email")}`}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}

export default AnnouncementsPage
