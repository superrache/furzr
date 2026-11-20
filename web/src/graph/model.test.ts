import { describe, expect, it } from "vitest";
import { ArtistMap, nodeKind } from "./model";
import type { Artist } from "../api/types";

const a = (name: string): Artist => ({ id: name.toLowerCase(), name });
const names = (map: ArtistMap) => map.graphData().nodes.map((n) => n.name).sort();
const linkPairs = (map: ArtistMap) => map.graphData().links.map((l) => `${l.from}-${l.to}`).sort();

describe("ArtistMap", () => {
  it("adds an input artist with its similars, limited to max", () => {
    const map = new ArtistMap();
    map.addInput(a("Radiohead"), [a("Muse"), a("Blur"), a("Pulp")], 2);
    expect(names(map)).toEqual(["Blur", "Muse", "Radiohead"]);
    expect(linkPairs(map)).toEqual(["radiohead-blur", "radiohead-muse"]);
    expect(nodeKind(map.getNode("radiohead")!)).toBe("input");
    expect(nodeKind(map.getNode("muse")!)).toBe("similar");
    expect([map.artistA, map.artistB]).toEqual(["Radiohead", "Radiohead"]);
  });

  it("prunes unexplored similars on each expansion (snake mode)", () => {
    const map = new ArtistMap();
    map.addInput(a("Radiohead"), [a("Muse"), a("Blur")], 10);
    map.markExplored("muse");
    map.expand("muse", [a("Placebo"), a("Radiohead")], 10);

    // Blur (non exploré) disparaît, Radiohead n'est pas lié deux fois
    expect(names(map)).toEqual(["Muse", "Placebo", "Radiohead"]);
    expect(linkPairs(map)).toEqual(["muse-placebo", "radiohead-muse"]);
    expect(nodeKind(map.getNode("muse")!)).toBe("exploded");
    expect([map.artistA, map.artistB]).toEqual(["Radiohead", "Muse"]);
  });

  it("keeps every node in tree mode, and prunes again back in snake mode", () => {
    const map = new ArtistMap();
    map.growth = "tree";
    map.addInput(a("Radiohead"), [a("Muse"), a("Blur")], 10);
    map.markExplored("muse");
    map.expand("muse", [a("Placebo"), a("Feeder")], 10);
    expect(names(map)).toEqual(["Blur", "Feeder", "Muse", "Placebo", "Radiohead"]);

    map.growth = "snake";
    map.markExplored("placebo");
    map.expand("placebo", [a("Suede")], 10);
    expect(names(map)).toEqual(["Muse", "Placebo", "Radiohead", "Suede"]);
  });

  it("gives the neighborhood of a node in both directions", () => {
    const map = new ArtistMap();
    map.addInput(a("Radiohead"), [a("Muse"), a("Blur")], 10);
    map.markExplored("muse");
    map.expand("muse", [a("Placebo"), a("Ash")], 10);
    expect([...map.neighborhood("muse")].sort()).toEqual(["ash", "muse", "placebo", "radiohead"]);
    expect(map.neighborhood("unknown").size).toBe(0);
  });

  it("focuses on the expanded node and its children only, not the parent", () => {
    const map = new ArtistMap();
    map.addInput(a("Radiohead"), [a("Muse"), a("Blur")], 10);
    map.markExplored("muse");
    // Radiohead revient parmi les similaires de Muse : il reste le parent, pas un enfant
    map.expand("muse", [a("Placebo"), a("Ash"), a("Radiohead")], 10);
    expect([...map.focusSet("muse")].sort()).toEqual(["ash", "muse", "placebo"]);
    expect([...map.focusSet("radiohead")].sort()).toEqual(["muse", "radiohead"]);
    expect(map.focusSet("unknown").size).toBe(0);
  });

  it("keeps the first input as artist A when other artists are added", () => {
    const map = new ArtistMap();
    map.addInput(a("Radiohead"), [a("Muse")], 10);
    map.addInput(a("Daft Punk"), [a("Justice")], 10);
    expect(map.artistA).toBe("Radiohead");
    // les similaires de Radiohead non explorés sont élagués, les deux artistes saisis restent
    expect(names(map)).toEqual(["Daft Punk", "Justice", "Radiohead"]);
  });

  it("reuses node objects so the layout keeps positions", () => {
    const map = new ArtistMap();
    map.addInput(a("Radiohead"), [a("Muse")], 10);
    const before = map.getNode("radiohead")!;
    before.x = 42;
    before.y = 7;
    map.markExplored("muse");
    map.expand("muse", [a("Placebo")], 10);
    expect(map.getNode("radiohead")).toBe(before);
    // les nouveaux nœuds partent près du nœud exploré quand il a une position
    map.getNode("muse")!.x = 100;
    map.getNode("muse")!.y = 100;
    map.expand("muse", [a("Feeder")], 10);
    expect(Math.abs(map.getNode("feeder")!.x! - 100)).toBeLessThanOrEqual(10);
  });

  it("clears everything", () => {
    const map = new ArtistMap();
    map.addInput(a("Radiohead"), [a("Muse")], 10);
    map.clear();
    expect(map.isEmpty).toBe(true);
    expect([map.artistA, map.artistB]).toEqual(["", ""]);
  });

  it("round-trips through a snapshot", () => {
    const map = new ArtistMap();
    map.addInput({ id: "mbid-r", name: "Radiohead", mbid: "mbid-r" }, [a("Muse"), a("Blur")], 10);
    map.markExplored("muse");
    map.expand("muse", [a("Placebo")], 10);

    expect(map.toSnapshot("lastfm").g).toBeUndefined(); // snake : format inchangé
    const restored = ArtistMap.fromSnapshot(map.toSnapshot("lastfm"));
    expect(restored.growth).toBe("snake");
    map.growth = "tree";
    expect(ArtistMap.fromSnapshot(map.toSnapshot("lastfm")).growth).toBe("tree");
    expect(names(restored)).toEqual(names(map));
    expect(linkPairs(restored)).toEqual(linkPairs(map));
    expect(restored.getNode("mbid-r")).toMatchObject({ mbid: "mbid-r", isInput: true });
    expect(restored.getNode("muse")!.isExploded).toBe(true);
    expect([restored.artistA, restored.artistB]).toEqual([map.artistA, map.artistB]);

    // l'exploration continue normalement après restauration
    restored.markExplored("placebo");
    restored.expand("placebo", [a("Feeder")], 10);
    expect(names(restored)).toEqual(["Feeder", "Muse", "Placebo", "Radiohead"]);
  });
});
