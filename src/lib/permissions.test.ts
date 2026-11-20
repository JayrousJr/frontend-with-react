import { describe, expect, it } from "vitest"
import {
  P,
  hasAnyPermission,
  hasEveryPermission,
  hasPermission,
  scopesFor,
} from "./permissions"
import type { User } from "@/context/auth-context"

function makeUser(overrides: Partial<User> = {}): User {
  return {
    uniqueId: "u1",
    email: "user@azamtv.co.tz",
    fullName: "Test User",
    employeeUniqueId: "e1",
    employeeNumber: "AZ0001",
    department: { uniqueId: "d1", code: "ICT", name: "ICT" },
    jobTitle: "Officer",
    roles: [
      {
        roleUniqueId: "r1",
        roleName: "System Administrator",
        contextName: null,
      },
    ],
    permissions: [],
    grants: [],
    preferredLocale: "en",
    ...overrides,
  }
}

describe("hasPermission", () => {
  it("denies when there is no user", () => {
    expect(hasPermission(null, P.USER_VIEW)).toBe(false)
  })

  it("never bypasses on a role name", () => {
    const admin = makeUser({ permissions: [] })
    expect(hasPermission(admin, P.ROLE_MANAGE)).toBe(false)
  })

  it("allows when the permission is held", () => {
    const u = makeUser({ permissions: [P.EMPLOYEE_VIEW] })
    expect(hasPermission(u, P.EMPLOYEE_VIEW)).toBe(true)
  })
})

describe("hasEveryPermission / hasAnyPermission", () => {
  const u = makeUser({ permissions: [P.USER_VIEW, P.USER_MANAGE] })

  it("requires all for every", () => {
    expect(hasEveryPermission(u, [P.USER_VIEW, P.USER_MANAGE])).toBe(true)
    expect(hasEveryPermission(u, [P.USER_VIEW, P.ROLE_MANAGE])).toBe(false)
    expect(hasEveryPermission(u, [])).toBe(true)
  })

  it("requires one for any", () => {
    expect(hasAnyPermission(u, [P.ROLE_MANAGE, P.USER_VIEW])).toBe(true)
    expect(hasAnyPermission(u, [P.ROLE_MANAGE])).toBe(false)
  })
})

describe("scopesFor", () => {
  it("lists distinct scopes held for a permission", () => {
    const u = makeUser({
      grants: [
        {
          permission: P.EMPLOYEE_VIEW,
          scope: "OWN_DEPARTMENT",
          contextType: null,
          contextId: null,
          delegated: false,
        },
        {
          permission: P.EMPLOYEE_VIEW,
          scope: "OWN_DEPARTMENT",
          contextType: null,
          contextId: null,
          delegated: true,
        },
        {
          permission: P.AUDIT_VIEW,
          scope: "ALL",
          contextType: null,
          contextId: null,
          delegated: false,
        },
      ],
    })
    expect(scopesFor(u, P.EMPLOYEE_VIEW)).toEqual(["OWN_DEPARTMENT"])
  })
})
