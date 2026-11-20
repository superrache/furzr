import { expect, test, type Page } from "@playwright/test";
import { addArtist, clickSomeNode, mockApis, overlaps } from "./mocks";

/** Éléments toujours à l'écran sur la carte : aucun ne doit en recouvrir un autre. */
const FIXED = {
  form: "#artist-form",
  language: "#lang-box",
  tools: "#tools",
  aboutTab: "#about .drawer-tab",
  shareTab: "#share .drawer-tab",
  overviewTab: "#overview .drawer-tab",
  player: "#player",
};

async function expectNoOverlap(page: Page): Promise<void> {
  // laisse les panneaux finir de bouger (hauteurs mesurées, transitions)
  await page.waitForTimeout(500);
  const boxes = await Promise.all(
    Object.entries(FIXED).map(async ([name, selector]) => {
      const box = await page.locator(selector).boundingBox();
      expect(box, `${name} visible`).not.toBeNull();
      return [name, box!] as const;
    }),
  );
  const collisions: string[] = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (overlaps(boxes[i][1], boxes[j][1])) {
        collisions.push(`${boxes[i][0]} × ${boxes[j][0]}`);
      }
    }
  }
  expect(collisions).toEqual([]);
  // rien ne déborde : sur mobile, un panneau escamoté hors écran élargissait la page, dézoomée en conséquence
  const width = await page.evaluate(() => [window.innerWidth, document.documentElement.scrollWidth]);
  expect(width).toEqual([page.viewportSize()!.width, page.viewportSize()!.width]);
}

test.describe("mise en page", () => {
  test("accueil : la carte d'accueil tient dans l'écran, sous le sélecteur de langue", async ({ page }) => {
    await mockApis(page);
    await page.goto("./");
    await page.waitForTimeout(800); // transitions
    const form = (await page.locator("#artist-form").boundingBox())!;
    const lang = (await page.locator("#lang-box").boundingBox())!;
    const { width, height } = page.viewportSize()!;
    expect(overlaps(form, lang)).toBe(false);
    expect(form.x).toBeGreaterThanOrEqual(0);
    expect(form.x + form.width).toBeLessThanOrEqual(width);
    expect(form.y + form.height).toBeLessThanOrEqual(height);
    // le bouton « Play » passe avant le champ d'exploration
    const play = (await page.locator("#home-play").boundingBox())!;
    const input = (await page.locator("#artist-input").boundingBox())!;
    expect(play.y + play.height).toBeLessThan(input.y);
  });

  test("carte d'exploration", async ({ page }) => {
    await mockApis(page);
    await page.goto("./");
    await addArtist(page, "Alpha");
    await expectNoOverlap(page);
  });

  test("défi gagné (bandeau le plus haut, avec « Résultat »)", async ({ page }) => {
    await mockApis(page, { target: "Omega" });
    await page.goto("./?mode=game&from=Alpha&to=Omega");
    await expect(page.locator("#game-goal")).toContainText("Difficulty: Easy");
    await clickSomeNode(page);
    await page.mouse.click(5, 5); // passe la célébration
    await page.locator("#victory-map").click();
    await expect(page.locator("#game-goal .result-button")).toBeVisible();
    await expectNoOverlap(page);
  });
});
