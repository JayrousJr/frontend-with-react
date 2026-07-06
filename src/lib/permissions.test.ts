import { describe, expect, it } from "vitest"
import {
  PERMISSIONS,
  hasPermission,
  hasEveryPermission,
  groupPermissionsByDomain,
} from "./permissions"
import type { User } from "@/context/auth-context"

function makeUser(overrides: Partial<User> = {}): User {
  return {
    uniqueId: "u1",
    email: "user@example.com",
    firstName: "Test",
    lastName: "User",
    role: "user",
    permissions: [],
    preferredLocale: "en",
    ...overrides,
  } as User
}

describe("hasPermission", () => {
  it("denies when there is no user", () => {
    expect(hasPermission(null, PERMISSIONS.USERS.READ)).toBe(false)
  })

  it("bypasses the check entirely for admins, mirroring the backend guard", () => {
    const admin = makeUser({ role: "admin", permissions: [] })
    expect(hasPermission(admin, PERMISSIONS.ROLES.MANAGE)).toBe(true)
  })

  it("grants when the permission is present", () => {
    const user = makeUser({ permissions: [PERMISSIONS.USERS.READ] })
    expect(hasPermission(user, PERMISSIONS.USERS.READ)).toBe(true)
  })

  it("denies when the permission is missing", () => {
    const user = makeUser({ permissions: [PERMISSIONS.USERS.READ] })
    expect(hasPermission(user, PERMISSIONS.USERS.DELETE)).toBe(false)
  })
})

describe("hasEveryPermission", () => {
  it("requires all listed permissions (AND, not OR)", () => {
    const user = makeUser({ permissions: [PERMISSIONS.ROLES.READ] })
    expect(
      hasEveryPermission(user, [
        PERMISSIONS.ROLES.READ,
        PERMISSIONS.PERMISSIONS.READ,
      ])
    ).toBe(false)
  })

  it("passes an empty requirement list", () => {
    expect(hasEveryPermission(makeUser(), [])).toBe(true)
  })
})

describe("groupPermissionsByDomain", () => {
  it("groups by the dot-prefixed domain", () => {
    const grouped = groupPermissionsByDomain([
      { name: "users.read" },
      { name: "users.delete" },
      { name: "roles.manage" },
    ])
    expect(grouped.users).toHaveLength(2)
    expect(grouped.roles).toHaveLength(1)
  })
})
