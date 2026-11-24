import { useState } from "react"
import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import { PlusIcon, UserPlusIcon, UserMinusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldLabel } from "@/components/ui/field"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { ToneBadge } from "@/components/app/tone-badge"
import { useRun } from "@/components/app/use-run"
import { ROUTES, withId } from "@/routes/routeConstants"
import {
  assignCrew,
  fetchCandidates,
  fetchConfig,
  fetchCrew,
  releaseCrew,
  requestAdditionalCrew,
  type Candidate,
  type CrewRequirement,
  type Production,
} from "@/services/production"
import { Conflicts, FormDialog, Loading, Section } from "./ui"
import { useLoad } from "./utils"

function AssignDialog({
  req,
  onClose,
  onDone,
}: {
  req: CrewRequirement
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation()
  const run = useRun()
  const cands = useLoad(() => fetchCandidates(req.uniqueId), [req.uniqueId])
  const [pick, setPick] = useState<Candidate | null>(null)
  const [reason, setReason] = useState("")
  const warn =
    pick && (pick.missingSkills.length > 0 || pick.conflicts.length > 0)
  const hard = pick?.conflicts.some((c) => c.hard)
  return (
    <FormDialog
      wide
      title={t("crew.assign_title", "Assign {{role}} ({{dept}})", {
        role: req.crewRole,
        dept: req.department,
      })}
      description={
        req.skills.length
          ? t("crew.skills_needed", "Skills expected: {{skills}}", {
              skills: req.skills.join(", "),
            })
          : undefined
      }
      confirmLabel={t("crew.assign", "Assign")}
      canConfirm={!!pick && !hard && (!warn || !!reason.trim())}
      onClose={onClose}
      onConfirm={async () => {
        const ok = await run(
          () => assignCrew(req.uniqueId, pick!.employeeId, reason),
          t("crew.assigned", "Assigned")
        )
        if (ok) onDone()
        return ok
      }}
    >
      {!cands.data && <Loading error={cands.error} />}
      {cands.data?.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {t("crew.no_candidates", "No employees left in this department.")}
        </p>
      )}
      <div className="max-h-80 space-y-1 overflow-y-auto">
        {cands.data?.map((c) => (
          <button
            key={c.employeeId}
            type="button"
            onClick={() => setPick(c)}
            className={`w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-muted ${pick?.employeeId === c.employeeId ? "border-primary bg-muted" : ""}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{c.name}</span>
              <span className="text-xs text-muted-foreground">
                {c.employeeNumber} · {c.jobTitle}
              </span>
              {c.available && !c.missingSkills.length ? (
                <ToneBadge code="APPROVED" className="ml-auto" />
              ) : (
                <ToneBadge
                  code={c.conflicts.some((x) => x.hard) ? "BLOCKED" : "PENDING"}
                  className="ml-auto"
                />
              )}
            </div>
            {[...c.skills, ...c.qualifications, ...c.professionalRoles].length >
              0 && (
              <div className="text-xs text-muted-foreground">
                {[
                  ...c.skills,
                  ...c.qualifications,
                  ...c.professionalRoles,
                ].join(", ")}
              </div>
            )}
            {c.missingSkills.length > 0 && (
              <div className="text-xs text-amber-700 dark:text-amber-400">
                {t("crew.missing", "Missing")}: {c.missingSkills.join(", ")}
              </div>
            )}
            <Conflicts items={c.conflicts} />
          </button>
        ))}
      </div>
      {warn && !hard && (
        <Field>
          <FieldLabel>
            {t("crew.override_reason", "Reason to assign anyway")}
          </FieldLabel>
          <Textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
      )}
    </FormDialog>
  )
}

export function CrewTab({ p }: { p: Production }) {
  const { t } = useTranslation()
  const run = useRun()
  const board = useLoad(() => fetchCrew(p.uniqueId), [p.uniqueId])
  const cfg = useLoad(fetchConfig)
  const [assign, setAssign] = useState<CrewRequirement | null>(null)
  const [release, setRelease] = useState<{
    id: string
    name: string
    reason: string
  } | null>(null)
  const [extra, setExtra] = useState<{
    departmentId: string
    crewRoleId: string
    quantity: string
    justification: string
  } | null>(null)
  if (!board.data) return <Loading error={board.error} />
  const byDept = new Map<string, CrewRequirement[]>()
  for (const r of board.data.requirements)
    byDept.set(r.department, [...(byDept.get(r.department) ?? []), r])
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-end gap-2">
        {board.data.canRequestAdditional && (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setExtra({
                departmentId: String(p.departments[0]?.departmentId ?? ""),
                crewRoleId: "",
                quantity: "1",
                justification: "",
              })
            }
          >
            <PlusIcon />
            {t("crew.request_additional", "Request additional crew")}
          </Button>
        )}
      </div>
      {byDept.size === 0 && (
        <p className="text-sm text-muted-foreground">
          {t("crew.none", "No crew requirements on this production.")}
        </p>
      )}
      {[...byDept.entries()].map(([dept, reqs]) => {
        const deptId = reqs[0].departmentId
        return (
          <Section
            key={dept}
            title={dept}
            description={`${reqs.reduce((s, r) => s + (r.status === "APPROVED" ? Math.min(r.filled, r.quantity) : 0), 0)} / ${reqs
              .filter((r) => r.status === "APPROVED")
              .reduce(
                (s, r) => s + r.quantity,
                0
              )} ${t("crew.filled", "positions filled")}`}
            actions={
              <Button asChild size="sm" variant="ghost">
                <Link
                  to={`${withId(ROUTES.CALL_SHEET, p.uniqueId)}?departmentId=${deptId}`}
                >
                  {t("crew.dept_call_sheet", "Department call sheet")}
                </Link>
              </Button>
            }
          >
            <div className="space-y-4">
              {reqs.map((r) => (
                <div key={r.uniqueId} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.crewRole}</span>
                    <span className="text-sm text-muted-foreground">
                      {r.filled} / {r.quantity}
                    </span>
                    {r.additional && <ToneBadge code={r.status} />}
                    {r.additional && (
                      <span className="text-xs text-muted-foreground">
                        {t("crew.additional", "Additional")}: {r.justification}
                      </span>
                    )}
                    {r.canAssign && (
                      <Button
                        size="sm"
                        className="ml-auto"
                        onClick={() => setAssign(r)}
                      >
                        <UserPlusIcon />
                        {t("crew.assign", "Assign")}
                      </Button>
                    )}
                  </div>
                  {r.note && (
                    <p className="text-xs text-muted-foreground">{r.note}</p>
                  )}
                  <ul className="mt-2 space-y-1 text-sm">
                    {r.assignments.map((a) => (
                      <li
                        key={a.uniqueId}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <span
                          className={
                            a.status === "CANCELLED"
                              ? "text-muted-foreground line-through"
                              : ""
                          }
                        >
                          {a.employee}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {a.employeeNumber} · {a.phone} ·{" "}
                          {a.hasLogin
                            ? t("crew.login", "has login")
                            : t("crew.email_only", "email only")}
                        </span>
                        {a.status !== "ASSIGNED" && (
                          <ToneBadge code={a.status} />
                        )}
                        {a.overrideReason && (
                          <span className="text-xs text-amber-700 dark:text-amber-400">
                            ({a.overrideReason})
                          </span>
                        )}
                        {a.cancelReason && (
                          <span className="text-xs text-muted-foreground">
                            ({a.cancelReason})
                          </span>
                        )}
                        {a.canRelease && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="ml-auto"
                            onClick={() =>
                              setRelease({
                                id: a.uniqueId,
                                name: a.employee,
                                reason: "",
                              })
                            }
                          >
                            <UserMinusIcon />
                            {t("crew.release", "Release")}
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Section>
        )
      })}
      {assign && (
        <AssignDialog
          req={assign}
          onClose={() => setAssign(null)}
          onDone={board.reload}
        />
      )}
      {release && (
        <FormDialog
          title={t("crew.release_title", "Release {{name}}", {
            name: release.name,
          })}
          confirmLabel={t("crew.release", "Release")}
          destructive
          canConfirm={!!release.reason.trim()}
          onClose={() => setRelease(null)}
          onConfirm={() =>
            run(
              async () =>
                board.set(await releaseCrew(release.id, release.reason)),
              t("crew.released", "Released")
            )
          }
        >
          <Textarea
            rows={2}
            placeholder={t("common.reason", "Reason")}
            value={release.reason}
            onChange={(e) => setRelease({ ...release, reason: e.target.value })}
          />
        </FormDialog>
      )}
      {extra && cfg.data && (
        <FormDialog
          title={t("crew.request_additional", "Request additional crew")}
          description={t(
            "crew.additional_hint",
            "The Production Manager approves before you can assign."
          )}
          confirmLabel={t("crew.send_request", "Send request")}
          canConfirm={
            !!extra.crewRoleId &&
            Number(extra.quantity) > 0 &&
            !!extra.justification.trim()
          }
          onClose={() => setExtra(null)}
          onConfirm={() =>
            run(
              async () =>
                board.set(
                  await requestAdditionalCrew(p.uniqueId, {
                    departmentId: Number(extra.departmentId),
                    crewRoleId: Number(extra.crewRoleId),
                    quantity: Number(extra.quantity),
                    justification: extra.justification,
                  })
                ),
              t("crew.request_sent", "Request sent")
            )
          }
        >
          <Field>
            <FieldLabel>{t("productions.department", "Department")}</FieldLabel>
            <NativeSelect
              className="w-full"
              value={extra.departmentId}
              onChange={(e) =>
                setExtra({
                  ...extra,
                  departmentId: e.target.value,
                  crewRoleId: "",
                })
              }
            >
              {p.departments.map((d) => (
                <NativeSelectOption
                  key={d.departmentId}
                  value={String(d.departmentId)}
                >
                  {d.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel>{t("productions.role", "Role")}</FieldLabel>
            <NativeSelect
              className="w-full"
              value={extra.crewRoleId}
              onChange={(e) =>
                setExtra({ ...extra, crewRoleId: e.target.value })
              }
            >
              <NativeSelectOption value="">—</NativeSelectOption>
              {cfg.data.crewRoles
                .filter(
                  (r) =>
                    String(r.departmentId) === extra.departmentId && r.isActive
                )
                .map((r) => (
                  <NativeSelectOption key={r.id} value={String(r.id)}>
                    {r.name}
                  </NativeSelectOption>
                ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel>{t("productions.quantity", "Qty")}</FieldLabel>
            <Input
              type="number"
              min={1}
              value={extra.quantity}
              onChange={(e) => setExtra({ ...extra, quantity: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel>{t("crew.justification", "Justification")}</FieldLabel>
            <Textarea
              rows={2}
              value={extra.justification}
              onChange={(e) =>
                setExtra({ ...extra, justification: e.target.value })
              }
            />
          </Field>
        </FormDialog>
      )}
    </div>
  )
}
