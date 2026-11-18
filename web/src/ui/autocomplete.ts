import type { Suggestion } from "../api/types";
import { formatCompact, t } from "../i18n";

/** Délai après la dernière frappe avant d'interroger l'API. */
const DEBOUNCE_MS = 200;
/** Nombre minimal de caractères pour proposer des artistes. */
const MIN_CHARS = 2;

/**
 * Liste déroulante d'artistes sous le champ de saisie (motif ARIA « combobox ») :
 * flèches haut/bas, Entrée, Échap, clic ou toucher.
 */
export class Autocomplete {
  private readonly list: HTMLUListElement;
  private items: Suggestion[] = [];
  private active = -1;
  private timer: ReturnType<typeof setTimeout> | undefined;
  /** Les réponses d'une saisie dépassée sont ignorées. */
  private requestId = 0;

  constructor(
    private readonly input: HTMLInputElement,
    private fetchSuggestions: (query: string) => Promise<Suggestion[]>,
    private readonly onSelect: (suggestion: Suggestion) => void,
  ) {
    this.list = document.createElement("ul");
    this.list.id = `${input.id}-suggestions`;
    this.list.className = "suggestions";
    this.list.setAttribute("role", "listbox");
    this.list.hidden = true;
    input.form!.append(this.list);

    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-controls", this.list.id);
    input.setAttribute("aria-expanded", "false");

    input.addEventListener("input", () => this.schedule());
    input.addEventListener("keydown", (e) => this.onKeyDown(e));
    input.addEventListener("blur", () => this.close());
    // mousedown annulé : le champ garde le focus, le clic peut sélectionner
    this.list.addEventListener("mousedown", (e) => e.preventDefault());
    this.list.addEventListener("click", (e) => {
      const li = (e.target as Element).closest<HTMLLIElement>("li[data-index]");
      if (li) {
        this.select(Number(li.dataset.index));
      }
    });
  }

  /** Change la source des propositions (changement de mode). */
  setSource(fetchSuggestions: (query: string) => Promise<Suggestion[]>): void {
    this.fetchSuggestions = fetchSuggestions;
    this.close();
  }

  /** Ferme la liste et annule toute recherche en cours. */
  close(): void {
    clearTimeout(this.timer);
    this.requestId++;
    this.render([]);
  }

  private schedule(): void {
    clearTimeout(this.timer);
    const query = this.input.value.trim();
    const id = ++this.requestId;
    if (query.length < MIN_CHARS) {
      this.render([]);
      return;
    }
    this.timer = setTimeout(async () => {
      try {
        const items = await this.fetchSuggestions(query);
        if (id === this.requestId) {
          this.render(items);
        }
      } catch {
        /* sans propositions, la saisie libre reste possible */
      }
    }, DEBOUNCE_MS);
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (this.list.hidden) {
      if (e.key === "ArrowDown" && this.input.value.trim().length >= MIN_CHARS) {
        e.preventDefault();
        this.schedule();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        this.setActive((this.active + 1) % this.items.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        this.setActive(this.active <= 0 ? this.items.length - 1 : this.active - 1);
        break;
      case "Enter":
        if (this.active >= 0) {
          e.preventDefault();
          this.select(this.active);
        } else {
          this.close();
        }
        break;
      case "Escape":
        // ferme la liste sans vider le champ (comportement natif d'un input search)
        e.preventDefault();
        this.close();
        break;
      case "Tab":
        this.close();
        break;
    }
  }

  private select(index: number): void {
    const item = this.items[index];
    if (!item) {
      return;
    }
    this.input.value = item.name;
    this.close();
    this.onSelect(item);
  }

  private setActive(index: number): void {
    this.active = index;
    this.list.querySelectorAll("li").forEach((li, i) => li.setAttribute("aria-selected", String(i === index)));
    const li = this.list.children[index] as HTMLElement | undefined;
    if (li) {
      this.input.setAttribute("aria-activedescendant", li.id);
      li.scrollIntoView({ block: "nearest" });
    } else {
      this.input.removeAttribute("aria-activedescendant");
    }
  }

  private render(items: Suggestion[]): void {
    this.items = items;
    this.active = -1;
    this.input.removeAttribute("aria-activedescendant");
    this.list.replaceChildren(
      ...items.map((item, i) => {
        const li = document.createElement("li");
        li.id = `${this.list.id}-${i}`;
        li.dataset.index = String(i);
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", "false");
        const img = document.createElement("img");
        img.alt = "";
        img.loading = "lazy";
        if (item.picture) {
          img.src = item.picture;
        } else {
          img.className = "empty";
        }
        const name = document.createElement("span");
        name.className = "name";
        name.textContent = item.name;
        li.append(img, name);
        const detailText = item.fans ? t("suggestions.fans", { n: formatCompact(item.fans) }) : item.detail;
        if (detailText) {
          const detail = document.createElement("span");
          detail.className = "detail";
          detail.textContent = detailText;
          li.append(detail);
        }
        return li;
      }),
    );
    this.list.setAttribute("aria-label", t("suggestions.label"));
    const open = items.length > 0;
    this.list.hidden = !open;
    this.input.setAttribute("aria-expanded", String(open));
  }
}
