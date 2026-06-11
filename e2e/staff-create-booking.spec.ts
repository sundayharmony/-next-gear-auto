import { test, expect } from "@playwright/test";

test.describe("staff create booking shell", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.skip(!process.env.PLAYWRIGHT_STAFF_EMAIL, "Set PLAYWRIGHT_STAFF_EMAIL/PASSWORD for authenticated smoke");

  test("calendar exposes New Booking on mobile", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(process.env.PLAYWRIGHT_STAFF_EMAIL!);
    await page.getByLabel(/password/i).fill(process.env.PLAYWRIGHT_STAFF_PASSWORD || "");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.goto("/admin/calendar");
    await expect(page.getByRole("button", { name: /new booking/i })).toBeVisible();
  });
});
