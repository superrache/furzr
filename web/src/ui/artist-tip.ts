import type { ArtistInfo } from "../api/types";

/**
 * Infobulle d'artiste (photo, genres, début de la bio), comme la fiche « À propos » en plus court.
 * Souris : au survol. Clavier : au focus. Toucher : un appui ouvre, un appui ailleurs ferme.
 * Elle n'est pas interactive (pointer-events: none) : la bio y est affichée en texte simple.
 */
export class ArtistTip {
  private anchor: HTMLElement | null = null;
  private request = 0;

  constructor(
    private readonly el: HTMLElement,
    private readonly loadingText: () => string,
  ) {
    const hide = () => this.hide();
    window.addEventListener("resize", hide);
    window.addEventListener("scroll", hide, true);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.hide();
      }
    });
    // appui en dehors du nom (écrans tactiles)
    document.addEventListener("pointerdown", (e) => {
      if (this.anchor && !this.anchor.contains(e.target as Node)) {
        this.hide();
      }
    });
  }

  /** Branche l'infobulle sur un élément ; `info` n'est appelé qu'à l'affichage (cache côté appelant). */
  attach(anchor: HTMLElement, name: string, info: () => Promise<ArtistInfo | null>): void {
    anchor.tabIndex = 0;
    anchor.setAttribute("aria-describedby", this.el.id);
    const show = () => this.show(anchor, name, info());
    anchor.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "mouse") {
        show();
      }
    });
    anchor.addEventListener("pointerleave", (e) => {
      if (e.pointerType === "mouse") {
        this.hide(anchor);
      }
    });
    // focus au clavier seulement : un appui ou un clic donne aussi le focus, et le clic bascule déjà
    anchor.addEventListener("focus", () => {
      if (anchor.matches(":focus-visible")) {
        show();
      }
    });
    anchor.addEventListener("blur", () => this.hide(anchor));
    // toucher (et clic sans PointerEvent) : bascule ; à la souris, le survol suffit
    anchor.addEventListener("click", (e) => {
      if ((e as PointerEvent).pointerType === "mouse") {
        return;
      }
      if (this.anchor === anchor && !this.el.hidden) {
        this.hide();
      } else {
        show();
      }
    });
  }

  show(anchor: HTMLElement, name: string, info: Promise<ArtistInfo | null>): void {
    const request = ++this.request;
    this.anchor = anchor;
    this.render(name, null);
    this.el.hidden = false;
    this.place();
    info
      .catch(() => null)
      .then((result) => {
        if (request === this.request) {
          this.render(name, result ?? undefined);
          this.place();
        }
      });
  }

  /** Masque l'infobulle (seulement si elle appartient à `anchor`, quand il est donné). */
  hide(anchor?: HTMLElement): void {
    if (anchor && anchor !== this.anchor) {
      return;
    }
    this.request++;
    this.anchor = null;
    this.el.hidden = true;
  }

  /** `info` : null = en cours de chargement, undefined = rien trouvé. */
  private render(name: string, info: ArtistInfo | null | undefined): void {
    const text = document.createElement("div");
    text.className = "tip-text";
    const title = document.createElement("strong");
    title.textContent = info?.name ?? name;
    text.append(title);
    if (info === null) {
      const loading = document.createElement("p");
      loading.className = "tip-bio";
      loading.textContent = this.loadingText();
      text.append(loading);
    }
    if (info?.tags.length) {
      const tags = document.createElement("p");
      tags.className = "tip-tags";
      tags.textContent = info.tags.join(" · ");
      text.append(tags);
    }
    const bio = info ? bioText(info.bioHtml) : "";
    if (bio) {
      const p = document.createElement("p");
      p.className = "tip-bio";
      p.textContent = bio;
      text.append(p);
    }
    const children: HTMLElement[] = [];
    if (info?.image) {
      const img = document.createElement("img");
      img.className = "tip-image";
      img.src = info.image;
      img.alt = "";
      children.push(img);
    }
    children.push(text);
    this.el.replaceChildren(...children);
  }

  /** Sous le nom, ou au-dessus s'il n'y a pas la place ; toujours dans l'écran. */
  private place(): void {
    if (!this.anchor) {
      return;
    }
    const margin = 8;
    // largeur visible (innerWidth peut inclure les panneaux cachés hors écran sur mobile)
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const rect = this.anchor.getBoundingClientRect();
    const { offsetWidth: width, offsetHeight: height } = this.el;
    const left = Math.min(Math.max(margin, rect.left), viewportWidth - width - margin);
    let top = rect.bottom + margin;
    if (top + height > viewportHeight - margin && rect.top - margin - height > margin) {
      top = rect.top - margin - height;
    }
    this.el.style.left = `${Math.max(margin, left)}px`;
    this.el.style.top = `${top}px`;
  }
}

/**
 * Bio en texte brut. Le HTML est déjà assaini (sanitizeBio / escapeHtml) ; DOMParser produit en plus
 * un document inerte : ni script exécuté, ni image chargée.
 */
function bioText(html: string): string {
  return (new DOMParser().parseFromString(html, "text/html").body.textContent ?? "").replace(/\s+/g, " ").trim();
}
