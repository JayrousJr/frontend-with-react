import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router"
import { useTranslation } from "react-i18next"
import { ArrowRightIcon, CheckIcon, PlusIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { PageHeader } from "@/components/app/page-header"
import { AsyncPicker, type PickerOption } from "@/components/app/async-picker"
import { searchUserOptions } from "@/components/app/pickers"
import { useRun } from "@/components/app/use-run"
import { useAuth } from "@/context/auth-context"
import { P, hasPermission, scopesFor } from "@/lib/permissions"
import { formatStamp } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  cancelDelegation,
  createDelegation,
  decideDelegation,
  fetchDelegations,
  type Delegation,
  type DelegationStatus,
} from "@/services/delegations"
import type { Page } from "@/services/types"

type Scope = "mine" | "pending" | "all"

const TONE: Record<DelegationStatus, string> = {
  PENDING:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  APPROVED:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  REJECTED: "border-destructive/30 bg-destructive/10 text-destructive",
  CANCELLED: "border-border bg-muted text-muted-foreground",
  EXPIRED: "border-border bg-muted text-muted-foreground",
}

const DelegationsPage = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const run = useRun()
  const [params, setParams] = useSearchParams()
  const canApprove = hasPermission(user, P.DELEGATION_APPROVE)
  const canCreate = hasPermission(user, P.DELEGATION_CREATE)
  const scope = ((canApprove && params.get("tab")) || "mine") as Scope
  const [page, setPage] = useState<Page<Delegation> | null>(null)
  const [creating, setCreating] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    void fetchDelegations(scope, { limit: 50 }).then(
      (p) => !cancelled && setPage(p)
    )
    return () => {
      cancelled = true
    }
  }, [scope, reload])

  const refresh = () => setReload((n) => n + 1)
  const loading = !page

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("delegations.title", "Delegations")}
        description={t(
          "delegations.subtitle",
          "Hand your roles to a colleague for a period (e.g. while on leave). Every delegation is approved, ends automatically, and actions are recorded “on behalf of” you."
        )}
        actions={
          canCreate && (
            <Button onClick={() => setCreating(true)}>
              <PlusIcon />
              {t("delegations.new", "New delegation")}
            </Button>
          )
        }
      />
      {canApprove && (
        <Tabs
          value={scope}
          onValueChange={(v) => {
            setPage(null)
            setParams({ tab: v }, { replace: true })
          }}
        >
          <TabsList variant="line">
            <TabsTrigger value="mine">
              {t("delegations.mine", "Mine")}
            </TabsTrigger>
            <TabsTrigger value="pending">
              {t("delegations.pending", "Awaiting approval")}
            </TabsTrigger>
            <TabsTrigger value="all">{t("delegations.all", "All")}</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {loading ? (
        <div className="flex justify-center p-10">
          <Spinner />
        </div>
      ) : page.data.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {scope === "pending"
              ? t("delegations.none_pending", "Nothing waiting for approval.")
              : t("delegations.none", "No delegations yet.")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {page.data.map((d) => {
            const mineToDecide =
              canApprove &&
              d.status === "PENDING" &&
              d.from.uniqueId !== user?.uniqueId &&
              d.to.uniqueId !== user?.uniqueId
            const canCancel =
              (d.status === "PENDING" || d.status === "APPROVED") &&
              (canApprove ||
                d.from.uniqueId === user?.uniqueId ||
                d.to.uniqueId === user?.uniqueId)
            return (
              <Card key={d.uniqueId} className="py-4">
                <CardContent className="flex flex-col gap-3 md:flex-row md:items-center">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">{d.from.fullName}</span>
                      <ArrowRightIcon className="size-4 text-muted-foreground" />
                      <span className="font-medium">{d.to.fullName}</span>
                      <Badge variant="outline" className={TONE[d.status]}>
                        {t(
                          `delegations.status.${d.status}`,
                          d.status.toLowerCase()
                        )}
                      </Badge>
                      {d.inForce && (
                        <Badge>{t("delegations.in_force", "In force")}</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatStamp(d.start)} – {formatStamp(d.end)}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {d.allRoles ? (
                        <Badge variant="secondary">
                          {t("delegations.all_roles", "All roles")}
                        </Badge>
                      ) : (
                        d.roles.map((r) => (
                          <Badge key={r.uniqueId} variant="secondary">
                            {r.name}
                          </Badge>
                        ))
                      )}
                    </div>
                    <p className="text-sm">{d.reason}</p>
                    {d.approvedBy && (
                      <p className="text-xs text-muted-foreground">
                        {t("delegations.decided_by", "Decided by {{name}}", {
                          name: d.approvedBy.fullName,
                        })}{" "}
                        · {formatStamp(d.decidedAt)}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {mineToDecide && (
                      <>
                        <Button
                          size="sm"
                          onClick={() =>
                            run(
                              () => decideDelegation(d.uniqueId, true),
                              t("delegations.approved", "Delegation approved")
                            ).then((ok) => ok && refresh())
                          }
                        >
                          <CheckIcon />
                          {t("common.approve", "Approve")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            run(
                              () => decideDelegation(d.uniqueId, false),
                              t("delegations.rejected", "Delegation rejected")
                            ).then((ok) => ok && refresh())
                          }
                        >
                          <XIcon />
                          {t("common.reject", "Reject")}
                        </Button>
                      </>
                    )}
                    {canCancel && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          run(
                            () => cancelDelegation(d.uniqueId),
                            t("delegations.cancelled", "Delegation cancelled")
                          ).then((ok) => ok && refresh())
                        }
                      >
                        {t("actions.cancel", "Cancel")}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {creating && (
        <CreateDelegationDialog
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false)
            refresh()
          }}
        />
      )}
    </div>
  )
}

const toLocalInput = (d: Date) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16)

function CreateDelegationDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const run = useRun()
  const onBehalfAllowed = scopesFor(user, P.DELEGATION_CREATE).includes("ALL")
  const [from, setFrom] = useState<PickerOption | null>(null)
  const [to, setTo] = useState<PickerOption | null>(null)
  const myRoles = useMemo(
    () => [
      ...new Map((user?.roles ?? []).map((r) => [r.roleUniqueId, r])).values(),
    ],
    [user]
  )
  const [roleIds, setRoleIds] = useState<Set<string>>(new Set())
  const now = new Date()
  const [start, setStart] = useState(toLocalInput(now))
  const [end, setEnd] = useState(
    toLocalInput(new Date(now.getTime() + 7 * 86_400_000))
  )
  const [reason, setReason] = useState("")
  const delegatingForOther = !!from && from.value !== user?.uniqueId

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("delegations.new", "New delegation")}</DialogTitle>
          <DialogDescription>
            {t(
              "delegations.new_hint",
              "It takes effect once approved, and only between the start and end."
            )}
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          {onBehalfAllowed && (
            <Field>
              <FieldLabel>{t("delegations.from", "Delegator")}</FieldLabel>
              <AsyncPicker
                selected={from}
                onChange={setFrom}
                search={searchUserOptions}
                placeholder={t("delegations.from_me", "Me")}
              />
            </Field>
          )}
          <Field>
            <FieldLabel>{t("delegations.to", "Delegate to")}</FieldLabel>
            <AsyncPicker
              selected={to}
              onChange={setTo}
              search={searchUserOptions}
              placeholder={t("delegations.pick_user", "Choose a colleague")}
            />
          </Field>
          <Field>
            <FieldLabel>{t("delegations.roles", "Roles")}</FieldLabel>
            {delegatingForOther ? (
              <FieldDescription>
                {t(
                  "delegations.other_all_roles",
                  "All roles of the delegator are delegated."
                )}
              </FieldDescription>
            ) : (
              <>
                <div className="grid gap-1.5">
                  {myRoles.map((r) => (
                    <label
                      key={r.roleUniqueId}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
                      )}
                    >
                      <Checkbox
                        checked={roleIds.has(r.roleUniqueId)}
                        onCheckedChange={(v) =>
                          setRoleIds((prev) => {
                            const next = new Set(prev)
                            if (v === true) next.add(r.roleUniqueId)
                            else next.delete(r.roleUniqueId)
                            return next
                          })
                        }
                      />
                      {r.roleName}
                      {r.contextName ? ` · ${r.contextName}` : ""}
                    </label>
                  ))}
                </div>
                <FieldDescription>
                  {t(
                    "delegations.none_selected",
                    "Leave all unticked to delegate every role."
                  )}
                </FieldDescription>
              </>
            )}
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="dl-start">
                {t("common.from", "From")}
              </FieldLabel>
              <Input
                id="dl-start"
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="dl-end">{t("common.to", "To")}</FieldLabel>
              <Input
                id="dl-end"
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="dl-reason">
              {t("common.reason", "Reason")}
            </FieldLabel>
            <Textarea
              id="dl-reason"
              placeholder={t(
                "delegations.reason_hint",
                "e.g. Annual leave 1–14 December"
              )}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("actions.cancel", "Cancel")}
          </Button>
          <Button
            disabled={!to || reason.trim().length < 3 || !start || !end}
            onClick={async () => {
              const ok = await run(
                () =>
                  createDelegation({
                    fromUserUniqueId: delegatingForOther
                      ? from!.value
                      : undefined,
                    toUserUniqueId: to!.value,
                    roleUniqueIds: delegatingForOther ? [] : [...roleIds],
                    start: new Date(start).toISOString(),
                    end: new Date(end).toISOString(),
                    reason: reason.trim(),
                  }),
                t("delegations.created", "Delegation submitted for approval")
              )
              if (ok) onCreated()
            }}
          >
            {t("delegations.submit", "Submit for approval")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DelegationsPage
