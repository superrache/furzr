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
    if (drawer.classList.contains("drawer-bottom")) {
      trackPeek(drawer);
    }
  }
}

/**
 * Panneau du bas : replié, il ne laisse dépasser que ce qui précède `.drawer-content` (nom de l'artiste,
 * extrait en cours). Cette hauteur varie (titre sur une ou deux lignes, chargement…) : on la mesure
 * et on la passe au CSS dans `--peek`.
 */
function trackPeek(drawer: HTMLElement): void {
  const content = drawer.querySelector<HTMLElement>(".drawer-content");
  if (!content) {
    return;
  }
  const update = () => {
    // offsetTop ignore la transformation : c'est la hauteur de l'en-tête, padding du panneau compris
    if (content.offsetParent === drawer) {
      drawer.style.setProperty("--peek", `${content.offsetTop}px`);
    }
  };
  const observer = new ResizeObserver(update);
  observer.observe(drawer);
  for (const child of drawer.children) {
    if (child !== content) {
      observer.observe(child);
    }
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
