import { Fragment, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader } from "@/components/app/page-header"
import { useAuth } from "@/context/auth-context"
import { P, hasPermission } from "@/lib/permissions"
import { formatStamp } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  fetchAuditLog,
  type AuditEntry,
  type AuditFilter,
} from "@/services/admin"
import { fetchLoginEvents, type LoginEvent } from "@/services/users"
import type { Page } from "@/services/types"

const AuditLogPage = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const canLogins = hasPermission(user, P.SECURITY_VIEW_LOGINS)
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("audit.title", "Audit log")}
        description={t(
          "audit.subtitle",
          "Append-only and kept forever: who did what, when, from where, with before and after values."
        )}
      />
      <Tabs defaultValue="audit">
        {canLogins && (
          <TabsList variant="line">
            <TabsTrigger value="audit">
              {t("audit.changes", "Changes")}
            </TabsTrigger>
            <TabsTrigger value="logins">
              {t("audit.logins", "Login history")}
            </TabsTrigger>
          </TabsList>
        )}
        <TabsContent value="audit">
          <AuditTab />
        </TabsContent>
        {canLogins && (
          <TabsContent value="logins">
            <LoginsTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

function AuditTab() {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<AuditFilter>({})
  const [draft, setDraft] = useState({
    action: "",
    entityType: "",
    from: "",
    to: "",
  })
  const [pageNo, setPageNo] = useState(1)
  const [page, setPage] = useState<Page<AuditEntry> | null>(null)
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    void fetchAuditLog(filter, { page: pageNo, limit: 25 }).then(setPage)
  }, [filter, pageNo])

  return (
    <Card>
      <CardContent className="space-y-4">
        <form
          className="grid gap-2 sm:grid-cols-5"
          onSubmit={(e) => {
            e.preventDefault()
            setPageNo(1)
            setFilter({
              action: draft.action || undefined,
              entityType: draft.entityType || undefined,
              at:
                draft.from || draft.to
                  ? {
                      from: draft.from || undefined,
                      to: draft.to ? `${draft.to}T23:59:59` : undefined,
                    }
                  : undefined,
            })
          }}
        >
          <Input
            placeholder={t("audit.action", "Action, e.g. employee.")}
            value={draft.action}
            onChange={(e) => setDraft({ ...draft, action: e.target.value })}
          />
          <Input
            placeholder={t("audit.entity", "Record type, e.g. Employee")}
            value={draft.entityType}
            onChange={(e) => setDraft({ ...draft, entityType: e.target.value })}
          />
          <Input
            type="date"
            aria-label={t("common.from", "From")}
            value={draft.from}
            onChange={(e) => setDraft({ ...draft, from: e.target.value })}
          />
          <Input
            type="date"
            aria-label={t("common.to", "To")}
            value={draft.to}
            onChange={(e) => setDraft({ ...draft, to: e.target.value })}
          />
          <Button type="submit">{t("common.apply", "Apply")}</Button>
        </form>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>{t("audit.when", "When")}</TableHead>
                <TableHead>{t("audit.who", "Who")}</TableHead>
                <TableHead>{t("audit.event", "Action")}</TableHead>
                <TableHead>{t("audit.record", "Record")}</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!page && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    <Spinner className="mx-auto" />
                  </TableCell>
                </TableRow>
              )}
              {page?.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    {t("audit.empty", "No entries match.")}
                  </TableCell>
                </TableRow>
              )}
              {page?.data.map((e) => {
                const expanded = open === e.id
                return (
                  <Fragment key={e.id}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() => setOpen(expanded ? null : e.id)}
                    >
                      <TableCell>
                        <ChevronRightIcon
                          className={cn(
                            "size-4 transition-transform",
                            expanded && "rotate-90"
                          )}
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatStamp(e.at)}
                      </TableCell>
                      <TableCell>
                        {e.actor?.fullName ?? (
                          <span className="text-muted-foreground">
                            {t("audit.system", "System")}
                          </span>
                        )}
                        {e.onBehalfOf && (
                          <div className="text-xs text-muted-foreground">
                            {t("audit.on_behalf", "on behalf of {{name}}", {
                              name: e.onBehalfOf.fullName,
                            })}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono">
                          {e.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {e.entityType}
                        <div className="max-w-48 truncate font-mono text-muted-foreground">
                          {e.entityId}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {e.ipAddress ?? "—"}
                      </TableCell>
                    </TableRow>
                    {expanded && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={6}>
                          <div className="grid gap-3 md:grid-cols-2">
                            <JsonBlock
                              label={t("audit.before", "Before")}
                              json={e.before}
                            />
                            <JsonBlock
                              label={t("audit.after", "After")}
                              json={e.after}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        </div>
        {page && (
          <Pager
            page={page.page}
            totalPages={page.totalPages}
            total={page.total}
            onPage={setPageNo}
          />
        )}
      </CardContent>
    </Card>
  )
}

function JsonBlock({ label, json }: { label: string; json: string | null }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-xs font-medium text-muted-foreground">
        {label}
      </div>
      <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs">
        {json ? JSON.stringify(JSON.parse(json), null, 2) : "—"}
      </pre>
    </div>
  )
}

function LoginsTab() {
  const { t } = useTranslation()
  const [pageNo, setPageNo] = useState(1)
  const [page, setPage] = useState<Page<LoginEvent> | null>(null)

  useEffect(() => {
    void fetchLoginEvents(undefined, { page: pageNo, limit: 25 }).then(setPage)
  }, [pageNo])

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("audit.when", "When")}</TableHead>
                <TableHead>{t("employees.company_email", "Email")}</TableHead>
                <TableHead>{t("audit.event", "Event")}</TableHead>
                <TableHead>{t("common.reason", "Reason")}</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page?.data.map((e, i) => (
                <TableRow key={i}>
                  <TableCell className="whitespace-nowrap">
                    {formatStamp(e.createdAt)}
                  </TableCell>
                  <TableCell>{e.email}</TableCell>
                  <TableCell>
                    <Badge variant={e.success ? "secondary" : "destructive"}>
                      {e.type.replaceAll("_", " ").toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {e.reason?.replaceAll("_", " ") ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {e.ipAddress ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {page && (
          <Pager
            page={page.page}
            totalPages={page.totalPages}
            total={page.total}
            onPage={setPageNo}
          />
        )}
      </CardContent>
    </Card>
  )
}

function Pager({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number
  totalPages: number
  total: number
  onPage: (p: number) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>{t("common.total", "{{count}} total", { count: total })}</span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          {t("common.previous", "Previous")}
        </Button>
        <span>
          {page} / {Math.max(1, totalPages)}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          {t("common.next", "Next")}
        </Button>
      </div>
    </div>
  )
}

export default AuditLogPage
