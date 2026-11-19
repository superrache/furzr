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

/** Petit écran : les panneaux « furzr » et « Partager » s'ouvrent en fenêtres flottantes (voir style.css). */
const FLOATING = matchMedia("(max-width: 720px)");

/**
 * Panneaux escamotables : ouverture au clic/toucher sur l'onglet, ou au survol de l'onglet à la
 * souris. Une fois ouvert par survol, le panneau le reste tant que la souris est dedans (l'onglet
 * s'éloigne du pointeur en s'ouvrant, mais le pointeur reste dans le panneau).
 *
 * Sur petit écran, les panneaux de gauche et de droite deviennent des fenêtres flottantes : une seule
 * à la fois, fermées par leur bouton ×, un toucher sur le voile (le panneau lui-même, hors contenu) ou
 * Échap.
 */
export function setupDrawers(): void {
  const drawers = [...document.querySelectorAll<HTMLElement>(".drawer")];
  const floating = (drawer: HTMLElement) => FLOATING.matches && !drawer.classList.contains("drawer-bottom");
  const setOpen = (drawer: HTMLElement, open: boolean, focus = false) => {
    const tab = drawer.querySelector<HTMLButtonElement>(".drawer-tab");
    drawer.classList.toggle("open", open);
    tab?.setAttribute("aria-expanded", String(open));
    if (!focus || !floating(drawer)) {
      return;
    }
    // fenêtre flottante : le focus va au bouton ×, puis revient à l'onglet
    (open ? drawer.querySelector<HTMLButtonElement>(".drawer-close") : tab)?.focus();
  };
  for (const drawer of drawers) {
    const tab = drawer.querySelector<HTMLButtonElement>(".drawer-tab");
    tab?.addEventListener("click", () => {
      const open = !drawer.classList.contains("open");
      if (open && floating(drawer)) {
        for (const other of drawers) {
          if (other !== drawer) {
            setOpen(other, false);
          }
        }
      }
      setOpen(drawer, open, true);
    });
    tab?.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "mouse") {
        drawer.classList.add("hovered");
      }
    });
    drawer.addEventListener("pointerleave", () => drawer.classList.remove("hovered"));
    drawer.querySelector(".drawer-close")?.addEventListener("click", () => setOpen(drawer, false, true));
    // le voile de la fenêtre flottante est un pseudo-élément du panneau : un clic dessus le vise
    drawer.addEventListener("click", (e) => {
      if (e.target === drawer && floating(drawer)) {
        setOpen(drawer, false, true);
      }
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") {
      return;
    }
    const open = drawers.find((d) => d.classList.contains("open") && floating(d));
    if (open) {
      setOpen(open, false, true);
    }
  });
}

/**
 * Demande de confirmation dans un petit panneau centré (au lieu de confirm() du navigateur).
 * Vrai pour « Continuer » ; faux pour « Annuler », Échap ou un clic à côté du panneau.
 */
export function confirmDialog(message: string): Promise<boolean> {
  const dialog = byId<HTMLDialogElement>("confirm");
  byId("confirm-message").textContent = message;
  // clic sur le voile (la cible est alors le <dialog> lui-même, sans marge intérieure)
  dialog.onclick = (e) => {
    if (e.target === dialog) {
      dialog.close();
    }
  };
  return new Promise((resolve) => {
    // le <form method="dialog"> ferme avec la valeur du bouton ; Échap et le voile, sans valeur
    dialog.addEventListener("close", () => resolve(dialog.returnValue === "ok"), { once: true });
    dialog.returnValue = "";
    dialog.showModal();
    // comme confirm() : Entrée continue
    byId("confirm-ok").focus();
  });
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
