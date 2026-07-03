import { describe, it, expect } from "vitest"
import { passwordValidation } from "./passwordValidation"
import { signupValidationSchema } from "./signupSchema"
import { messageValidationSchema } from "./messageSchema"
import { usernameValidation } from "./usernameValidation"
import { composeSchema } from "./composeSchema"

describe("passwordValidation", () => {
  it("accepts a strong password", () => {
    expect(passwordValidation.safeParse("Str0ng!Pass").success).toBe(true)
  })

  it("rejects passwords that are too short", () => {
    expect(passwordValidation.safeParse("Ab1!").success).toBe(false)
  })

  it("rejects passwords missing a special character", () => {
    expect(passwordValidation.safeParse("Password123").success).toBe(false)
  })

  it("rejects passwords missing a number", () => {
    expect(passwordValidation.safeParse("Password!!").success).toBe(false)
  })
})

describe("signupValidationSchema", () => {
  const valid = {
    username: "yogesh_01",
    email: "user@example.com",
    password: "Str0ng!Pass",
    confirmPassword: "Str0ng!Pass",
  }

  it("accepts valid input", () => {
    expect(signupValidationSchema.safeParse(valid).success).toBe(true)
  })

  it("rejects mismatched passwords", () => {
    const result = signupValidationSchema.safeParse({
      ...valid,
      confirmPassword: "Different1!",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid email", () => {
    expect(
      signupValidationSchema.safeParse({ ...valid, email: "not-an-email" }).success
    ).toBe(false)
  })
})

describe("usernameValidation", () => {
  it("rejects special characters", () => {
    expect(usernameValidation.safeParse("bad name!").success).toBe(false)
  })

  it("accepts alphanumeric + underscore", () => {
    expect(usernameValidation.safeParse("good_name1").success).toBe(true)
  })
})

describe("messageValidationSchema", () => {
  it("rejects messages shorter than 10 chars", () => {
    expect(messageValidationSchema.safeParse({ content: "hi" }).success).toBe(false)
  })

  it("rejects messages longer than 300 chars", () => {
    expect(
      messageValidationSchema.safeParse({ content: "a".repeat(301) }).success
    ).toBe(false)
  })

  it("accepts a valid message", () => {
    expect(
      messageValidationSchema.safeParse({ content: "This is a fine message." }).success
    ).toBe(true)
  })
})

describe("composeSchema", () => {
  const valid = {
    prompt: "meetings run long and start late",
    tone: "professional",
    mood: "confident",
    length: "short",
    emojiLevel: "some",
  }

  it("accepts valid composer input", () => {
    expect(composeSchema.safeParse(valid).success).toBe(true)
  })

  it("accepts any free-form tone/mood", () => {
    expect(composeSchema.safeParse({ ...valid, tone: "luxury", mood: "nostalgic" }).success).toBe(true)
  })

  it("rejects empty thoughts", () => {
    expect(composeSchema.safeParse({ ...valid, prompt: "   " }).success).toBe(false)
  })

  it("rejects an unknown length", () => {
    expect(composeSchema.safeParse({ ...valid, length: "epic" }).success).toBe(false)
  })

  it("rejects an unknown emoji level", () => {
    expect(composeSchema.safeParse({ ...valid, emojiLevel: "tons" }).success).toBe(false)
  })
})
