import { afterEach, describe, expect, it } from "vitest";
import { LOADERS, detectLang, setLang, t } from "./index";
import { en } from "./locales/en";
import { toLang } from "./languages";

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("language detection", () => {
  it("prefers the URL, then the saved choice, then the browser languages in order", () => {
    expect(detectLang("de", "fr", ["ja"])).toBe("de");
    expect(detectLang(null, "fr", ["ja"])).toBe("fr");
    expect(detectLang(null, null, ["nl-BE", "pt-BR", "en"])).toBe("pt"); // nl non proposé : langue suivante
    expect(detectLang("xx", null, ["ko"])).toBe("en");
  });

  it("maps regional and script variants to the primary language", () => {
    expect(toLang("zh-Hant-TW")).toBe("zh");
    expect(toLang("fr_CA")).toBe("fr");
    expect(toLang("EN-gb")).toBe("en");
    expect(toLang("")).toBeNull();
  });
});

describe("catalogs", () => {
  afterEach(() => setLang("en"));

  it("translate every key with the same placeholders as English", async () => {
    for (const [lang, load] of Object.entries(LOADERS)) {
      const catalog = await load();
      for (const key of Object.keys(en) as (keyof typeof en)[]) {
        expect(catalog[key], `${lang} ${key}`).toBeTruthy();
        expect(placeholders(catalog[key]), `${lang} ${key}`).toEqual(placeholders(en[key]));
      }
    }
  });

  it("interpolates values in the current language", async () => {
    await setLang("fr");
    expect(t("map.description", { a: "Radiohead", b: "Muse" })).toBe("Cette carte montre comment relier Radiohead à Muse");
    await setLang("ja");
    expect(t("overview.about", { name: "Radiohead" })).toBe("Radiohead について");
  });
});
