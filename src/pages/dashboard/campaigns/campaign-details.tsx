import { useEffect, useState } from "react"
import { Link, useLoaderData, useParams } from "react-router"
import { useTranslation } from "react-i18next"
import type { ColumnDef } from "@tanstack/react-table"
import { ArrowLeftIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import { ROUTES } from "@/routes/routeConstants"
import { formatDateTime } from "@/lib/format"
import {
  fetchCampaignRecipients,
  type Campaign,
  type CampaignRecipient,
  type CampaignRecipientStatus,
  type CampaignStatus,
} from "@/services/campaigns"

type LoaderData = {
  campaign: Campaign
}

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

const RECIPIENT_STATUSES: CampaignRecipientStatus[] = [
  "PENDING",
  "QUEUED",
  "SENT",
  "FAILED",
]

const RECIPIENT_STATUS_VARIANTS: Record<
  CampaignRecipientStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  PENDING: "outline",
  QUEUED: "secondary",
  SENT: "default",
  FAILED: "destructive",
}

type RecipientsState = {
  data: CampaignRecipient[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

const CampaignDetailsPage = () => {
  const { t } = useTranslation()
  const { uniqueId } = useParams()
  const { campaign } = useLoaderData() as LoaderData

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [status, setStatus] = useState("")
  const [loaded, setLoaded] = useState<{
    key: string
    recipients: RecipientsState
  } | null>(null)

  const requestKey = `${uniqueId}:${page}:${limit}:${status}`
  const isLoading = loaded?.key !== requestKey
  const recipients = loaded?.key === requestKey ? loaded.recipients : null

  useEffect(() => {
    let cancelled = false
    fetchCampaignRecipients(
      uniqueId!,
      { page, limit },
      { status: (status as CampaignRecipientStatus) || undefined }
    ).then((result) => {
      if (!cancelled) setLoaded({ key: requestKey, recipients: result })
    })
    return () => {
      cancelled = true
    }
  }, [uniqueId, page, limit, status, requestKey])

  const columns: ColumnDef<CampaignRecipient>[] = [
    {
      id: "name",
      header: t("campaignDetails.recipient"),
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.subscriberFirstName} {row.original.subscriberLastName}
        </span>
      ),
    },
    {
      accessorKey: "subscriberEmail",
      header: t("campaignDetails.email"),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.subscriberEmail}
        </span>
      ),
    },
    {
      id: "status",
      header: t("campaignDetails.delivery_status"),
      cell: ({ row }) => (
        <Badge variant={RECIPIENT_STATUS_VARIANTS[row.original.status]}>
          {t(
            `campaignDetails.recipient_statuses.${row.original.status.toLowerCase()}`
          )}
        </Badge>
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
    {
      id: "error",
      header: t("campaignDetails.error"),
      cell: ({ row }) =>
        row.original.error ? (
          <span className="text-destructive">{row.original.error}</span>
        ) : (
          "—"
        ),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link to={ROUTES.CAMPAIGNS}>
            <ArrowLeftIcon className="size-4" />
            {t("campaignDetails.back_to_campaigns")}
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {campaign.subject}
          </h1>
          <Badge variant={STATUS_VARIANTS[campaign.status]}>
            {t(`campaignsPage.statuses.${campaign.status.toLowerCase()}`)}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("campaignDetails.content_title")}</CardTitle>
          <CardDescription>
            {campaign.scheduledAt &&
              t("campaignsPage.scheduled_at") +
                ": " +
                formatDateTime(campaign.scheduledAt)}
            {campaign.sentAt &&
              (campaign.scheduledAt ? " · " : "") +
                t("campaignsPage.sent_at") +
                ": " +
                formatDateTime(campaign.sentAt)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="prose max-w-none text-sm"
            dangerouslySetInnerHTML={{ __html: campaign.bodyHtml }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("campaignDetails.recipients_title")}</CardTitle>
          <CardDescription>
            {t("campaignsPage.total_recipients", {
              count: recipients?.total ?? campaign.recipientCount ?? 0,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={recipients?.data ?? []}
            total={recipients?.total ?? 0}
            page={recipients?.page ?? page}
            pageSize={recipients?.limit ?? limit}
            isLoading={isLoading}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setLimit(size)
              setPage(1)
            }}
            filters={[
              {
                key: "status",
                label: t("campaignDetails.delivery_status"),
                options: RECIPIENT_STATUSES.map((s) => ({
                  label: t(
                    `campaignDetails.recipient_statuses.${s.toLowerCase()}`
                  ),
                  value: s,
                })),
              },
            ]}
            activeFilters={{ status }}
            onFilterChange={(_key, value) => {
              setStatus(value)
              setPage(1)
            }}
            onClearFilters={() => {
              setStatus("")
              setPage(1)
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default CampaignDetailsPage
