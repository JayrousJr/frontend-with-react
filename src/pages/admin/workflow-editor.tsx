import { useEffect, useState } from "react"
import { useLoaderData, useRevalidator } from "react-router"
import { useTranslation } from "react-i18next"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PlusIcon,
  RocketIcon,
  SaveIcon,
  Trash2Icon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Field, FieldLabel } from "@/components/ui/field"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PageHeader } from "@/components/app/page-header"
import { AsyncPicker, type PickerOption } from "@/components/app/async-picker"
import { searchUserOptions } from "@/components/app/pickers"
import { ConfirmDialog } from "@/components/app/confirm-dialog"
import { useRun } from "@/components/app/use-run"
import { useAuth } from "@/context/auth-context"
import { P, hasPermission } from "@/lib/permissions"
import { formatStamp } from "@/lib/format"
import {
  fetchGroups,
  fetchRoles,
  type Role,
  type UserGroup,
} from "@/services/access"
import {
  activateChain,
  discardChainDraft,
  saveChainDraft,
  type ApprovalMode,
  type ApprovalPoint,
  type ApproverType,
  type ChainVersion,
  type StepConfig,
  type StepInput,
} from "@/services/workflow"

type DraftStep = StepInput & { key: string; approverLabel?: string }

let seq = 0
const keyOf = () => `s${++seq}`

const fromConfig = (s: StepConfig): DraftStep => ({
  key: keyOf(),
  code: s.code,
  name: s.name,
  approverType: s.approverType,
  approverUniqueId: s.approverUniqueId ?? undefined,
  approverLabel: s.approverLabel,
  rule: s.rule ?? undefined,
  mode: s.mode,
  requiredCount: s.requiredCount,
  allowDelegation: s.allowDelegation,
  condition: s.condition ?? undefined,
  slaHours: s.slaHours ?? undefined,
})

