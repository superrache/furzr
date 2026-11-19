import { expect, test } from "@playwright/test";
import { addArtist, mockApis } from "./mocks";

test.describe("confirmation avant d'effacer la carte", () => {
  test("panneau centré au lieu de confirm() : Annuler garde la carte, Continuer change de mode", async ({ page }) => {
    await mockApis(page);
    // aucune boîte native ne doit s'ouvrir
    const native: string[] = [];
    page.on("dialog", (d) => {
      native.push(d.message());
      void d.dismiss();
    });
    await page.goto("./");
    await addArtist(page, "Alpha");
    const dialog = page.locator("#confirm");
    const game = page.locator('#play-switch [data-play="game"]');

    // Annuler : la carte et le mode restent
    await game.click();
    await expect(dialog).toHaveAttribute("open", "");
    await expect(page.locator("#confirm-message")).toHaveText("Switching mode clears the current map. Continue?");
    await expect(page.locator("#confirm-ok")).toBeFocused();
    const box = (await dialog.boundingBox())!;
    const { width, height } = page.viewportSize()!;
    expect(Math.abs(box.x + box.width / 2 - width / 2)).toBeLessThan(2);
    expect(Math.abs(box.y + box.height / 2 - height / 2)).toBeLessThan(2);
    await page.locator("#confirm-cancel").click();
    await expect(dialog).not.toHaveAttribute("open");
    await expect(page.locator("#game-goal")).toBeHidden();
    await expect(page.locator("#overview-name")).toHaveText("About Alpha");

    // Échap : comme Annuler
    await game.click();
    await expect(dialog).toHaveAttribute("open", "");
    await page.keyboard.press("Escape");
    await expect(dialog).not.toHaveAttribute("open");
    await expect(page.locator("#game-goal")).toBeHidden();

    // Continuer : passage en mode jeu
    await game.click();
    await page.locator("#confirm-ok").click();
    await expect(dialog).not.toHaveAttribute("open");
    await expect(page.locator("#game-goal")).toBeVisible();
    expect(native).toEqual([]);
  });
});
