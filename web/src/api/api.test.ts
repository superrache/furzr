import { describe, expect, it } from "vitest";
import { LastFmProvider } from "./lastfm";
import { DeezerClient, rankSuggestions, type DeezerArtist } from "./deezer";
import { ServiceError } from "./types";
import { sanitizeBio, escapeHtml } from "../ui/html";

/** Faux fetcher : renvoie la réponse associée à la méthode Last.fm demandée. */
function lastfmFetcher(responses: Record<string, unknown>) {
  const calls: URLSearchParams[] = [];
  const fetcher = async (url: string) => {
    const params = new URL(url).searchParams;
    calls.push(params);
    return responses[params.get("method")!] ?? {};
  };
  return { fetcher, calls };
}

describe("LastFmProvider", () => {
  it("prefers an exact (case-insensitive) match when searching", async () => {
    const { fetcher } = lastfmFetcher({
      "artist.search": {
        results: { artistmatches: { artist: [{ name: "Daft Punk Tribute", mbid: "" }, { name: "Daft Punk", mbid: "dp" }] } },
      },
    });
    const provider = new LastFmProvider("key", null, fetcher);
    expect(await provider.findArtist("dafT puNK")).toEqual({ id: "dp", name: "Daft Punk", mbid: "dp" });
  });

  it("returns null for unknown artists and an empty list without similars", async () => {
    const { fetcher } = lastfmFetcher({
      "artist.search": { results: { artistmatches: { artist: [] } } },
      "artist.getsimilar": { error: 6, message: "The artist you supplied could not be found" },
    });
    const provider = new LastFmProvider("key", null, fetcher);
    expect(await provider.findArtist("zzzz")).toBeNull();
    expect(await provider.getSimilars({ id: "x", name: "x" }, 10)).toEqual([]);
  });

  it("uses the mbid when available, the name otherwise, and falls back to name as id", async () => {
    const { fetcher, calls } = lastfmFetcher({
      "artist.getsimilar": { similarartists: { artist: [{ name: "Muse", mbid: "" }, { name: "Blur", mbid: "b" }] } },
    });
    const provider = new LastFmProvider("key", null, fetcher);
    const similars = await provider.getSimilars({ id: "r", name: "Radiohead", mbid: "r" }, 2);
    expect(similars).toEqual([
      { id: "Muse", name: "Muse", mbid: undefined },
      { id: "b", name: "Blur", mbid: "b" },
    ]);
    expect(calls[0].get("mbid")).toBe("r");
    expect(calls[0].get("limit")).toBe("2");
    await provider.getSimilars({ id: "Muse", name: "Muse" }, 2);
    expect(calls[1].get("artist")).toBe("Muse");
  });

  it("throws a ServiceError on API errors other than 'not found'", async () => {
    const { fetcher } = lastfmFetcher({ "artist.search": { error: 29, message: "Rate limit exceeded" } });
    const provider = new LastFmProvider("key", null, fetcher);
    await expect(provider.findArtist("x")).rejects.toBeInstanceOf(ServiceError);
  });

  it("builds artist info with Deezer picture and sanitized bio", async () => {
    const { fetcher } = lastfmFetcher({
      "artist.getinfo": {
        artist: {
          name: "Radiohead",
          url: "https://www.last.fm/music/Radiohead",
          bio: {
            summary:
              'Band <script>alert(1)</script>from <a href="https://en.wikipedia.org/wiki/Abingdon">Abingdon</a>. <a href="https://www.last.fm/music/Radiohead">Read more on Last.fm</a>',
          },
          tags: { tag: [{ name: "rock" }, { name: "alternative" }] },
        },
      },
    });
    const deezer = new DeezerClient(async <T>() => ({ data: [{ id: 399, name: "Radiohead", picture_medium: "pic.jpg" }] }) as T);
    const info = await new LastFmProvider("key", deezer, fetcher).getInfo({ id: "Radiohead", name: "Radiohead" });
    expect(info).toMatchObject({ name: "Radiohead", tags: ["rock", "alternative"], image: "pic.jpg" });
    expect(info!.bioHtml).not.toContain("<script");
    expect(info!.bioHtml).toContain('target="_blank"');
    expect(info!.bioHtml).not.toContain("Read more on Last.fm"); // l'interface met son propre lien, traduit
    expect(info!.source).toBe("Last.fm");
  });

  it("asks Last.fm for the interface language and falls back to English when the bio is missing", async () => {
    const { fetcher, calls } = lastfmFetcher({});
    let call = 0;
    const provider = new LastFmProvider(
      "key",
      null,
      async (url) => {
        await fetcher(url);
        call++;
        const summary = call === 1 ? '<a href="https://www.last.fm/music/Odezenne">Read more on Last.fm</a>' : "French band.";
        return { artist: { name: "Odezenne", url: "u", bio: { summary } } };
      },
      () => "ja",
    );
    const info = await provider.getInfo({ id: "Odezenne", name: "Odezenne" });
    expect(calls.map((c) => c.get("lang"))).toEqual(["ja", null]);
    expect(info!.bioHtml).toBe("French band.");
  });

  it("does not send lang=en (Last.fm default)", async () => {
    const { fetcher, calls } = lastfmFetcher({ "artist.getinfo": { artist: { name: "x", url: "u", bio: { summary: "Bio." } } } });
    await new LastFmProvider("key", null, fetcher).getInfo({ id: "x", name: "x" });
    expect(calls).toHaveLength(1);
    expect(calls[0].has("lang")).toBe(false);
  });
});

