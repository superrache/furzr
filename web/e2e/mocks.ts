import { expect, type Page, type Route } from "@playwright/test";

/**
 * Fausses API pour les tests de bout en bout : un petit univers d'artistes déterministe.
 *
 * - « Alpha » a pour similaires « Beta 1 » à « Beta 20 » ;
 * - chaque « Beta n » a pour similaires « Beta n.1 » à « Beta n.20 », précédés de `target` s'il est donné
 *   (mode jeu : la cible apparaît au premier clic) ;
 * - tout autre artiste a des similaires « <nom>.1 » à « <nom>.20 » ;
 * - le classement (mode jeu) contient « Alpha » et « Zeta », éloignés l'un de l'autre.
 *
 * Toute requête externe non simulée est bloquée (et notée dans `unmocked`).
 */
export interface MockOptions {
  /** Artiste injecté en tête des similaires de chaque « Beta n ». */
  target?: string;
}

export interface Mocks {
  unmocked: string[];
}

const ASSETS = "https://e2e.invalid/";
const PICTURE = `${ASSETS}picture.png`;
const PREVIEW = `${ASSETS}preview.wav`;

// PNG 1×1
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

/** WAV de silence (0,5 s, 8 kHz, 8 bits mono). */
function silentWav(): Buffer {
  const samples = 4000;
  const buf = Buffer.alloc(44 + samples, 0x80);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + samples, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(8000, 24);
  buf.writeUInt32LE(8000, 28);
  buf.writeUInt16LE(1, 32);
  buf.writeUInt16LE(8, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(samples, 40);
  return buf;
}

export function similarsOf(name: string, options: MockOptions = {}): string[] {
  const range = (prefix: string) => Array.from({ length: 20 }, (_, i) => `${prefix}${i + 1}`);
  if (name === "Alpha") {
    return range("Beta ");
  }
  const list = range(`${name}.`);
  return /^Beta \d+$/.test(name) && options.target ? [options.target, ...list] : list;
}

function lastfm(url: URL, options: MockOptions): unknown {
  const p = url.searchParams;
  const artist = p.get("artist") ?? "";
  switch (p.get("method")) {
    case "artist.search":
      return { results: { artistmatches: { artist: artist ? [{ name: artist, mbid: "" }] : [] } } };
    case "artist.getsimilar": {
      const limit = Number(p.get("limit")) || 50;
      return {
        similarartists: { artist: similarsOf(artist, options).slice(0, limit).map((name) => ({ name, mbid: "", match: "1" })) },
      };
    }
    case "artist.getinfo":
      return {
        artist: {
          name: artist,
          url: `https://www.last.fm/music/${encodeURIComponent(artist)}`,
          bio: {
            summary: `${artist} is a test artist. <a href="https://www.last.fm/music/x">Read more on Last.fm</a>`,
          },
          tags: { tag: [{ name: "rock" }, { name: "test" }] },
        },
      };
    case "artist.gettoptracks":
      // mêmes titres que les extraits Deezer simulés : la vérification de l'homonyme réussit
      return { toptracks: { track: [{ name: "Test Song 1" }, { name: "Test Song 2" }] } };
    case "chart.gettopartists":
      // deux artistes populaires sans similaire commun : le tirage du mode jeu les retient
      return {
        artists: { artist: ["Alpha", "Zeta"].map((name) => ({ name, mbid: "", listeners: "5000000" })) },
      };
    default:
      return { error: 3, message: "Invalid method (e2e mock)" };
  }
}

/** Deezer répond en JSONP : `callback(données)`. */
function deezer(url: URL, ids: Map<number, string>): unknown {
  const path = url.pathname.replace(/^\/+/, "");
  const idOf = (name: string) => {
    let id = 1;
    for (const ch of name) {
      id = (id * 31 + ch.charCodeAt(0)) % 1_000_000;
    }
    ids.set(id, name);
    return id;
  };
  if (path === "search/artist") {
    const q = url.searchParams.get("q") ?? "";
    return {
      data: [{ id: idOf(q), name: q, picture_small: PICTURE, picture_medium: PICTURE, picture_big: PICTURE, nb_fan: 1000 }],
    };
  }
  const top = /^artist\/(\d+)\/top$/.exec(path);
  if (top) {
    const id = Number(top[1]);
    const name = ids.get(id) ?? "Unknown";
    return {
      data: [1, 2].map((n) => ({
        id: id * 10 + n,
        title: `Test Song ${n}`,
        readable: true,
        link: `https://www.deezer.com/track/${id * 10 + n}`,
        preview: PREVIEW,
        artist: { name },
        album: { title: "Test Album" },
      })),
    };
  }
  const track = /^track\/(\d+)$/.exec(path);
  if (track) {
    return { id: Number(track[1]), preview: PREVIEW };
  }
  return { error: { message: "unknown path (e2e mock)" } };
}

export async function mockApis(page: Page, options: MockOptions = {}): Promise<Mocks> {
  const mocks: Mocks = { unmocked: [] };
  const ids = new Map<number, string>();
  const wav = silentWav();
  await page.route("**/*", (route: Route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "localhost") {
      return route.continue();
    }
    if (url.hostname === "ws.audioscrobbler.com") {
      return route.fulfill({ json: lastfm(url, options), headers: { "access-control-allow-origin": "*" } });
    }
    if (url.hostname === "api.deezer.com") {
      const callback = url.searchParams.get("callback") ?? "callback";
      return route.fulfill({
        contentType: "application/javascript",
        body: `${callback}(${JSON.stringify(deezer(url, ids))})`,
      });
    }
    if (url.href === PICTURE) {
      return route.fulfill({ contentType: "image/png", body: PNG });
    }
    if (url.href === PREVIEW) {
      return route.fulfill({ contentType: "audio/wav", body: wav });
    }
    mocks.unmocked.push(url.href);
    return route.abort();
  });
  return mocks;
}

