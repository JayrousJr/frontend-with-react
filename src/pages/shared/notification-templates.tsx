import { useState } from "react"
import { useTranslation } from "react-i18next"
import { PencilIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldLabel } from "@/components/ui/field"
import { PageHeader } from "@/components/app/page-header"
import { ToneBadge } from "@/components/app/tone-badge"
import { useRun } from "@/components/app/use-run"
import {
  fetchTemplates,
  saveTemplate,
  type TemplateRow,
} from "@/services/comms"
import { FormDialog, Loading, Section, SimpleTable } from "../production/ui"
import { useLoad } from "../production/utils"

/** Module 09: administrators override the email text of any notification. */
const NotificationTemplatesPage = () => {
  const { t } = useTranslation()
  const run = useRun()
  const rows = useLoad(fetchTemplates)
  const [q, setQ] = useState("")
  const [edit, setEdit] = useState<{
    row: TemplateRow
    subject: string
    body: string
    isActive: boolean
  } | null>(null)
  const list = (rows.data ?? []).filter(
    (r) =>
      !q ||
      `${r.code} ${r.defaultSubject} ${r.defaultBody}`
        .toLowerCase()
        .includes(q.toLowerCase())
  )
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("templates.title", "Notification texts")}
        description={t(
          "templates.subtitle",
          "Override the email subject and text of a notification. Placeholders like {{number}} are filled in. Inactive overrides use the standard text."
        )}
      />
      <Input
        className="w-72"
        placeholder={t("common.search", "Search")}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <Section title={t("templates.list", "Notifications")}>
        {!rows.data ? (
          <Loading error={rows.error} />
        ) : (
          <SimpleTable
            head={[
              t("templates.category", "Category"),
              t("templates.code", "Notification"),
              t("templates.text", "Text used"),
              "",
            ]}
            rows={list.map((r) => [
              t(`prefs.cat_${r.category}`, r.category),
              <span className="font-mono text-xs">{r.code}</span>,
              <span>
                <span className="font-medium">
                  {r.isActive ? r.subject : r.defaultSubject}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {r.isActive ? r.body : r.defaultBody}
                </span>
                {r.isActive && <ToneBadge code="ACTIVE" className="mt-1" />}
              </span>,
              <Button
                size="icon"
                variant="ghost"
                onClick={() =>
                  setEdit({
                    row: r,
                    subject: r.subject ?? r.defaultSubject,
                    body: r.body ?? r.defaultBody,
                    isActive: r.subject ? r.isActive : true,
                  })
                }
              >
                <PencilIcon />
              </Button>,
            ])}
          />
        )}
      </Section>
      {edit && (
        <FormDialog
          wide
          title={edit.row.code}
          description={`${t("templates.default", "Standard")}: ${edit.row.defaultSubject} — ${edit.row.defaultBody}`}
          confirmLabel={t("actions.save", "Save")}
          canConfirm={!!edit.subject.trim() && !!edit.body.trim()}
          onClose={() => setEdit(null)}
          onConfirm={() =>
            run(
              async () =>
                rows.set(
                  await saveTemplate(edit.row.code, {
                    subject: edit.subject,
                    body: edit.body,
                    isActive: edit.isActive,
                  })
                ),
              t("common.saved", "Saved")
            )
          }
        >
          <Field>
            <FieldLabel>{t("templates.subject", "Subject")}</FieldLabel>
            <Input
              value={edit.subject}
              onChange={(e) => setEdit({ ...edit, subject: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel>{t("templates.body", "Text")}</FieldLabel>
            <Textarea
              rows={4}
              value={edit.body}
              onChange={(e) => setEdit({ ...edit, body: e.target.value })}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={edit.isActive}
              onCheckedChange={(v) =>
                setEdit({ ...edit, isActive: v === true })
              }
            />
            {t("templates.use", "Use this text instead of the standard one")}
          </label>
        </FormDialog>
      )}
    </div>
  )
}

export default NotificationTemplatesPage
