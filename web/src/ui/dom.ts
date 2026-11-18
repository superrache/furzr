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

/**
 * Panneaux escamotables : ouverture au clic/toucher sur l'onglet, ou au survol de l'onglet à la
 * souris. Une fois ouvert par survol, le panneau le reste tant que la souris est dedans (l'onglet
 * s'éloigne du pointeur en s'ouvrant, mais le pointeur reste dans le panneau).
 */
export function setupDrawers(): void {
  for (const drawer of document.querySelectorAll<HTMLElement>(".drawer")) {
    const tab = drawer.querySelector<HTMLButtonElement>(".drawer-tab");
    tab?.addEventListener("click", () => {
      const open = drawer.classList.toggle("open");
      tab.setAttribute("aria-expanded", String(open));
    });
    tab?.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "mouse") {
        drawer.classList.add("hovered");
      }
    });
    drawer.addEventListener("pointerleave", () => drawer.classList.remove("hovered"));
  }
}

/**
 * Publie la place occupée par un élément (hauteur + `gap`, 0 s'il est masqué) dans la variable CSS
 * `name` de la racine, pour placer d'autres éléments à côté sans chevauchement.
 */
export function exposeHeight(el: HTMLElement, name: string, gap: number): void {
  const update = () => {
    const height = el.offsetHeight; // 0 s'il est masqué
    const space = height ? height + gap : 0;
    document.documentElement.style.setProperty(name, `${space}px`);
  };
  new ResizeObserver(update).observe(el);
  update();
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
