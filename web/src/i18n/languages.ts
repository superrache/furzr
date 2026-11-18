/**
 * Langues proposées : celles pour lesquelles Last.fm fournit des bios (paramètre `lang` de
 * artist.getinfo, vérifié le 2026-11-18). Toute autre valeur renvoie une bio vide.
 * Wikidata et TMDB couvrent beaucoup plus de langues, Deezer n'en dépend pas :
 * c'est donc Last.fm qui fixe la liste.
 */
export const LANGUAGES = {
  en: { name: "English", tmdb: "en-US" },
  fr: { name: "Français", tmdb: "fr-FR" },
  de: { name: "Deutsch", tmdb: "de-DE" },
  es: { name: "Español", tmdb: "es-ES" },
  it: { name: "Italiano", tmdb: "it-IT" },
  pt: { name: "Português", tmdb: "pt-BR" },
  pl: { name: "Polski", tmdb: "pl-PL" },
  ru: { name: "Русский", tmdb: "ru-RU" },
  sv: { name: "Svenska", tmdb: "sv-SE" },
  tr: { name: "Türkçe", tmdb: "tr-TR" },
  ja: { name: "日本語", tmdb: "ja-JP" },
  zh: { name: "中文", tmdb: "zh-CN" },
} as const;

export type Lang = keyof typeof LANGUAGES;

export const DEFAULT_LANG: Lang = "en";

export function isLang(x: unknown): x is Lang {
  return typeof x === "string" && Object.hasOwn(LANGUAGES, x);
}

/** « fr-CA » → « fr », « zh-Hant-TW » → « zh » ; null si la langue n'est pas proposée. */
export function toLang(tag: string | null | undefined): Lang | null {
  const primary = tag?.trim().toLowerCase().split(/[-_]/)[0];
  return isLang(primary) ? primary : null;
}

/**
 * Langue de départ : paramètre d'URL `lang`, puis choix mémorisé, puis préférences du
 * navigateur (dans l'ordre), puis anglais.
 */
export function detectLang(urlParam: string | null, saved: string | null, browser: readonly string[]): Lang {
  for (const candidate of [urlParam, saved, ...browser]) {
    const lang = toLang(candidate);
    if (lang) {
      return lang;
    }
  }
  return DEFAULT_LANG;
}

/** Fonction passée aux fournisseurs de données pour connaître la langue courante. */
export type LangGetter = () => Lang;
