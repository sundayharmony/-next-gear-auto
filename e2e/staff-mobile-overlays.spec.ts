import { test, expect } from "@playwright/test";

test.describe("staff mobile overlays", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("login page renders without layout overlap", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    await expect(page).toHaveScreenshot("login-mobile.png", {
      maxDiffPixelRatio: 0.05,
    });
  });

  test.skip(!process.env.PLAYWRIGHT_STAFF_EMAIL, "Set PLAYWRIGHT_STAFF_EMAIL/PASSWORD for authenticated smoke");

  test("bookings page mobile chrome", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(process.env.PLAYWRIGHT_STAFF_EMAIL!);
    await page.getByLabel(/password/i).fill(process.env.PLAYWRIGHT_STAFF_PASSWORD || "");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.goto("/admin/bookings");
    await expect(page.getByRole("heading", { name: /bookings/i })).toBeVisible();
    await expect(page).toHaveScreenshot("bookings-mobile.png", {
      maxDiffPixelRatio: 0.08,
    });
  });

  test("customers list mobile chrome", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(process.env.PLAYWRIGHT_STAFF_EMAIL!);
    await page.getByLabel(/password/i).fill(process.env.PLAYWRIGHT_STAFF_PASSWORD || "");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.goto("/admin/customers");
    await expect(page.getByRole("heading", { name: /customers/i })).toBeVisible();
    await expect(page).toHaveScreenshot("customers-mobile.png", {
      maxDiffPixelRatio: 0.08,
    });
  });
});
