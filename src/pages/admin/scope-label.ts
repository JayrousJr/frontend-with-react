import type { TFunction } from "i18next"
import type { Scope } from "@/context/auth-context"

const DEFAULTS: Record<Scope, [label: string, hint: string]> = {
  ALL: ["All records", "Every record in the company"],
  OWN_DEPARTMENT: [
    "Own department",
    "Records of the user's department and its sections",
  ],
  OWN_RECORDS: ["Own records", "Records the user created or is the subject of"],
  ASSIGNED: [
    "Assigned",
    "Records the user is assigned to (committee, inspection, approval task)",
  ],
  ASSIGNED_STORE: ["Assigned stores", "Stores given as the role's context"],
  ASSIGNED_PRODUCTION: [
    "Assigned productions",
    "Productions where the user is producer or crew",
  ],
  OWN_VENDOR: ["Own vendor", "Vendor portal only"],
}

export const SCOPES = Object.keys(DEFAULTS) as Scope[]

export function scopeLabel(t: TFunction, scope: Scope): string {
  return t(`scope.${scope}`, DEFAULTS[scope][0])
}

export function scopeHint(t: TFunction, scope: Scope): string {
  return t(`scope.${scope}_hint`, DEFAULTS[scope][1])
}
