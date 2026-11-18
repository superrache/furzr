import { DEFAULT_LANG, type Lang } from "./languages";
import { en, type MessageKey, type Messages } from "./locales/en";

export { LANGUAGES, detectLang, isLang, type Lang } from "./languages";
export type { MessageKey } from "./locales/en";

/**
 * L'anglais est embarqué (repli) ; les autres catalogues sont des modules séparés, chargés à la
 * demande : ~18 Ko gzip pour les 11, soit 20 % du bundle s'ils étaient tous inclus.
 */
export const LOADERS: Record<Exclude<Lang, "en">, () => Promise<Messages>> = {
  fr: () => import("./locales/fr").then((m) => m.fr),
  de: () => import("./locales/de").then((m) => m.de),
  es: () => import("./locales/es").then((m) => m.es),
  it: () => import("./locales/it").then((m) => m.it),
  pt: () => import("./locales/pt").then((m) => m.pt),
  pl: () => import("./locales/pl").then((m) => m.pl),
  ru: () => import("./locales/ru").then((m) => m.ru),
  sv: () => import("./locales/sv").then((m) => m.sv),
  tr: () => import("./locales/tr").then((m) => m.tr),
  ja: () => import("./locales/ja").then((m) => m.ja),
  zh: () => import("./locales/zh").then((m) => m.zh),
};

const loaded: Partial<Record<Lang, Messages>> = { en };
let current: Lang = DEFAULT_LANG;

export const getLang = (): Lang => current;

/**
 * Charge le catalogue puis bascule. En cas d'échec réseau, on reste dans la langue actuelle
 * (renvoie false).
 */
export async function setLang(lang: Lang): Promise<boolean> {
  if (lang !== "en" && !loaded[lang]) {
    try {
      loaded[lang] = await LOADERS[lang]();
    } catch {
      return false;
    }
  }
  current = lang;
  return true;
}

/** Texte traduit ; `{nom}` est remplacé par `vars.nom`. Repli sur l'anglais si la clé manque. */
export function t(key: MessageKey, vars: Record<string, string | number> = {}): string {
  const template = loaded[current]?.[key] ?? en[key];
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

/** Nombre compact selon la langue : 4,1 M / 4.1M / 410万… */
export function formatCompact(n: number): string {
  return new Intl.NumberFormat(current, { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

const SERVICE_LINKS: Record<string, [string, string]> = {
  lastfm: ["https://www.last.fm", "Last.fm"],
  wikidata: ["https://www.wikidata.org", "Wikidata"],
  tmdb: ["https://www.themoviedb.org", "TMDB"],
  deezer: ["https://www.deezer.com", "Deezer"],
};

const serviceLinks = Object.fromEntries(
  Object.entries(SERVICE_LINKS).map(([key, [href, label]]) => [
    key,
    `<a href="${href}" target="_blank" rel="noopener">${label}</a>`,
  ]),
);

/**
 * Traduit le document :
 * - `data-i18n="clé"` : texte ;
 * - `data-i18n-html="clé"` : HTML de confiance de nos catalogues (liens des services insérés) ;
 * - `data-i18n-attr="title:clé;aria-label:clé"` : attributs.
 */
export function translateDocument(root: ParentNode = document): void {
  for (const el of root.querySelectorAll<HTMLElement>("[data-i18n]")) {
    el.textContent = t(el.dataset.i18n as MessageKey);
  }
  for (const el of root.querySelectorAll<HTMLElement>("[data-i18n-html]")) {
    el.innerHTML = t(el.dataset.i18nHtml as MessageKey, serviceLinks);
  }
  for (const el of root.querySelectorAll<HTMLElement>("[data-i18n-attr]")) {
    for (const pair of el.dataset.i18nAttr!.split(";")) {
      const [attr, key] = pair.split(":").map((s) => s.trim());
      if (attr && key) {
        el.setAttribute(attr, t(key as MessageKey));
      }
    }
  }
  if (root === document) {
    document.documentElement.lang = current;
    document.querySelector('meta[name="description"]')?.setAttribute("content", t("meta.description"));
  }
}
