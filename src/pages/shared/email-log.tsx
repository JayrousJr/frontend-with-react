import { useState } from "react"
import { useTranslation } from "react-i18next"
import { RotateCwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { PageHeader } from "@/components/app/page-header"
import { ToneBadge } from "@/components/app/tone-badge"
import { useRun } from "@/components/app/use-run"
import { formatStamp } from "@/lib/format"
import { fetchEmailLog, retryEmail, retryFailedEmails } from "@/services/comms"
import { Loading, Section, SimpleTable, Stat } from "../production/ui"
import { useLoad } from "../production/utils"

/** Module 09: delivery log of every email, with retry of failures. */
const EmailLogPage = () => {
  const { t } = useTranslation()
  const run = useRun()
  const [status, setStatus] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const log = useLoad(
    () => fetchEmailLog({ status, search, page }),
    [status, search, page]
  )
  const c = log.data?.counts ?? {}
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("email_log.title", "Email delivery")}
        description={t(
          "email_log.subtitle",
          "Every email the system sends. Failed emails are retried 3 times automatically; send them again here. 'Skipped' means no mail server is configured."
        )}
        actions={
          (c.FAILED ?? 0) > 0 && (
            <Button
              onClick={() =>
                run(
                  async () => {
                    const r = await retryFailedEmails()
                    log.reload()
                    return r
                  },
                  t("email_log.retried_all", "Failed emails queued again")
                )
              }
            >
              <RotateCwIcon />
              {t("email_log.retry_all", "Retry all failed")}
            </Button>
          )
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t("codes.SENT", "Sent")} value={c.SENT ?? 0} tone="good" />
        <Stat label={t("codes.QUEUED", "Queued")} value={c.QUEUED ?? 0} />
        <Stat
          label={t("codes.FAILED", "Failed")}
          value={c.FAILED ?? 0}
          tone={c.FAILED ? "bad" : undefined}
        />
        <Stat
          label={t("codes.SKIPPED", "Skipped")}
          value={c.SKIPPED ?? 0}
          tone={c.SKIPPED ? "warn" : undefined}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Input
          className="w-64"
          placeholder={t("email_log.search", "Recipient or subject")}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
        <NativeSelect
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
        >
          <NativeSelectOption value="">
            {t("common.all_statuses", "All statuses")}
          </NativeSelectOption>
          {["SENT", "QUEUED", "FAILED", "SKIPPED"].map((s) => (
            <NativeSelectOption key={s} value={s}>
              {t(`codes.${s}`, s)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <Section
        title={t("email_log.list", "Emails")}
        description={
          log.data
            ? `${log.data.total} ${t("email_log.total", "in total")}`
            : undefined
        }
      >
        {!log.data ? (
          <Loading error={log.error} />
        ) : (
          <>
            <SimpleTable
              head={[
                t("common.date", "Date"),
                t("email_log.to", "To"),
                t("email_log.subject", "Subject"),
                t("email_log.category", "Category"),
                t("common.status", "Status"),
                t("email_log.attempts", "Attempts"),
                "",
              ]}
              rows={log.data.rows.map((r) => [
                formatStamp(r.createdAt),
                r.to,
                <span>
                  {r.subject}
                  {r.error && (
                    <span className="block text-xs text-destructive">
                      {r.error}
                    </span>
                  )}
                </span>,
                r.category ?? r.kind,
                <ToneBadge
                  code={
                    r.status === "SKIPPED"
                      ? "PENDING"
                      : r.status === "SENT"
                        ? "COMPLETED"
                        : r.status === "FAILED"
                          ? "REJECTED"
                          : "SUBMITTED"
                  }
                />,
                r.attempts,
                r.canRetry && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      run(
                        async () => {
                          await retryEmail(r.uniqueId)
                          log.reload()
                        },
                        t("email_log.queued", "Queued again")
                      )
                    }
                  >
                    <RotateCwIcon />
                    {t("email_log.retry", "Retry")}
                  </Button>
                ),
              ])}
              empty={t("email_log.none", "No emails.")}
            />
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                ←
              </Button>
              <span>{page}</span>
              <Button
                size="sm"
                variant="outline"
                disabled={page * 50 >= log.data.total}
                onClick={() => setPage(page + 1)}
              >
                →
              </Button>
            </div>
          </>
        )}
      </Section>
    </div>
  )
}

export default EmailLogPage