/** Erreurs JavaScript de la page (à vérifier vides en fin de test). */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

/** Ajoute un artiste depuis le champ de saisie (mode exploration). */
export async function addArtist(page: Page, name: string): Promise<void> {
  await page.locator("#artist-input").fill(name);
  await page.locator("#artist-submit").click();
  await expect(page.locator("#overview-name")).toHaveText(`About ${name}`);
}

/**
 * Clique sur un nœud quelconque de la carte (dessinée dans un canvas : on balaie l'écran en spirale
 * jusqu'à ce que le curseur devienne une main) et renvoie le nom de l'artiste exploré.
 */
export async function clickSomeNode(page: Page): Promise<string> {
  // la simulation écarte les nœuds puis la vue se recadre (700 ms + animation)
  await page.waitForTimeout(1500);
  const box = (await page.locator("#map").boundingBox())!;
  const overviewName = async () => ((await page.locator("#overview-name").textContent()) ?? "").replace(/^About /, "");
  const before = await overviewName();
  const top = box.y + 170; // sous le formulaire et les outils (mobile)
  const bottom = box.y + box.height - 110;
  for (let r = 30; r < Math.max(box.width, box.height) / 2; r += 18) {
    for (let a = 0; a < 360; a += 10) {
      const x = box.x + box.width / 2 + r * Math.cos((a * Math.PI) / 180);
      const y = box.y + box.height / 2 + r * Math.sin((a * Math.PI) / 180);
      if (y < top || y > bottom || x < box.x + 50 || x > box.x + box.width - 50) {
        continue;
      }
      await page.mouse.move(x, y);
      if ((await page.locator("#map").evaluate((el) => el.style.cursor)) === "pointer") {
        await page.mouse.click(x, y);
        // un nœud déjà exploré (l'artiste de départ…) réaffiche sa fiche : on continue de chercher
        const changed = await expect
          .poll(overviewName, { timeout: 1500 })
          .not.toBe(before)
          .then(() => true)
          .catch(() => false);
        if (changed) {
          return overviewName();
        }
      }
    }
  }
  throw new Error("no clickable node found on the map");
}

type Box = { x: number; y: number; width: number; height: number };

/** Vrai si deux rectangles se chevauchent (tolérance d'un pixel). */
export function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.width - 1 && b.x < a.x + a.width - 1 && a.y < b.y + b.height - 1 && b.y < a.y + a.height - 1;
}
