import { test, expect } from "@playwright/test";

test.describe("staff mobile navigation", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("admin bottom tabs and More sheet expose dialog semantics", async ({ page }) => {
    await page.goto("/admin");
    const nav = page.getByRole("navigation", { name: "Admin navigation" });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "Home" })).toBeVisible();

    await page.getByRole("button", { name: "More navigation" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("More")).toBeVisible();
  });
});
