/** Récupère un élément par id ; échoue tôt si le HTML ne correspond pas au code. */
export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`#${id} not found`);
  }
  return el as T;
}

/** Affiche un message temporaire. */
export function toast(message: string, options: { error?: boolean; durationMs?: number } = {}): void {
  const container = byId("toasts");
  const el = document.createElement("div");
  el.className = "toast" + (options.error ? " error" : "");
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add("leaving");
    setTimeout(() => el.remove(), 400);
  }, options.durationMs ?? 3500);
}

/** Panneaux escamotables : ouverture au survol (CSS) ou au clic/toucher sur l'onglet. */
export function setupDrawers(): void {
  for (const drawer of document.querySelectorAll<HTMLElement>(".drawer")) {
    const tab = drawer.querySelector<HTMLButtonElement>(".drawer-tab");
    tab?.addEventListener("click", () => {
      const open = drawer.classList.toggle("open");
      tab.setAttribute("aria-expanded", String(open));
    });
  }
}

export function closeDrawers(): void {
  for (const drawer of document.querySelectorAll<HTMLElement>(".drawer.open")) {
    drawer.classList.remove("open");
    drawer.querySelector(".drawer-tab")?.setAttribute("aria-expanded", "false");
  }
}

/** Lecture/écriture tolérantes de localStorage (navigation privée, stockage bloqué). */
export const prefs = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(`furzr.${key}`);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      localStorage.setItem(`furzr.${key}`, value);
    } catch {
      /* ignoré */
    }
  },
};
