import { expect, test } from "@playwright/test";
import { addArtist, clickSomeNode, collectErrors, mockApis } from "./mocks";

test.describe("exploration", () => {
  test("ajouter un artiste puis agrandir la carte", async ({ page }) => {
    const errors = collectErrors(page);
    const mocks = await mockApis(page);
    await page.goto("./");
    await expect(page.locator("body")).toHaveClass(/start/);
    await addArtist(page, "Alpha");
    await expect(page.locator("body")).not.toHaveClass(/start/);
    // le lecteur, hors du panneau de la fiche, joue le premier extrait
    await expect(page.locator("#player")).toBeVisible();
    await expect(page.locator("#sound-title")).toContainText("Alpha – Test Song 1");
    await expect(page.locator("#sound-title .sound-note")).toHaveClass(/playing/);

    const explored = await clickSomeNode(page);
    expect(explored).toMatch(/^Beta \d+$/);
    await expect(page.locator("#sound-title")).toContainText(`${explored} – Test Song 1`);
    expect(errors).toEqual([]);
    expect(mocks.unmocked).toEqual([]);
  });

  test("la note coupe et rétablit le son, sans ouvrir la fiche", async ({ page, isMobile }) => {
    await mockApis(page);
    await page.goto("./");
    await addArtist(page, "Alpha");
    const note = page.locator("#sound-title .sound-note");
    await expect(note).toHaveClass(/playing/);
    if (!isMobile) {
      await note.hover();
      await page.waitForTimeout(400);
      await expect(page.locator("#overview")).not.toHaveClass(/hovered|open/);
    }
    await note.click();
    await expect(page.locator("#sound-title .sound-note")).toHaveClass(/muted/);
    await expect(page.locator("#sound-title")).toContainText("Sound off");
    await expect(page.locator("#overview")).not.toHaveClass(/open/);
    // le choix est mémorisé
    await page.reload();
    await addArtist(page, "Alpha");
    await expect(page.locator("#sound-title .sound-note")).toHaveClass(/muted/);
    await page.locator("#sound-title .sound-note").click();
    await expect(page.locator("#sound-title .sound-note")).toHaveClass(/playing/);
  });

  test("le volume s'ouvre au survol de la note, à 70 % par défaut, et il est mémorisé", async ({ page, isMobile }) => {
    test.skip(isMobile, "pas de survol sur écran tactile");
    // le lecteur n'est pas dans le DOM : on note le dernier volume appliqué
    await page.addInitScript(() => {
      const desc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "volume")!;
      Object.defineProperty(HTMLMediaElement.prototype, "volume", {
        ...desc,
        set(v: number) {
          (window as unknown as { lastVolume: number }).lastVolume = v;
          desc.set!.call(this, v);
        },
      });
    });
    await mockApis(page);
    await page.goto("./");
    await addArtist(page, "Alpha");
    const note = page.locator("#sound-title .sound-note");
    const volume = page.locator("#volume");
    const range = page.locator("#volume-range");
    await expect(note).toHaveClass(/playing/);
    await expect(volume).toHaveCSS("opacity", "0");
    expect(await page.evaluate(() => (window as unknown as { lastVolume: number }).lastVolume)).toBe(0.7);

    await note.hover();
    await expect(volume).toHaveCSS("opacity", "1");
    await expect(range).toHaveValue("70");
    // posé au-dessus de la note, plus haut que large
    const [n, v] = [(await note.boundingBox())!, (await volume.boundingBox())!];
    expect(v.y + v.height).toBeLessThanOrEqual(n.y + 6);
    expect(Math.abs(v.x + v.width / 2 - (n.x + n.width / 2))).toBeLessThan(4);
    expect(v.height).toBeGreaterThan(v.width * 2);

    // on monte de la note au curseur sans qu'il se referme, puis on baisse le son
    await range.hover();
    await expect(volume).toHaveCSS("opacity", "1");
    await range.focus();
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press("ArrowDown");
    }
    await expect(range).toHaveValue("50");
    expect(await page.evaluate(() => (window as unknown as { lastVolume: number }).lastVolume)).toBe(0.5);

    await page.mouse.move(5, 5);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await expect(volume).toHaveCSS("opacity", "0");

    await page.reload();
    await addArtist(page, "Alpha");
    await expect(range).toHaveValue("50");
    expect(await page.evaluate(() => (window as unknown as { lastVolume: number }).lastVolume)).toBe(0.5);
  });

  test("la fiche se déplie depuis son onglet", async ({ page, isMobile }) => {
    await mockApis(page);
    await page.goto("./");
    await addArtist(page, "Alpha");
    const overview = page.locator("#overview");
    const bio = page.locator("#overview-bio");
    await expect(bio).toBeHidden(); // repliée : seul le nom dépasse
    if (isMobile) {
      await overview.locator(".drawer-tab").tap();
      await expect(overview).toHaveClass(/open/);
    } else {
      await overview.locator(".drawer-tab").hover();
      await expect(overview).toHaveClass(/hovered/);
    }
    await expect(bio).toBeVisible();
    await expect(bio).toContainText("Alpha is a test artist.");
    // le lien « Read more » de Last.fm est remplacé par un lien traduit
    await expect(bio.getByRole("link", { name: "Read more on Last.fm" })).toHaveAttribute(
      "href",
      "https://www.last.fm/music/Alpha",
    );
    await expect(page.locator("#overview-tags")).toHaveText("rock · test");
  });

  test("un lien de partage rouvre la même carte", async ({ page, context }) => {
    await mockApis(page);
    await page.goto("./");
    await addArtist(page, "Alpha");
    await clickSomeNode(page);
    const share = page.locator("#share");
    await share.locator(".drawer-tab").click();
    await page.locator("#share-copy").click();
    await expect(page.locator("#share-url")).toHaveValue(/#map=/); // lien calculé (compression) en asynchrone
    const url = await page.locator("#share-url").inputValue();
    const description = await page.locator("#map-description").textContent();

    const other = await context.newPage();
    await mockApis(other);
    await other.goto(url);
    await expect(other.locator("body")).not.toHaveClass(/start/);
    await expect(other.locator("#map-description")).toHaveText(description ?? "");
  });
});