const WorkflowEditorPage = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { point, rules } = useLoaderData() as {
    point: ApprovalPoint
    rules: { code: string; description: string }[]
  }
  const revalidator = useRevalidator()
  const run = useRun()
  const canManage = hasPermission(user, P.WORKFLOW_MANAGE)
  const canActivate = hasPermission(user, P.WORKFLOW_ACTIVATE)
  const draft = point.versions.find((v) => v.status === "DRAFT") ?? null
  const active = point.versions.find((v) => v.status === "ACTIVE") ?? null

  const base = draft ?? active
  const [steps, setSteps] = useState<DraftStep[]>(() =>
    (base?.steps ?? []).map(fromConfig)
  )
  const [baseId, setBaseId] = useState(base?.uniqueId)
  if (baseId !== base?.uniqueId) {
    setBaseId(base?.uniqueId)
    setSteps((base?.steps ?? []).map(fromConfig))
  }
  const [groups, setGroups] = useState<UserGroup[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [confirmActivate, setConfirmActivate] = useState(false)

  useEffect(() => {
    void fetchGroups()
      .then(setGroups)
      .catch(() => setGroups([]))
    void fetchRoles()
      .then((r) => setRoles(r.data.filter((x) => x.isActive)))
      .catch(() => setRoles([]))
  }, [])

  const update = (key: string, patch: Partial<DraftStep>) =>
    setSteps((prev) =>
      prev.map((s) => (s.key === key ? { ...s, ...patch } : s))
    )
  const move = (i: number, d: -1 | 1) =>
    setSteps((prev) => {
      const next = [...prev]
      ;[next[i], next[i + d]] = [next[i + d], next[i]]
      return next
    })

  const incomplete = steps.some(
    (s) =>
      !s.code.trim() ||
      !s.name.trim() ||
      (s.approverType === "RULE" ? !s.rule : !s.approverUniqueId) ||
      (s.mode === "N_OF_M" && !(s.requiredCount && s.requiredCount > 0))
  )

  const save = () =>
    run(
      () =>
        saveChainDraft(
          point.code,
          steps.map((s): StepInput => ({
            code: s.code.trim(),
            name: s.name.trim(),
            approverType: s.approverType,
            approverUniqueId: s.approverUniqueId,
            rule: s.rule,
            mode: s.mode,
            requiredCount: s.requiredCount,
            allowDelegation: s.allowDelegation,
            condition: s.condition?.trim() || undefined,
            slaHours: s.slaHours,
          }))
        ),
      t("workflows.draft_saved", "Draft saved")
    ).then((ok) => {
      if (ok) void revalidator.revalidate()
    })

  return (
    <div className="space-y-6">
      <PageHeader
        title={point.name}
        description={
          <>
            <span className="font-mono">{point.code}</span> ·{" "}
            {point.description}
          </>
        }
        actions={
          <>
            {canManage && draft && (
              <Button
                variant="outline"
                onClick={() =>
                  run(
                    () => discardChainDraft(point.code),
                    t("workflows.discarded", "Draft discarded")
                  ).then((ok) => {
                    if (ok) void revalidator.revalidate()
                  })
                }
              >
                {t("workflows.discard", "Discard draft")}
              </Button>
            )}
            {canManage && (
              <Button variant="outline" disabled={incomplete} onClick={save}>
                <SaveIcon />
                {t("workflows.save_draft", "Save as draft")}
              </Button>
            )}
            {canActivate && draft && (
              <Button onClick={() => setConfirmActivate(true)}>
                <RocketIcon />
                {t("workflows.activate", "Activate draft v{{v}}", {
                  v: draft.version,
                })}
              </Button>
            )}
          </>
        }
      />

      <Alert>
        <AlertDescription>
          {draft
            ? t(
                "workflows.editing_draft",
                "You are editing draft v{{v}}. Save it, then activate it to apply it to new requests.",
                { v: draft.version }
              )
            : t(
                "workflows.editing_active",
                "Changes are saved as a new draft version; the active chain stays in force until the draft is activated."
              )}
        </AlertDescription>
      </Alert>

      <div className="space-y-3">
        {steps.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {t(
                "workflows.empty",
                "No steps: requests at this point are approved automatically."
              )}
            </CardContent>
          </Card>
        )}
        {steps.map((s, i) => (
          <Card key={s.key}>
            <CardHeader className="flex flex-row items-center gap-2">
              <Badge variant="secondary">{i + 1}</Badge>
              <CardTitle className="flex-1 text-base">
                {s.name || t("workflows.new_step", "New step")}
              </CardTitle>
              {canManage && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    aria-label={t("workflows.up", "Move up")}
                  >
                    <ArrowUpIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={i === steps.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label={t("workflows.down", "Move down")}
                  >
                    <ArrowDownIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      setSteps((p) => p.filter((x) => x.key !== s.key))
                    }
                    aria-label={t("common.remove", "Remove")}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <fieldset
                disabled={!canManage}
                className="grid gap-4 md:grid-cols-2"
              >
                <Field>
                  <FieldLabel htmlFor={`${s.key}-name`}>
                    {t("common.name", "Name")}
                  </FieldLabel>
                  <Input
                    id={`${s.key}-name`}
                    value={s.name}
                    onChange={(e) => update(s.key, { name: e.target.value })}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${s.key}-code`}>
                    {t("common.code", "Code")}
                  </FieldLabel>
                  <Input
                    id={`${s.key}-code`}
                    value={s.code}
                    onChange={(e) =>
                      update(s.key, {
                        code: e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9_]/g, "_"),
                      })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${s.key}-type`}>
                    {t("workflows.approver_type", "Approver")}
                  </FieldLabel>
                  <NativeSelect
                    id={`${s.key}-type`}
                    className="w-full"
                    value={s.approverType}
                    onChange={(e) =>
                      update(s.key, {
                        approverType: e.target.value as ApproverType,
                        approverUniqueId: undefined,
                        approverLabel: undefined,
                        rule: undefined,
                      })
                    }
                  >
                    <NativeSelectOption value="GROUP">
                      {t("workflows.t_group", "A group")}
                    </NativeSelectOption>
                    <NativeSelectOption value="ROLE">
                      {t("workflows.t_role", "Holders of a role")}
                    </NativeSelectOption>
                    <NativeSelectOption value="USER">
                      {t("workflows.t_user", "A specific person")}
                    </NativeSelectOption>
                    <NativeSelectOption value="RULE">
                      {t("workflows.t_rule", "An assignee rule")}
                    </NativeSelectOption>
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldLabel>{t("workflows.who", "Who")}</FieldLabel>
                  {s.approverType === "GROUP" && (
                    <NativeSelect
                      className="w-full"
                      value={s.approverUniqueId ?? ""}
                      onChange={(e) =>
                        update(s.key, {
                          approverUniqueId: e.target.value || undefined,
                        })
                      }
                    >
                      <NativeSelectOption value="">—</NativeSelectOption>
                      {groups.map((g) => (
                        <NativeSelectOption key={g.uniqueId} value={g.uniqueId}>
                          {g.name} ({g.members.length})
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  )}
                  {s.approverType === "ROLE" && (
                    <NativeSelect
                      className="w-full"
                      value={s.approverUniqueId ?? ""}
                      onChange={(e) =>
                        update(s.key, {
                          approverUniqueId: e.target.value || undefined,
                        })
                      }
                    >
                      <NativeSelectOption value="">—</NativeSelectOption>
                      {roles.map((r) => (
                        <NativeSelectOption key={r.uniqueId} value={r.uniqueId}>
                          {r.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  )}
                  {s.approverType === "RULE" && (
                    <NativeSelect
                      className="w-full"
                      value={s.rule ?? ""}
                      onChange={(e) =>
                        update(s.key, { rule: e.target.value || undefined })
                      }
                    >
                      <NativeSelectOption value="">—</NativeSelectOption>
                      {rules.map((r) => (
                        <NativeSelectOption key={r.code} value={r.code}>
                          {r.description}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  )}
                  {s.approverType === "USER" && (
                    <AsyncPicker
                      selected={
                        s.approverUniqueId
                          ? ({
                              value: s.approverUniqueId,
                              label: s.approverLabel ?? s.approverUniqueId,
                            } as PickerOption)
                          : null
                      }
                      onChange={(o) =>
                        update(s.key, {
                          approverUniqueId: o?.value,
                          approverLabel: o?.label,
                        })
                      }
                      search={searchUserOptions}
                    />
                  )}
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${s.key}-mode`}>
                    {t("workflows.mode", "Decision")}
                  </FieldLabel>
                  <div className="flex gap-2">
                    <NativeSelect
                      id={`${s.key}-mode`}
                      className="w-full"
                      value={s.mode}
                      onChange={(e) =>
                        update(s.key, { mode: e.target.value as ApprovalMode })
                      }
                    >
                      <NativeSelectOption value="ANY">
                        {t("workflows.m_any", "Any one approves")}
                      </NativeSelectOption>
                      <NativeSelectOption value="N_OF_M">
                        {t("workflows.m_n", "N of M approve")}
                      </NativeSelectOption>
                      <NativeSelectOption value="ALL">
                        {t("workflows.m_all", "Everyone approves")}
                      </NativeSelectOption>
                    </NativeSelect>
                    {s.mode === "N_OF_M" && (
                      <Input
                        type="number"
                        min={1}
                        className="w-20"
                        aria-label={t("workflows.required", "Approvals needed")}
                        value={s.requiredCount ?? 2}
                        onChange={(e) =>
                          update(s.key, {
                            requiredCount: Number(e.target.value),
                          })
                        }
                      />
                    )}
                  </div>
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${s.key}-cond`}>
                    {t("workflows.condition", "Only when (optional)")}
                  </FieldLabel>
                  <Input
                    id={`${s.key}-cond`}
                    className="font-mono text-xs"
                    placeholder='{"path":"amount","op":"gt","value":1000000}'
                    value={s.condition ?? ""}
                    onChange={(e) =>
                      update(s.key, { condition: e.target.value })
                    }
                  />
                </Field>
                <div className="flex items-center gap-2 md:col-span-2">
                  <Switch
                    id={`${s.key}-deleg`}
                    checked={s.allowDelegation}
                    onCheckedChange={(v) =>
                      update(s.key, { allowDelegation: v })
                    }
                  />
                  <Label htmlFor={`${s.key}-deleg`}>
                    {t(
                      "workflows.allow_delegation",
                      "Approvers may act through a delegation"
                    )}
                  </Label>
                </div>
              </fieldset>
            </CardContent>
          </Card>
        ))}
        {canManage && (
          <Button
            variant="outline"
            onClick={() =>
              setSteps((p) => [
                ...p,
                {
                  key: keyOf(),
                  code: `step_${p.length + 1}`,
                  name: "",
                  approverType: "GROUP",
                  mode: "ANY",
                  allowDelegation: true,
                },
              ])
            }
          >
            <PlusIcon />
            {t("workflows.add_step", "Add step")}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("workflows.versions", "Versions")}</CardTitle>
          <CardDescription>
            {t(
              "workflows.versions_hint",
              "Every version is kept; requests record the version they used."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {point.versions.map((v: ChainVersion) => (
            <div
              key={v.uniqueId}
              className="flex flex-wrap items-center gap-2 text-sm"
            >
              <Badge variant={v.status === "ACTIVE" ? "default" : "outline"}>
                v{v.version} · {v.status.toLowerCase()}
              </Badge>
              <span className="text-muted-foreground">
                {v.steps.length
                  ? v.steps.map((s) => s.name).join(" → ")
                  : t("workflows.no_steps", "No steps — no approval needed")}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatStamp(v.activatedAt ?? v.createdAt)}
              </span>
            </div>
          ))}
          {point.versions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t(
                "workflows.no_versions",
                "Never configured: no approval needed."
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {draft && (
        <ConfirmDialog
          open={confirmActivate}
          onOpenChange={setConfirmActivate}
          title={t("workflows.activate_title", "Activate draft v{{v}}?", {
            v: draft.version,
          })}
          description={t(
            "workflows.activate_hint",
            "New requests will use this chain. Requests already running keep their version."
          )}
          confirmLabel={t("workflows.activate_short", "Activate")}
          onConfirm={async () => {
            const ok = await run(
              () => activateChain(point.code, draft.uniqueId),
              t("workflows.activated", "Chain activated")
            )
            setConfirmActivate(false)
            if (ok) void revalidator.revalidate()
          }}
        />
      )}
    </div>
  )
}

export default WorkflowEditorPage
