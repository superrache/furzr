/** Échappe une chaîne pour insertion dans du HTML. */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Échappe `<`, `>`, `"` et les `&` qui ne commencent pas déjà une entité HTML. */
function escapeKeepingEntities(text: string): string {
  return text
    .replace(/&(?!#?\w+;)/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const ANCHOR = /<a\s[^>]*?href\s*=\s*"(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

/**
 * Assainit le résumé de bio Last.fm : texte brut + liens http(s) uniquement,
 * ouverts dans un nouvel onglet. Tout autre balisage est retiré.
 */
export function sanitizeBio(raw: string): string {
  const anchors: string[] = [];
  const withMarkers = raw.replace(ANCHOR, (_m, href: string, label: string) => {
    const text = label.replace(/<[^>]*>/g, "");
    anchors.push(
      `<a href="${escapeKeepingEntities(href)}" target="_blank" rel="noopener noreferrer">${escapeKeepingEntities(text)}</a>`,
    );
    return `\u0000${anchors.length - 1}\u0000`;
  });
  const stripped = withMarkers.replace(/<[^>]*>/g, "");
  return escapeKeepingEntities(stripped)
    .replace(/\u0000(\d+)\u0000/g, (_m, i: string) => anchors[Number(i)])
    .trim();
}
