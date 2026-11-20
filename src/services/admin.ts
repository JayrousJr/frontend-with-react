import { gql } from "./api"
import { PAGE_FIELDS, type Page, type PageInput } from "./types"

export type PolicySetting = {
  code: string
  category: "SOD" | "SECURITY"
  description: string
  enabled: boolean
  /** JSON string */
  parameters: string | null
  version: number
  updatedAt: string
}

export async function fetchPolicySettings(): Promise<PolicySetting[]> {
  const data = await gql<{ policySettings: PolicySetting[] }>(
    `{ policySettings { code category description enabled parameters version updatedAt } }`
  )
  return data.policySettings
}

export async function updatePolicySetting(input: {
  code: string
  enabled?: boolean
  parameters?: string
}): Promise<PolicySetting> {
  const data = await gql<{ updatePolicySetting: PolicySetting }>(
    `mutation($input: UpdatePolicySettingInput!) {
      updatePolicySetting(input: $input) { code category description enabled parameters version updatedAt }
    }`,
    { input }
  )
  return data.updatePolicySetting
}

export type AuditEntry = {
  id: string
  at: string
  actor: { uniqueId: string; email: string; fullName: string } | null
  onBehalfOf: { uniqueId: string; email: string; fullName: string } | null
  action: string
  entityType: string
  entityId: string | null
  before: string | null
  after: string | null
  ipAddress: string | null
}

export type AuditFilter = {
  entityType?: string
  entityId?: string
  action?: string
  actorUniqueId?: string
  at?: { from?: string; to?: string }
}

export async function fetchAuditLog(
  filter: AuditFilter = {},
  pagination: PageInput = {}
): Promise<Page<AuditEntry>> {
  const data = await gql<{ auditLog: Page<AuditEntry> }>(
    `query($f: AuditFilterInput, $p: PaginationInput) {
      auditLog(filter: $f, pagination: $p) {
        data {
          id at action entityType entityId before after ipAddress
          actor { uniqueId email fullName }
          onBehalfOf { uniqueId email fullName }
        }
        ${PAGE_FIELDS}
      }
    }`,
    { f: filter, p: pagination }
  )
  return data.auditLog
}
