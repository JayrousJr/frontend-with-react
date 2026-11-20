import { describe, expect, it } from "vitest"
import type { TFunction } from "i18next"
import { createLoginSchema, createNewPasswordSchema } from "./auth"

// Schemas only pass keys/params through to `t` — echo them for assertions.
const t = ((key: string) => key) as TFunction

describe("createLoginSchema", () => {
  const schema = createLoginSchema(t)

  it("accepts valid credentials", () => {
    const result = schema.safeParse({
      email: "john@example.com",
      password: "x",
    })
    expect(result.success).toBe(true)
  })

  it("rejects a malformed email", () => {
    const result = schema.safeParse({ email: "not-an-email", password: "x" })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe("validation.email")
  })

  it("rejects an empty password", () => {
    const result = schema.safeParse({
      email: "john@example.com",
      password: "",
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe("validation.required")
  })
})

describe("createNewPasswordSchema", () => {
  const schema = createNewPasswordSchema(t)

  it("accepts a policy-compliant password", () => {
    const r = schema.safeParse({
      password: "Kilimanjaro-77x",
      confirmPassword: "Kilimanjaro-77x",
    })
    expect(r.success).toBe(true)
  })

  it("requires 10 characters", () => {
    const r = schema.safeParse({
      password: "Abc12345",
      confirmPassword: "Abc12345",
    })
    expect(r.success).toBe(false)
  })

  it("requires letters and numbers", () => {
    const r = schema.safeParse({
      password: "onlyletterspass",
      confirmPassword: "onlyletterspass",
    })
    expect(r.success).toBe(false)
  })

  it("requires the confirmation to match", () => {
    const r = schema.safeParse({
      password: "Kilimanjaro-77x",
      confirmPassword: "Kilimanjaro-77y",
    })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].path).toEqual(["confirmPassword"])
  })
})
