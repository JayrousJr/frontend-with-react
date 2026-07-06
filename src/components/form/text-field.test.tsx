// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { TextField } from "./text-field"

/**
 * Reference component test for the form pattern (see README "Forms").
 * Renders a minimal real form around TextField — react-hook-form and zod
 * are exercised for real, nothing is mocked.
 */

const schema = z.object({
  email: z.email("Enter a valid email address"),
})

function TestForm({ onValid }: { onValid?: (email: string) => void }) {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  })
  return (
    <form onSubmit={form.handleSubmit((values) => onValid?.(values.email))}>
      <TextField
        control={form.control}
        name="email"
        label="Email"
        placeholder="you@example.com"
      />
      <button type="submit">Submit</button>
    </form>
  )
}

describe("TextField", () => {
  it("renders a labelled input", () => {
    render(<TestForm />)
    const input = screen.getByLabelText("Email")
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute("placeholder", "you@example.com")
  })

  it("shows the zod message on invalid submit and marks the input invalid", async () => {
    const user = userEvent.setup()
    render(<TestForm />)

    await user.click(screen.getByRole("button", { name: "Submit" }))

    expect(
      await screen.findByText("Enter a valid email address")
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "aria-invalid",
      "true"
    )
  })

  it("clears the error once the value becomes valid", async () => {
    const user = userEvent.setup()
    render(<TestForm />)

    await user.click(screen.getByRole("button", { name: "Submit" }))
    await screen.findByText("Enter a valid email address")

    await user.type(screen.getByLabelText("Email"), "john@example.com")
    await user.click(screen.getByRole("button", { name: "Submit" }))

    expect(
      screen.queryByText("Enter a valid email address")
    ).not.toBeInTheDocument()
  })

  it("submits the typed value", async () => {
    const user = userEvent.setup()
    let submitted: string | undefined
    render(<TestForm onValid={(email) => (submitted = email)} />)

    await user.type(screen.getByLabelText("Email"), "john@example.com")
    await user.click(screen.getByRole("button", { name: "Submit" }))

    expect(await screen.findByLabelText("Email")).toHaveValue(
      "john@example.com"
    )
    expect(submitted).toBe("john@example.com")
  })
})
