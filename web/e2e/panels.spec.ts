import { expect, test, type Locator, type Page } from "@playwright/test";
import { addArtist, mockApis } from "./mocks";

/** Le contenu tient entièrement dans l'écran. */
async function expectInViewport(page: Page, locator: Locator): Promise<void> {
  const box = (await locator.boundingBox())!;
  const { width, height } = page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width);
  expect(box.y + box.height).toBeLessThanOrEqual(height);
}

test.describe("panneaux « furzr » et « Partager »", () => {
  test("mobile : fenêtres flottantes, une à la fois", async ({ page, isMobile }) => {
    test.skip(!isMobile, "fenêtres flottantes : petit écran seulement");
    await mockApis(page);
    await page.goto("./");
    await addArtist(page, "Alpha");
    const about = page.locator("#about");
    const share = page.locator("#share");
    const aboutContent = about.locator(".drawer-content");
    const shareContent = share.locator(".drawer-content");
    await expect(aboutContent).toBeHidden();
    await expect(shareContent).toBeHidden();

    // « furzr » : fenêtre centrée, focus sur ×, fermée par ×
    await about.locator(".drawer-tab").tap();
    await expect(aboutContent).toBeVisible();
    await expectInViewport(page, aboutContent);
    await expect(about.locator(".drawer-close")).toBeFocused();
    await about.locator(".drawer-close").tap();
    await expect(aboutContent).toBeHidden();
    await expect(about.locator(".drawer-tab")).toBeFocused();

    // « Partager » : fermée par un toucher sur le voile
    await share.getByRole("button", { name: "Share this map" }).tap();
    await expect(shareContent).toBeVisible();
    await expectInViewport(page, shareContent);
    await page.touchscreen.tap(20, page.viewportSize()!.height - 20);
    await expect(shareContent).toBeHidden();

    // une seule fenêtre à la fois ; Échap ferme
    await about.locator(".drawer-tab").tap();
    await expect(aboutContent).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(aboutContent).toBeHidden();
    await share.locator(".drawer-tab").tap();
    await expect(shareContent).toBeVisible();
    await expect(aboutContent).toBeHidden();
  });

  test("desktop : volets latéraux inchangés", async ({ page, isMobile }) => {
    test.skip(isMobile, "volets : desktop seulement");
    await mockApis(page);
    await page.goto("./");
    await addArtist(page, "Alpha");
    const about = page.locator("#about");
    await expect(about.locator(".drawer-close")).toBeHidden();
    await about.locator(".drawer-tab").hover();
    await expect(about).toHaveClass(/hovered/);
    await expect(about.locator(".drawer-content")).toBeInViewport();
  });
});
