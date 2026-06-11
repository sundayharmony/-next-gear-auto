import { test, expect } from "@playwright/test";

test.describe("public booking wizard", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("wizard progress exposes step labels accessibly", async ({ page }) => {
    await page.goto("/booking");
    const progress = page.locator('[aria-current="step"]').first();
    await expect(progress).toBeVisible();
    await expect(page.getByRole("button", { name: /Search|Dates|Vehicle|Details|Review/i }).first()).toBeVisible();
  });
});
