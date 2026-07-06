import { describe, expect, it } from "vitest"
import type { TFunction } from "i18next"
import { createLoginSchema, createRegisterSchema } from "./auth"

// Schemas only pass keys/params through to `t` — echo them for assertions.
const t = ((key: string) => key) as TFunction

const validRegistration = {
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  password: "Password123!",
  confirmPassword: "Password123!",
}

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

describe("createRegisterSchema", () => {
  const schema = createRegisterSchema(t)

  it("accepts a valid registration", () => {
    expect(schema.safeParse(validRegistration).success).toBe(true)
  })

  it("enforces the backend's 8-character password minimum", () => {
    const result = schema.safeParse({
      ...validRegistration,
      password: "short",
      confirmPassword: "short",
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe("validation.password_min")
  })

  it("attaches the mismatch error to confirmPassword", () => {
    const result = schema.safeParse({
      ...validRegistration,
      confirmPassword: "Different123!",
    })
    expect(result.success).toBe(false)
    const issue = result.error?.issues[0]
    expect(issue?.path).toEqual(["confirmPassword"])
    expect(issue?.message).toBe("auth.passwords_no_match")
  })

  it("requires first and last name", () => {
    const result = schema.safeParse({
      ...validRegistration,
      firstName: "",
      lastName: "",
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues).toHaveLength(2)
  })
})
