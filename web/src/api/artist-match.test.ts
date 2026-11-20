import { describe, expect, it } from "vitest";
import { DeezerMatcher, normalizeTitle, type MatcherDeps } from "./artist-match";
import type { DeezerArtist } from "./deezer";
import { deezerIdsByMbid } from "./wikidata";
import type { PreviewTrack } from "./types";

const OASIS_MBID = "39ab1aed-75e0-4140-bd47-540276886b60";
const dz = (id: number, name: string, nb_fan: number): DeezerArtist => ({ id, name, nb_fan, picture_medium: `${id}.jpg`, picture_big: "" });
const track = (title: string): PreviewTrack => ({ id: 1, title, artistName: "", albumTitle: "", link: "", previewUrl: "p" });

/** Univers Deezer : deux « Oasis » (électro peu écouté, puis le groupe) et leurs titres. */
function deps(over: Partial<MatcherDeps> = {}): MatcherDeps & { calls: string[] } {
  const calls: string[] = [];
  const artists = [dz(152913482, "Oasis", 470), dz(83874492, "Oasis", 83), dz(927, "Oasis", 4_724_082)];
  const titles: Record<number, string[]> = {
    152913482: ["Need You"],
    83874492: ["Desert"],
    927: ["Wonderwall - Remastered", "Don't Look Back in Anger (Remastered)"],
  };
  return {
    calls,
    deezer: {
      searchArtists: async (name) => (calls.push(`search:${name}`), artists.filter((a) => a.name === name)),
      getArtist: async (id) => (calls.push(`artist:${id}`), artists.find((a) => a.id === id) ?? null),
      getTopTracks: async (id) => (calls.push(`top:${id}`), (titles[id] ?? []).map(track)),
    },
    deezerIds: async (mbids) => (calls.push(`wikidata:${mbids.join(",")}`), new Map(mbids.filter((m) => m === OASIS_MBID).map((m) => [m, 927]))),
    topTrackTitles: async () => (calls.push("lastfm:top"), ["Wonderwall", "Don't Look Back in Anger", "Champagne Supernova"]),
    ...over,
  };
}

describe("normalizeTitle", () => {
  it("ignores case, accents, brackets and version suffixes", () => {
    expect(normalizeTitle("Bohemian Rhapsody - Remastered 2011")).toBe("bohemian rhapsody");
    expect(normalizeTitle("Don't Look Back in Anger (Remastered)")).toBe("don t look back in anger");
    expect(normalizeTitle("Café [Live]")).toBe("cafe");
  });
});

describe("DeezerMatcher", () => {
  it("uses the MBID → Deezer id link from Wikidata, without searching by name", async () => {
    const d = deps();
    const found = await new DeezerMatcher(d).match({ id: OASIS_MBID, name: "Oasis", mbid: OASIS_MBID });
    expect(found!.id).toBe(927);
    expect(d.calls).toEqual([`wikidata:${OASIS_MBID}`, "artist:927"]);
  });

  it("batches MBID lookups into one Wikidata query", async () => {
    const d = deps();
    const matcher = new DeezerMatcher(d);
    matcher.prefetch([
      { id: "a", name: "A", mbid: "11111111-1111-1111-1111-111111111111" },
      { id: "b", name: "B" },
      { id: OASIS_MBID, name: "Oasis", mbid: OASIS_MBID },
    ]);
    await matcher.match({ id: OASIS_MBID, name: "Oasis", mbid: OASIS_MBID });
    expect(d.calls.filter((c) => c.startsWith("wikidata"))).toEqual([
      `wikidata:11111111-1111-1111-1111-111111111111,${OASIS_MBID}`,
    ]);
  });

  it("without MBID, keeps the homonym whose top tracks match Last.fm's", async () => {
    const d = deps();
    const found = await new DeezerMatcher(d).match({ id: "Oasis", name: "Oasis" });
    expect(found!.id).toBe(927);
    // le plus écouté est essayé en premier : le bon dès le premier essai
    expect(d.calls.filter((c) => c.startsWith("top:"))).toEqual(["top:927"]);
  });

  it("falls back to the name when Wikidata has no Deezer id or fails", async () => {
    const unknown = { id: "x", name: "Oasis", mbid: "22222222-2222-2222-2222-222222222222" };
    expect((await new DeezerMatcher(deps()).match(unknown))!.id).toBe(927);
    const failing = deps({ deezerIds: async () => Promise.reject(new Error("timeout")) });
    expect((await new DeezerMatcher(failing).match(unknown))!.id).toBe(927);
  });

  it("returns null rather than a homonym with no track in common", async () => {
    const d = deps({ topTrackTitles: async () => ["Some Other Song"] });
    expect(await new DeezerMatcher(d).match({ id: "Oasis", name: "Oasis" })).toBeNull();
  });

  it("without Last.fm titles, accepts only a unique homonym", async () => {
    const noTitles = { topTrackTitles: async () => [] };
    expect(await new DeezerMatcher(deps(noTitles)).match({ id: "Oasis", name: "Oasis" })).toBeNull();
    const single = deps({
      ...noTitles,
      deezer: { ...deps().deezer, searchArtists: async () => [dz(5, "Hania Rani", 90_000), dz(6, "Hania", 3)] },
    });
    expect((await new DeezerMatcher(single).match({ id: "h", name: "Hania Rani" }))!.id).toBe(5);
  });

  it("caches results, but not failures", async () => {
    let fail = true;
    const d = deps();
    const matcher = new DeezerMatcher({
      ...d,
      deezer: { ...d.deezer, searchArtists: async (n) => (fail ? Promise.reject(new Error("down")) : d.deezer.searchArtists(n)) },
    });
    await expect(matcher.match({ id: "Oasis", name: "Oasis" })).rejects.toThrow("down");
    fail = false;
    expect((await matcher.match({ id: "Oasis", name: "Oasis" }))!.id).toBe(927);
    await matcher.match({ id: "Oasis", name: "Oasis" });
    expect(d.calls.filter((c) => c === "lastfm:top")).toHaveLength(1);
  });
});

describe("deezerIdsByMbid", () => {
  it("queries Wikidata with validated MBIDs only and reads P2722", async () => {
    const urls: string[] = [];
    const ids = await deezerIdsByMbid([OASIS_MBID.toUpperCase(), 'x" } DELETE {', OASIS_MBID], async (url) => {
      urls.push(url);
      return { results: { bindings: [{ mbid: { value: OASIS_MBID }, deezer: { value: "927" } }] } };
    });
    expect(ids.get(OASIS_MBID)).toBe(927);
    const query = new URL(urls[0]).searchParams.get("query")!;
    expect(query).toContain(`"${OASIS_MBID}"`);
    expect(query).not.toContain("DELETE");
    expect(query.match(/39ab1aed/g)).toHaveLength(1);
    expect(await deezerIdsByMbid(["not-a-mbid"], async () => ({}))).toEqual(new Map());
  });
});
