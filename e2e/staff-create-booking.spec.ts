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

  test("create booking sheet has single close control", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(process.env.PLAYWRIGHT_STAFF_EMAIL!);
    await page.getByLabel(/password/i).fill(process.env.PLAYWRIGHT_STAFF_PASSWORD || "");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.goto("/admin/bookings");
    await page.getByRole("button", { name: /new booking/i }).click();
    await expect(page.getByRole("heading", { name: /new booking/i })).toBeVisible();
    const closeButtons = page.getByRole("button", { name: /^close$/i });
    await expect(closeButtons).toHaveCount(1);
    await expect(page).toHaveScreenshot("create-booking-sheet-mobile.png", {
      maxDiffPixelRatio: 0.08,
    });
  });
});
