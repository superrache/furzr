import { expect, test, type Page } from "@playwright/test";
import { clickSomeNode, collectErrors, mockApis } from "./mocks";

/** Défi imposé par l'URL ; la cible apparaît dès le premier artiste exploré. */
async function startChallenge(page: Page): Promise<void> {
  await mockApis(page, { target: "Omega" });
  await page.goto("./?mode=game&from=Alpha&to=Omega");
  const bar = page.locator("#game-goal");
  await expect(bar).toContainText("Alpha → Omega");
  // difficulté estimée en arrière-plan : la cible est à deux liens, c'est « Facile »
  await expect(bar).toContainText("Difficulty: Easy");
  await expect(bar).toContainText("Clicks: 0");
}

test.describe("mode jeu", () => {
  test("victoire : la carte d'abord, puis la fenêtre", async ({ page }) => {
    const errors = collectErrors(page);
    await startChallenge(page);
    const dialog = page.locator("#victory");

    await clickSomeNode(page);
    const wonAt = Date.now();
    // célébration sur la carte : confettis dans la page, pas encore de fenêtre
    await expect(page.locator("body > #confetti")).toBeAttached();
    await expect(dialog).not.toHaveAttribute("open");
    await expect(dialog).toHaveAttribute("open", "", { timeout: 6000 });
    expect(Date.now() - wonAt).toBeGreaterThan(1500);
    // les confettis passent dans la fenêtre, au-dessus de son voile
    await expect(page.locator("#victory > #confetti")).toBeAttached();

    await expect(page.locator("#victory-title")).toHaveText("Perfect!");
    await expect(page.locator("#victory-path .chip").first()).toHaveText("Alpha");
    await expect(page.locator("#victory-path .chip").last()).toHaveText("Omega");
    await expect(page.locator("#victory-score")).toHaveText("1000");
    await expect(page.locator("#victory-share")).toBeFocused();

    // « Voir la carte » ferme ; « Résultat » rouvre sans relancer le score
    await page.locator("#victory-map").click();
    await expect(dialog).not.toHaveAttribute("open");
    await expect(page.locator("body > #confetti")).toBeAttached();
    const result = page.locator("#game-goal .result-button");
    await expect(result).toHaveText("Result");
    await expect(page.locator("#game-goal")).toContainText("Score: 1000");
    await result.click();
    await expect(dialog).toHaveAttribute("open", "");
    await expect(page.locator("#victory-score")).toHaveText("1000");
    await page.keyboard.press("Escape");
    await expect(dialog).not.toHaveAttribute("open");

    // « Effacer » recommence le même défi : plus de résultat
    await page.locator("#clear").click();
    await expect(page.locator("#game-goal")).toContainText("Clicks: 0");
    await expect(result).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("un clic pendant la célébration ouvre la fenêtre sans la refermer", async ({ page, viewport }) => {
    await startChallenge(page);
    await clickSomeNode(page);
    // clic dans un coin : il tomberait sur le voile de la fenêtre qui s'ouvre
    await page.mouse.click(5, viewport!.height - 5);
    const dialog = page.locator("#victory");
    await expect(dialog).toHaveAttribute("open", "", { timeout: 1000 });
    await page.waitForTimeout(500);
    await expect(dialog).toHaveAttribute("open", "");
    await expect(page.locator("#victory-share")).toBeFocused();
  });

  test("une touche pendant la célébration n'active pas Partager", async ({ page, context, isMobile }) => {
    test.skip(isMobile, "clavier : desktop seulement");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await startChallenge(page);
    await clickSomeNode(page);
    await page.keyboard.press("Enter");
    await expect(page.locator("#victory")).toHaveAttribute("open", "", { timeout: 1000 });
    await page.waitForTimeout(300);
    await expect(page.locator("#victory-feedback")).toBeHidden();
  });
});
