import { describe, expect, it } from "vitest";
import { areFarApart, estimateDifficulty, parFor, shareGenre, pickChallenge, popularPool, scoreFor } from "./game";
import { ArtistMap } from "../graph/model";
import type { Artist } from "../api/types";

const a = (name: string): Artist => ({ id: name.toLowerCase(), name });

describe("game", () => {
  it("scores 1000 points per difficulty level at par, then 20% less per extra click", () => {
    expect([1, 2, 3, 4].map((d) => parFor(d as 1 | 2 | 3 | 4))).toEqual([3, 4, 5, 6]);
    expect([3, 4, 5, 6].map((moves) => scoreFor(moves, 1))).toEqual([1000, 800, 640, 512]);
    expect(scoreFor(1, 1)).toBe(1000); // mieux que le par : pas de bonus
    expect(scoreFor(6, 4)).toBe(4000);
    expect(scoreFor(16, 4)).toBe(429); // 10 clics de plus que le par
    expect(scoreFor(80, 1)).toBe(1);
  });

  it("rates a challenge from the overlap of both neighbourhoods", async () => {
    // graphe : A → x1 → y1 ; B → z1 ; les rencontres sont ajoutées cas par cas
    const rate = (graph: Record<string, string[]>, width = 16, tags?: Record<string, string[]>) =>
      estimateDifficulty(
        { from: a("A"), to: a("B") },
        async (artist) => (graph[artist.name] ?? []).map(a),
        width,
        tags && (async (artist) => tags[artist.name] ?? []),
      );
    const base = { A: ["x1"], x1: ["y1"], B: ["z1"], z1: ["w1"] };
    expect(await rate({ ...base, x1: ["y1", "B"] })).toBe(1); // B visible après un clic
    expect(await rate({ ...base, B: ["z1", "y1"] })).toBe(1); // A → x1 → y1 ~ B
    expect(await rate({ ...base, z1: ["w1", "y1"] })).toBe(1); // A → x1 → y1 ~ z1 ~ B
    expect(await rate({ ...base, x1: ["y1", "far"], z1: ["w1", "FAR"] }, 1)).toBe(2); // seulement hors de l'affichage
    expect(await rate(base, 16, { A: ["Rock", "seen live"], B: ["rock"] })).toBe(3); // genre commun
    expect(await rate(base, 16, { A: ["seen live", "pop"], B: ["seen live", "metal"] })).toBe(4);
    expect(await rate(base)).toBe(4); // tags inconnus
    // un appel en échec compte comme une liste vide
    const failing = estimateDifficulty({ from: a("A"), to: a("B") }, () => Promise.reject(new Error("down")));
    expect(await failing).toBe(4);
  });

  it("compares genres, ignoring vague tags", () => {
    expect(shareGenre(["Hip-Hop", "rap"], ["hip-hop"])).toBe(true);
    expect(shareGenre(["seen live"], ["seen live"])).toBe(false);
    expect(shareGenre([], ["rock"])).toBe(false);
  });

  it("keeps only well-known artists, without duplicates", () => {
    const chart = [
      { artist: a("Radiohead"), listeners: 8_000_000 },
      { artist: a("Obscure"), listeners: 10_000 },
      { artist: { id: "x", name: "radiohead" }, listeners: 8_000_000 },
      { artist: a("Beyoncé"), listeners: 4_000_000 },
    ];
    expect(popularPool(chart, 1_000_000).map((x) => x.name)).toEqual(["Radiohead", "Beyoncé"]);
  });

  it("only accepts artists at least three links apart", () => {
    const [x, y] = [a("Radiohead"), a("Rihanna")];
    expect(areFarApart(x, y, [a("Muse")], [a("Drake")])).toBe(true);
    expect(areFarApart(x, y, [a("RIHANNA")], [a("Drake")])).toBe(false); // voisins directs
    expect(areFarApart(x, y, [a("Muse")], [a("Radiohead")])).toBe(false); // similarité à sens unique
    expect(areFarApart(x, y, [a("Björk")], [a("Bjork")])).toBe(false); // un similaire commun
    expect(areFarApart(x, y, [], [a("Drake")])).toBe(false); // artiste mal référencé
  });

  it("draws until it finds two distant artists", async () => {
    const pool = [a("Radiohead"), a("Muse"), a("Rihanna")];
    const similars: Record<string, Artist[]> = {
      radiohead: [a("Muse")],
      muse: [a("Radiohead")],
      rihanna: [a("Drake")],
    };
    // tirages : Radiohead/Muse (voisins), puis Radiohead/Rihanna
    const draws = [0, 0.4, 0, 0.9];
    const challenge = await pickChallenge(pool, async (artist) => similars[artist.id], () => draws.shift() ?? 0);
    expect(challenge?.from.name).toBe("Radiohead");
    expect(challenge?.to.name).toBe("Rihanna");
  });

  it("gives up when no distant pair exists", async () => {
    const pool = [a("Radiohead"), a("Muse")];
    const challenge = await pickChallenge(pool, async (artist) => [artist.id === "muse" ? a("Radiohead") : a("Muse")]);
    expect(challenge).toBeNull();
  });
});

describe("ArtistMap for the game", () => {
  it("finds a node by name, counts moves and gives the path from A to B", () => {
    const map = new ArtistMap();
    map.addInput(a("Radiohead"), [a("Muse"), a("Blur")], 10);
    map.markExplored("muse");
    map.expand("muse", [a("Placebo")], 10);
    map.markExplored("placebo");
    map.expand("placebo", [a("Beyoncé")], 10);
    expect(map.exploredCount).toBe(2);
    expect(map.findByName("BEYONCE")?.id).toBe("beyoncé");
    expect(map.shortestPath("radiohead", "beyoncé").map((n) => n.name)).toEqual([
      "Radiohead",
      "Muse",
      "Placebo",
      "Beyoncé",
    ]);
    expect(map.shortestPath("radiohead", "unknown")).toEqual([]);
  });
});
