import { gql } from "./api"
import { GET_CAMPAIGNS, GET_CAMPAIGN, GET_CAMPAIGN_RECIPIENTS } from "./queries"
import {
  CREATE_CAMPAIGN,
  UPDATE_CAMPAIGN,
  DELETE_CAMPAIGN,
  SEND_CAMPAIGN,
  SCHEDULE_CAMPAIGN,
} from "./mutations"

// Types

export type CampaignStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "SENDING"
  | "SENT"
  | "FAILED"

export type Campaign = {
  uniqueId: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  subject: string
  bodyHtml: string
  bodyText: string
  status: CampaignStatus
  scheduledAt: string | null
  sentAt: string | null
  recipientCount: number | null
}

type PaginatedResponse<T> = {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

type PaginationInput = {
  page?: number
  limit?: number
}

type CampaignFilterInput = {
  subject?: string
  status?: CampaignStatus
  isActive?: boolean
}

export type CampaignRecipientStatus = "PENDING" | "QUEUED" | "SENT" | "FAILED"

export type CampaignRecipient = {
  uniqueId: string
  status: CampaignRecipientStatus
  sentAt: string | null
  error: string | null
  subscriberEmail: string
  subscriberFirstName: string
  subscriberLastName: string
}

type CampaignRecipientFilterInput = {
  status?: CampaignRecipientStatus
}

// Queries — both require "campaigns.read"

export async function fetchCampaigns(
  pagination?: PaginationInput,
  filter?: CampaignFilterInput
): Promise<PaginatedResponse<Campaign>> {
  const data = await gql<
    { getCampaigns: PaginatedResponse<Campaign> },
    { pagination?: PaginationInput; filter?: CampaignFilterInput }
  >(GET_CAMPAIGNS, { pagination, filter })
  return data.getCampaigns
}

export async function fetchCampaign(uniqueId: string): Promise<Campaign> {
  const data = await gql<{ getCampaign: Campaign }, { uniqueId: string }>(
    GET_CAMPAIGN,
    { uniqueId }
  )
  return data.getCampaign
}

export async function fetchCampaignRecipients(
  campaignUniqueId: string,
  pagination?: PaginationInput,
  filter?: CampaignRecipientFilterInput
): Promise<PaginatedResponse<CampaignRecipient>> {
  const data = await gql<
    { getCampaignRecipients: PaginatedResponse<CampaignRecipient> },
    {
      campaignUniqueId: string
      pagination?: PaginationInput
      filter?: CampaignRecipientFilterInput
    }
  >(GET_CAMPAIGN_RECIPIENTS, { campaignUniqueId, pagination, filter })
  return data.getCampaignRecipients
}

// Mutations — all require "campaigns.manage"

type CampaignMutationResponse = {
  message: string
  data: Partial<Campaign> & { uniqueId: string }
}

export type CreateCampaignInput = {
  subject: string
  bodyHtml: string
  bodyText: string
}

export type UpdateCampaignInput = {
  uniqueId: string
  subject?: string
  bodyHtml?: string
  bodyText?: string
}

export async function createCampaign(
  input: CreateCampaignInput
): Promise<CampaignMutationResponse> {
  const data = await gql<
    { createCampaign: CampaignMutationResponse },
    { input: CreateCampaignInput }
  >(CREATE_CAMPAIGN, { input })
  return data.createCampaign
}

export async function updateCampaign(
  input: UpdateCampaignInput
): Promise<CampaignMutationResponse> {
  const data = await gql<
    { updateCampaign: CampaignMutationResponse },
    { input: UpdateCampaignInput }
  >(UPDATE_CAMPAIGN, { input })
  return data.updateCampaign
}

export async function deleteCampaign(uniqueId: string): Promise<string> {
  const data = await gql<
    { deleteCampaign: { message: string } },
    { uniqueId: string }
  >(DELETE_CAMPAIGN, { uniqueId })
  return data.deleteCampaign.message
}

export async function sendCampaign(
  uniqueId: string
): Promise<CampaignMutationResponse> {
  const data = await gql<
    { sendCampaign: CampaignMutationResponse },
    { uniqueId: string }
  >(SEND_CAMPAIGN, { uniqueId })
  return data.sendCampaign
}

export async function scheduleCampaign(
  uniqueId: string,
  scheduledAt: string
): Promise<CampaignMutationResponse> {
  const data = await gql<
    { scheduleCampaign: CampaignMutationResponse },
    { input: { uniqueId: string; scheduledAt: string } }
  >(SCHEDULE_CAMPAIGN, { input: { uniqueId, scheduledAt } })
  return data.scheduleCampaign
}