describe("DeezerClient", () => {
  it("caches artist lookups and filters unplayable tracks", async () => {
    const urls: string[] = [];
    const deezer = new DeezerClient(async <T>(url: string) => {
      urls.push(url);
      if (url.includes("search/artist")) {
        return { data: [{ id: 1, name: "Muse tribute" }, { id: 2, name: "Muse" }] } as T;
      }
      return {
        data: [
          { id: 10, title: "Uprising", link: "l", preview: "p10", artist: { name: "Muse" }, album: { title: "The Resistance" } },
          { id: 11, title: "Hidden", link: "l", preview: "", artist: { name: "Muse" } },
          { id: 12, title: "Blocked", link: "l", preview: "p12", readable: false, artist: { name: "Muse" } },
        ],
      } as T;
    });
    expect((await deezer.findArtist("muse"))!.id).toBe(2);
    await deezer.findArtist("MUSE ");
    expect(urls.filter((u) => u.includes("search/artist"))).toHaveLength(1);
    expect(urls[0]).toContain("output=jsonp");

    const tracks = await deezer.getTopTracks(2);
    expect(tracks.map((t) => t.title)).toEqual(["Uprising"]);
    expect(tracks[0].albumTitle).toBe("The Resistance");
  });

  it("turns Deezer error payloads into ServiceError and does not cache failures", async () => {
    let fail = true;
    const deezer = new DeezerClient(async <T>() => (fail ? { error: { message: "Quota limit exceeded" } } : { data: [] }) as T);
    await expect(deezer.findArtist("x")).rejects.toBeInstanceOf(ServiceError);
    fail = false;
    expect(await deezer.findArtist("x")).toBeNull();
  });
});

describe("artist suggestions", () => {
  const artist = (name: string, nb_fan: number): DeezerArtist =>
    ({ id: nb_fan, name, nb_fan, picture_small: `${name}.jpg` }) as DeezerArtist;

  it("puts prefix matches first, most popular first, ignoring case and accents", () => {
    const ranked = rankSuggestions(
      "sigur ro",
      [artist("Sigurd", 5), artist("Sigur Rós", 300), artist("Sigur ros", 2), artist("Sigur Rosé", 10)],
      3,
    );
    expect(ranked.map((s) => s.name)).toEqual(["Sigur Rós", "Sigur Rosé", "Sigurd"]);
    expect(ranked[0]).toEqual({ name: "Sigur Rós", picture: "Sigur Rós.jpg", fans: 300 });
  });

  it("primes the artist cache so picking a suggestion needs no new search", async () => {
    const urls: string[] = [];
    const deezer = new DeezerClient(async <T>(url: string) => {
      urls.push(url);
      return { data: [artist("Daft", 134), artist("Daft Punk", 5_000_000)] } as T;
    });
    const suggestions = await deezer.suggestArtists("daft");
    expect(suggestions.map((s) => s.name)).toEqual(["Daft Punk", "Daft"]);
    expect((await deezer.findArtist("Daft Punk"))!.nb_fan).toBe(5_000_000);
    expect(urls).toHaveLength(1);
  });
});

describe("html helpers", () => {
  it("escapes text", () => {
    expect(escapeHtml(`<img src=x onerror="1">&'`)).toBe("&#60;img src=x onerror=&#34;1&#34;&#62;&#38;&#39;");
  });

  it("keeps only safe links in bios", () => {
    const html = sanitizeBio(
      `Tom &amp; Jerry <b>bold</b> <a href="javascript:alert(1)">bad</a> <a href="https://x.org/a" onclick="x()">good <i>link</i></a>`,
    );
    expect(html).toBe(
      'Tom &amp; Jerry bold bad <a href="https://x.org/a" target="_blank" rel="noopener noreferrer">good link</a>',
    );
  });
});
