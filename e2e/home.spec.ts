import { test, expect } from "@playwright/test"

test.describe("Landing page", () => {
  test("shows the brand, tagline, and primary CTA", async ({ page }) => {
    await page.goto("/")

    // Hero heading + supporting line (current "Candor" copy).
    await expect(page.getByRole("heading", { name: /real growth\./i })).toBeVisible()
    await expect(page.getByText(/turns it into an AI growth plan/i)).toBeVisible()

    // Navbar brand link and the primary hero CTA (both unique on the page).
    await expect(page.getByRole("link", { name: "Candor" })).toBeVisible()
    await expect(page.getByRole("button", { name: /get your link/i })).toBeVisible()
  })
})
