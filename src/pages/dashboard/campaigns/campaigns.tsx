import { useState } from "react"
import {
  Link,
  useLoaderData,
  useNavigation,
  useRevalidator,
  useSearchParams,
} from "react-router"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import type { ColumnDef } from "@tanstack/react-table"
import {
  CalendarClockIcon,
  PencilIcon,
  PlusIcon,
  SendIcon,
  Trash2Icon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useAuth } from "@/context/auth-context"
import { PERMISSIONS, hasPermission } from "@/lib/permissions"
import { ROUTES } from "@/routes/routeConstants"
import { formatDateTime } from "@/lib/format"
import {
  createCampaign,
  updateCampaign,
  deleteCampaign,
  sendCampaign,
  scheduleCampaign,
  type Campaign,
  type CampaignStatus,
} from "@/services/campaigns"

type LoaderData = {
  campaigns: {
    data: Campaign[]
    total: number
    page: number
    limit: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

const CAMPAIGN_STATUSES: CampaignStatus[] = [
  "DRAFT",
  "SCHEDULED",
  "SENDING",
  "SENT",
  "FAILED",
]

const STATUS_VARIANTS: Record<
  CampaignStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  DRAFT: "outline",
  SCHEDULED: "secondary",
  SENDING: "secondary",
  SENT: "default",
  FAILED: "destructive",
}

const CampaignsPage = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { campaigns } = useLoaderData() as LoaderData
  const revalidator = useRevalidator()
  const navigation = useNavigation()
  const [searchParams, setSearchParams] = useSearchParams()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Campaign | null>(null)
  const [deleting, setDeleting] = useState<Campaign | null>(null)
  const [sending, setSending] = useState<Campaign | null>(null)
  const [scheduling, setScheduling] = useState<Campaign | null>(null)

  const canManage = hasPermission(user, PERMISSIONS.CAMPAIGNS.MANAGE)

  const updateParams = (patch: Record<string, string>) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [key, value] of Object.entries(patch)) {
        if (value) next.set(key, value)
        else next.delete(key)
      }
      return next
    })

  function openCreate() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(campaign: Campaign) {
    setEditing(campaign)
    setDialogOpen(true)
  }

  async function handleDelete() {
    if (!deleting) return
    try {
      const message = await deleteCampaign(deleting.uniqueId)
      toast.success(message)
      revalidator.revalidate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("general_error"))
    } finally {
      setDeleting(null)
    }
  }

  async function handleSend() {
    if (!sending) return
    try {
      const res = await sendCampaign(sending.uniqueId)
      toast.success(res.message)
      revalidator.revalidate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("general_error"))
    } finally {
      setSending(null)
    }
  }

  const columns: ColumnDef<Campaign>[] = [
    {
      accessorKey: "subject",
      header: t("campaignsPage.subject"),
      cell: ({ row }) => (
        <Link
          to={ROUTES.CAMPAIGN_DETAILS.replace(
            ":uniqueId",
            row.original.uniqueId
          )}
          className="font-medium hover:underline"
        >
          {row.original.subject}
        </Link>
      ),
    },
    {
      id: "status",
      header: t("campaignsPage.status"),
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANTS[row.original.status]}>
          {t(`campaignsPage.statuses.${row.original.status.toLowerCase()}`)}
        </Badge>
      ),
    },
    {
      id: "recipients",
      header: t("campaignsPage.recipients"),
      cell: ({ row }) => row.original.recipientCount ?? "—",
    },
    {
      id: "scheduledAt",
      header: t("campaignsPage.scheduled_at"),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.scheduledAt
            ? formatDateTime(row.original.scheduledAt)
            : "—"}
        </span>
      ),
    },
    {
      id: "sentAt",
      header: t("campaignsPage.sent_at"),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.sentAt ? formatDateTime(row.original.sentAt) : "—"}
        </span>
      ),
    },
    ...(canManage
      ? ([
          {
            id: "actions",
            header: () => <div className="text-right">{t("rbac.actions")}</div>,
            cell: ({ row }) => {
              const campaign = row.original
              const isEditable =
                campaign.status === "DRAFT" || campaign.status === "SCHEDULED"
              return (
                <div className="text-right whitespace-nowrap">
                  {isEditable && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={t("campaignsPage.send_now")}
                        onClick={() => setSending(campaign)}
                      >
                        <SendIcon className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={t("campaignsPage.schedule")}
                        onClick={() => setScheduling(campaign)}
                      >
                        <CalendarClockIcon className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(campaign)}
                      >
                        <PencilIcon className="size-4" />
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => setDeleting(campaign)}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
              )
            },
          },
        ] satisfies ColumnDef<Campaign>[])
      : []),
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("campaignsPage.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("campaignsPage.subtitle")}
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <PlusIcon className="size-4" />
            {t("campaignsPage.new_campaign")}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("campaignsPage.title")}</CardTitle>
          <CardDescription>
            {t("campaignsPage.total", { count: campaigns.total })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={campaigns.data}
            total={campaigns.total}
            page={campaigns.page}
            pageSize={campaigns.limit}
            isLoading={navigation.state === "loading"}
            onPageChange={(page) => updateParams({ page: String(page) })}
            onPageSizeChange={(size) => updateParams({ limit: String(size) })}
            searchPlaceholder={t("campaignsPage.search_placeholder")}
            searchValue={searchParams.get("q") ?? ""}
            onSearch={(value) => updateParams({ q: value, page: "" })}
            filters={[
              {
                key: "status",
                label: t("campaignsPage.status"),
                options: CAMPAIGN_STATUSES.map((status) => ({
                  label: t(`campaignsPage.statuses.${status.toLowerCase()}`),
                  value: status,
                })),
              },
            ]}
            activeFilters={{ status: searchParams.get("status") ?? "" }}
            onFilterChange={(key, value) =>
              updateParams({ [key]: value, page: "" })
            }
            onClearFilters={() => updateParams({ q: "", status: "", page: "" })}
          />
        </CardContent>
      </Card>

      {canManage && (
        <CampaignDialog
          open={dialogOpen}
          campaign={editing}
          onClose={() => setDialogOpen(false)}
          onSaved={() => {
            setDialogOpen(false)
            revalidator.revalidate()
          }}
        />
      )}

      {canManage && (
        <ScheduleDialog
          campaign={scheduling}
          onClose={() => setScheduling(null)}
          onSaved={() => {
            setScheduling(null)
            revalidator.revalidate()
          }}
        />
      )}

      <AlertDialog
        open={sending !== null}
        onOpenChange={(open) => !open && setSending(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("campaignsPage.send_now")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("campaignsPage.send_confirm", { subject: sending?.subject })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend}>
              {t("actions.send")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("campaignsPage.delete_campaign")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("campaignsPage.delete_confirm", {
                subject: deleting?.subject,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDelete}
            >
              {t("rbac.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/** Create/edit form — remounted per open via `key` so state resets cleanly. */
function CampaignDialog({
  open,
  campaign,
  onClose,
  onSaved,
}: {
  open: boolean
  campaign: Campaign | null
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {campaign
              ? t("campaignsPage.edit_campaign")
              : t("campaignsPage.new_campaign")}
          </DialogTitle>
          <DialogDescription>
            {t("campaignsPage.dialog_text")}
          </DialogDescription>
        </DialogHeader>
        {open && (
          <CampaignForm
            key={campaign?.uniqueId ?? "new"}
            campaign={campaign}
            onSaved={onSaved}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function CampaignForm({
  campaign,
  onSaved,
  onClose,
}: {
  campaign: Campaign | null
  onSaved: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [subject, setSubject] = useState(campaign?.subject ?? "")
  const [bodyHtml, setBodyHtml] = useState(campaign?.bodyHtml ?? "")
  const [bodyText, setBodyText] = useState(campaign?.bodyText ?? "")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = campaign
        ? await updateCampaign({
            uniqueId: campaign.uniqueId,
            subject,
            bodyHtml,
            bodyText,
          })
        : await createCampaign({ subject, bodyHtml, bodyText })
      toast.success(res.message)
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("general_error"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="campaign-subject">{t("campaignsPage.subject")}</Label>
        <Input
          id="campaign-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="campaign-body-html">
          {t("campaignsPage.body_html")}
        </Label>
        <Textarea
          id="campaign-body-html"
          value={bodyHtml}
          onChange={(e) => setBodyHtml(e.target.value)}
          rows={8}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="campaign-body-text">
          {t("campaignsPage.body_text")}
        </Label>
        <Textarea
          id="campaign-body-text"
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          rows={4}
          required
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          {t("actions.cancel")}
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? t("actions.saving") : t("actions.save")}
        </Button>
      </DialogFooter>
    </form>
  )
}

function ScheduleDialog({
  campaign,
  onClose,
  onSaved,
}: {
  campaign: Campaign | null
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const [scheduledAt, setScheduledAt] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!campaign || !scheduledAt) return
    setSaving(true)
    try {
      const res = await scheduleCampaign(
        campaign.uniqueId,
        new Date(scheduledAt).toISOString()
      )
      toast.success(res.message)
      setScheduledAt("")
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("general_error"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={campaign !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("campaignsPage.schedule")}</DialogTitle>
          <DialogDescription>
            {t("campaignsPage.schedule_text", { subject: campaign?.subject })}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="campaign-scheduled-at">
              {t("campaignsPage.scheduled_at")}
            </Label>
            <Input
              id="campaign-scheduled-at"
              type="datetime-local"
              value={scheduledAt}
              min={new Date().toISOString().slice(0, 16)}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? t("actions.saving") : t("campaignsPage.schedule")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default CampaignsPage
