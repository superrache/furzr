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
