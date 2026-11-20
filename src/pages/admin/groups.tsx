import { useEffect, useState } from "react"
import { useLoaderData, useRevalidator } from "react-router"
import { useTranslation } from "react-i18next"
import { PlusIcon, Trash2Icon, UsersRoundIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { PageHeader } from "@/components/app/page-header"
import { ActiveBadge } from "@/components/app/status-badge"
import { AsyncPicker, type PickerOption } from "@/components/app/async-picker"
import { searchUserOptions } from "@/components/app/pickers"
import { useRun } from "@/components/app/use-run"
import { cn } from "@/lib/utils"
import {
  createGroup,
  fetchRoles,
  setGroupActive,
  setGroupMembers,
  setGroupRoles,
  updateGroup,
  type Role,
  type UserGroup,
} from "@/services/access"

const GroupsPage = () => {
  const { t } = useTranslation()
  const { groups } = useLoaderData() as { groups: UserGroup[] }
  const revalidator = useRevalidator()
  const [selectedId, setSelectedId] = useState<string | null>(
    groups[0]?.uniqueId ?? null
  )
  const [creating, setCreating] = useState(false)
  const selected = groups.find((g) => g.uniqueId === selectedId) ?? null

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("groups.title", "Groups")}
        description={t(
          "groups.subtitle",
          "Named lists of users. Approval steps can name a group (“any one” or “N of M” members), and groups can hold roles."
        )}
        actions={
          <Button onClick={() => setCreating(true)}>
            <PlusIcon />
            {t("groups.new", "New group")}
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        <Card className="h-fit py-2">
          <CardContent className="p-2">
            <nav className="flex flex-col gap-0.5">
              {groups.map((g) => (
                <button
                  key={g.uniqueId}
                  type="button"
                  onClick={() => setSelectedId(g.uniqueId)}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted",
                    g.uniqueId === selectedId && "bg-muted font-medium",
                    !g.isActive && "text-muted-foreground"
                  )}
                >
                  <span className="truncate">{g.name}</span>
                  <Badge variant="secondary">{g.members.length}</Badge>
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>
        {selected ? (
          <GroupPanel
            key={selected.uniqueId}
            group={selected}
            onChanged={() => revalidator.revalidate()}
          />
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {t("groups.none", "No groups yet.")}
            </CardContent>
          </Card>
        )}
      </div>
      {creating && (
        <CreateGroupDialog
          onClose={() => setCreating(false)}
          onCreated={(g) => {
            setCreating(false)
            setSelectedId(g.uniqueId)
            revalidator.revalidate()
          }}
        />
      )}
    </div>
  )
}

function GroupPanel({
  group,
  onChanged,
}: {
  group: UserGroup
  onChanged: () => void
}) {
  const { t } = useTranslation()
  const run = useRun()
  const [name, setName] = useState(group.name)
  const [description, setDescription] = useState(group.description ?? "")
  const [adding, setAdding] = useState<PickerOption | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [roleIds, setRoleIds] = useState(
    () => new Set(group.roles.map((r) => r.uniqueId))
  )

  useEffect(() => {
    void fetchRoles().then((r) =>
      setRoles(r.data.filter((x) => x.isActive && !x.contextType))
    )
  }, [])

  const memberIds = group.members.map((m) => m.userUniqueId)
  const rolesDirty =
    [...roleIds].sort().join() !==
    group.roles
      .map((r) => r.uniqueId)
      .sort()
      .join()

  const saveMembers = (ids: string[]) =>
    run(
      () => setGroupMembers(group.uniqueId, ids),
      t("common.saved", "Saved")
    ).then((ok) => ok && onChanged())

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              {group.name}
              <ActiveBadge active={group.isActive} />
            </CardTitle>
            <CardDescription className="font-mono text-xs">
              {group.code}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              run(() => setGroupActive(group.uniqueId, !group.isActive)).then(
                (ok) => ok && onChanged()
              )
            }
          >
            {group.isActive
              ? t("common.deactivate", "Deactivate")
              : t("common.activate", "Activate")}
          </Button>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="g-name">
                  {t("common.name", "Name")}
                </FieldLabel>
                <Input
                  id="g-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="g-desc">
                  {t("common.description", "Description")}
                </FieldLabel>
                <Input
                  id="g-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Field>
            </div>
            <div>
              <Button
                size="sm"
                variant="outline"
                disabled={
                  name === group.name &&
                  description === (group.description ?? "")
                }
                onClick={() =>
                  run(
                    () =>
                      updateGroup({
                        uniqueId: group.uniqueId,
                        name,
                        description,
                      }),
                    t("common.saved", "Saved")
                  ).then((ok) => {
                    if (ok) void onChanged()
                  })
                }
              >
                {t("common.save", "Save")}
              </Button>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersRoundIcon className="size-4" />
            {t("groups.members", "Members")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <AsyncPicker
                selected={adding}
                onChange={setAdding}
                search={searchUserOptions}
                placeholder={t("groups.add_member", "Add a user…")}
              />
            </div>
            <Button
              disabled={!adding || memberIds.includes(adding.value)}
              onClick={async () => {
                await saveMembers([...memberIds, adding!.value])
                setAdding(null)
              }}
            >
              {t("common.add", "Add")}
            </Button>
          </div>
          {group.members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t(
                "groups.no_members",
                "No members yet. Approval steps naming this group cannot be completed until it has members."
              )}
            </p>
          ) : (
            <ul className="divide-y rounded-md border">
              {group.members.map((m) => (
                <li
                  key={m.userUniqueId}
                  className="flex items-center gap-3 px-3 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{m.fullName}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {m.email} · {m.departmentName}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("common.remove", "Remove")}
                    onClick={() =>
                      saveMembers(
                        memberIds.filter((id) => id !== m.userUniqueId)
                      )
                    }
                  >
                    <Trash2Icon />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("groups.roles", "Roles held by the group")}</CardTitle>
          <CardDescription>
            {t(
              "groups.roles_hint",
              "Every member gets these roles' permissions. Store and department roles are assigned to users directly."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {roles.map((r) => (
              <label
                key={r.uniqueId}
                className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
              >
                <Checkbox
                  checked={roleIds.has(r.uniqueId)}
                  onCheckedChange={(v) =>
                    setRoleIds((prev) => {
                      const next = new Set(prev)
                      if (v === true) next.add(r.uniqueId)
                      else next.delete(r.uniqueId)
                      return next
                    })
                  }
                />
                {r.name}
              </label>
            ))}
          </div>
          <Button
            disabled={!rolesDirty}
            onClick={() =>
              run(
                () => setGroupRoles(group.uniqueId, [...roleIds]),
                t("common.saved", "Saved")
              ).then((ok) => {
                if (ok) void onChanged()
              })
            }
          >
            {t("groups.save_roles", "Save roles")}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function CreateGroupDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (g: UserGroup) => void
}) {
  const { t } = useTranslation()
  const run = useRun()
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("groups.new", "New group")}</DialogTitle>
          <DialogDescription>
            {t(
              "groups.code_hint",
              "The code is a stable reference used by approval chains (e.g. STORE_MANAGERS)."
            )}
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="ng-code">
              {t("common.code", "Code")}
            </FieldLabel>
            <Input
              id="ng-code"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.toUpperCase().replace(/\s+/g, "_"))
              }
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="ng-name">
              {t("common.name", "Name")}
            </FieldLabel>
            <Input
              id="ng-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="ng-desc">
              {t("common.description", "Description")}
            </FieldLabel>
            <Textarea
              id="ng-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("actions.cancel", "Cancel")}
          </Button>
          <Button
            disabled={code.length < 2 || name.trim().length < 2}
            onClick={async () => {
              let created: UserGroup | null = null
              const ok = await run(
                async () => {
                  created = await createGroup({
                    code,
                    name: name.trim(),
                    description: description || undefined,
                  })
                },
                t("common.saved", "Saved")
              )
              if (ok && created) onCreated(created)
            }}
          >
            {t("common.create", "Create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default GroupsPage
