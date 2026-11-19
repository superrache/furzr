import { describe, expect, it } from "vitest";
import { decodeSnapshot, encodeSnapshot, fromLegacySnake } from "./share";
import { ArtistMap, type MapSnapshot } from "./model";

const snapshot: MapSnapshot = {
  v: 1,
  p: "lastfm",
  a: "Radiohead",
  b: "Muse",
  n: [
    ["mbid-r", "Radiohead", "mbid-r"],
    ["Muse", "Muse", ""],
    ["Sigur Rós", "Sigur Rós", ""],
  ],
  l: [
    [0, 1],
    [1, 2],
  ],
  i: [0],
  e: [1],
};

describe("share links", () => {
  it("round-trips a snapshot through a URL-safe string", async () => {
    const encoded = await encodeSnapshot(snapshot);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(await decodeSnapshot(encoded)).toEqual(snapshot);
  });

  it("stays reasonably short for a big map", async () => {
    const big: MapSnapshot = {
      ...snapshot,
      n: Array.from({ length: 120 }, (_, i) => [`id-${i}-0000-1111-2222`, `Artist number ${i}`, ""]),
      l: Array.from({ length: 119 }, (_, i) => [i, i + 1]),
    };
    const encoded = await encodeSnapshot(big);
    expect(encoded.length).toBeLessThan(4000);
  });

  it("rejects garbage and malformed content", async () => {
    expect(await decodeSnapshot("not-valid")).toBeNull();
    expect(await decodeSnapshot("")).toBeNull();
    const wrongShape = await encodeSnapshot({ ...snapshot, n: [["only-id"]] } as unknown as MapSnapshot);
    expect(await decodeSnapshot(wrongShape)).toBeNull();
  });
});

describe("legacy saved maps", () => {
  it("converts the 2013 csJSON format", () => {
    const legacy = {
      api: "lastfm",
      artistA: {
        id: "mbid-r",
        name: "Radiohead",
        isInput: true,
        isExploded: true,
        children: [
          { id: "Muse", name: "Muse", isInput: false, isExploded: true, children: [{ id: "Placebo", name: "Placebo" }] },
          { id: "Blur", name: "Blur" },
        ],
      },
      inputIds: ["mbid-r"],
      explodedIds: ["Muse"],
    };
    const s = fromLegacySnake(legacy);
    expect(s.a).toBe("Radiohead");
    expect(s.b).toBe("Muse");
    expect(s.n.map(([, name]) => name)).toEqual(["Radiohead", "Muse", "Placebo", "Blur"]);
    expect(s.n[0][2]).toBe("mbid-r");
    const map = ArtistMap.fromSnapshot(s);
    expect(map.getNode("mbid-r")!.isInput).toBe(true);
    expect(map.getNode("Muse")!.isExploded).toBe(true);
    expect(map.graphData().links).toHaveLength(3);
  });
});
