import { describe, expect, it } from "vitest";
import { WikidataProvider, type InfoSource } from "./wikidata";
import { TmdbProvider, movieLabel } from "./tmdb";

const noInfo: InfoSource = { getInfo: async () => null, suggest: async () => [] };
const binding = (qid: string, label: string, mbid?: string, dir = 0, links = 0) => ({
  item: { value: `http://www.wikidata.org/entity/${qid}` },
  itemLabel: { value: label },
  ...(mbid ? { mbid: { value: mbid } } : {}),
  dir: { value: String(dir) },
  links: { value: String(links) },
});

describe("WikidataProvider", () => {
  it("keeps the most relevant search result that is a music artist", async () => {
    const urls: string[] = [];
    const provider = new WikidataProvider(noInfo, async (url) => {
      urls.push(url);
      if (url.includes("wbsearchentities")) {
        return { search: [{ id: "Q911373" }, { id: "Q44190" }, { id: "Q3278435" }] };
      }
      return { results: { bindings: [binding("Q44190", "Radiohead", "a74b1b7f")] } };
    });
    expect(await provider.findArtist("radiohead")).toEqual({ id: "Q44190", name: "Radiohead", mbid: "a74b1b7f" });
    const sparql = new URL(urls[1]).searchParams.get("query")!;
    expect(sparql).toContain("wd:Q911373 wd:Q44190 wd:Q3278435");
    expect(sparql).toContain("wdt:P434");
  });

  it("searches in the interface language", async () => {
    const urls: string[] = [];
    const provider = new WikidataProvider(
      noInfo,
      async (url) => {
        urls.push(url);
        return { search: [] };
      },
      () => "ja",
    );
    await provider.findArtist("ビートルズ");
    expect(new URL(urls[0]).searchParams.get("language")).toBe("ja");
  });

  it("returns null when nothing is found", async () => {
    const provider = new WikidataProvider(noInfo, async () => ({ search: [] }));
    expect(await provider.findArtist("zzzz")).toBeNull();
  });

  it("lists influences first, then followers, most known first, deduplicated", async () => {
    let query = "";
    const provider = new WikidataProvider(noInfo, async (url) => {
      query = new URL(url).searchParams.get("query")!;
      return {
        results: {
          bindings: [
            binding("Q1", "Small follower", "a", 1, 3),
            binding("Q2306", "Pink Floyd", "pf", 0, 90),
            binding("Q2", "Big follower", "b", 1, 80),
            binding("Q2", "Big follower", "b2", 1, 80), // deux MBID
            binding("Q44190", "Radiohead", "r", 1, 100),
            binding("Q3", "Old influence", "c", 0, 10),
          ],
        },
      };
    });
    const list = await provider.getSimilars({ id: "Q44190", name: "Radiohead" }, 3);
    expect(list.map((a) => a.name)).toEqual(["Pink Floyd", "Old influence", "Big follower"]);
    expect(query).toContain("wd:Q44190 wdt:P737 ?item");
    expect(query).toContain("?item wdt:P737 wd:Q44190");
  });

  it("refuses ids that are not QIDs (no SPARQL injection from shared maps)", async () => {
    const provider = new WikidataProvider(noInfo, async () => {
      throw new Error("should not be called");
    });
    expect(await provider.getSimilars({ id: "Q1 } ?x ?y ?z {", name: "x" }, 5)).toEqual([]);
  });
});

describe("TmdbProvider", () => {
  const movies = [
    { id: 1, title: "Alien", release_date: "2019-01-01" },
    { id: 348, title: "Alien", release_date: "1979-05-25", poster_path: "/a.jpg" },
  ];

  it("labels movies with their year and honours a year in the query", async () => {
    const provider = new TmdbProvider("key", async () => ({ results: movies }));
    expect(movieLabel(movies[1])).toBe("Alien (1979)");
    expect(await provider.findArtist("alien (1979)")).toEqual({ id: "348", name: "Alien (1979)" });
    expect(await provider.findArtist("Alien")).toEqual({ id: "1", name: "Alien (2019)" });
  });

  it("uses api_key for v3 keys and a bearer header for v4 tokens", async () => {
    const seen: { url: string; init?: RequestInit }[] = [];
    const fetcher = async (url: string, init?: RequestInit) => {
      seen.push({ url, init });
      return { results: [] };
    };
    await new TmdbProvider("v3key", fetcher).suggest("al");
    await new TmdbProvider("eyJtoken", fetcher).suggest("al");
    expect(new URL(seen[0].url).searchParams.get("api_key")).toBe("v3key");
    expect(new URL(seen[1].url).searchParams.has("api_key")).toBe(false);
    expect(seen[1].init?.headers).toEqual({ Authorization: "Bearer eyJtoken" });
  });

  it("falls back to similar movies when there is no recommendation", async () => {
    const provider = new TmdbProvider("key", async (url) =>
      url.includes("/recommendations") ? { results: [] } : { results: movies },
    );
    expect((await provider.getSimilars({ id: "2", name: "x" }, 1)).map((m) => m.name)).toEqual(["Alien (2019)"]);
  });

  it("requests the interface language and falls back to the English synopsis", async () => {
    const languages: (string | null)[] = [];
    const provider = new TmdbProvider(
      "key",
      async (url) => {
        const language = new URL(url).searchParams.get("language");
        languages.push(language);
        return { ...movies[1], title: "Alien, le huitième passager", overview: language === "fr-FR" ? "" : "In space…" };
      },
      () => "fr",
    );
    const info = await provider.getInfo({ id: "348", name: "Alien (1979)" });
    expect(languages).toEqual(["fr-FR", "en-US"]);
    expect(info).toMatchObject({ name: "Alien, le huitième passager (1979)", bioHtml: "In space…" });
  });

  it("builds escaped movie info with poster and genres", async () => {
    const provider = new TmdbProvider("key", async () => ({
      ...movies[1],
      overview: "In space <no one> can hear you scream.",
      genres: [{ name: "Horror" }, { name: "Science Fiction" }],
    }));
    const info = await provider.getInfo({ id: "348", name: "Alien (1979)" });
    expect(info).toMatchObject({
      name: "Alien (1979)",
      url: "https://www.themoviedb.org/movie/348",
      tags: ["Horror", "Science Fiction"],
      image: "https://image.tmdb.org/t/p/w185/a.jpg",
    });
    expect(info!.bioHtml).toContain("&#60;no one&#62;");
  });

  it("suggests movies with year and poster, ready to add without a new search", async () => {
    const provider = new TmdbProvider("key", async () => ({ results: movies }));
    const [, second] = await provider.suggest("ali");
    expect(second).toEqual({
      name: "Alien",
      detail: "1979",
      picture: "https://image.tmdb.org/t/p/w92/a.jpg",
      artist: { id: "348", name: "Alien (1979)" },
    });
  });
});
