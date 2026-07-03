import { test, expect } from "@playwright/test"

test.describe("Sign-up validation (client-side)", () => {
  test("rejects mismatched passwords without hitting the backend", async ({ page }) => {
    await page.goto("/sign-up")

    await expect(page.getByRole("heading", { name: /join candor/i })).toBeVisible()

    await page.getByLabel("Username").fill("testuser")
    await page.getByLabel("Email").fill("test@example.com")
    await page.getByLabel("Password", { exact: true }).fill("Str0ng!Pass")
    await page.getByLabel("Confirm Password").fill("Different1!")

    await page.getByRole("button", { name: /signup/i }).click()

    await expect(page.getByText(/passwords do not match/i)).toBeVisible()
  })
})

test.describe("Sign-in page", () => {
  test("renders the guest login shortcut", async ({ page }) => {
    await page.goto("/sign-in")

    await expect(page.getByRole("heading", { name: /welcome back to candor/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /guest login/i })).toBeVisible()
  })
})

test.describe("Public message page", () => {
  test("keeps Send disabled until a message is typed", async ({ page }) => {
    await page.goto("/user/someone")

    await expect(page.getByText(/send anonymous message to @someone/i)).toBeVisible()
    await expect(page.getByRole("button", { name: /send it/i })).toBeDisabled()

    await page.getByPlaceholder(/write your anonymous message here/i).fill("Hello there!")
    await expect(page.getByRole("button", { name: /send it/i })).toBeEnabled()
  })
})
