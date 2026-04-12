export interface ElementInfo {
  tagName: string;
  id: string;
  className: string;
  textContent: string;
  selector: string;
  pagePath: string;
  rect: { top: number; left: number; width: number; height: number };
}

type EventHandlers = {
  elementSelected: (info: ElementInfo) => void;
};

const HOVER_CLASS = "coddy-edit-hover";
const SELECTED_CLASS = "coddy-edit-selected";
const STYLE_ID = "coddy-edit-style";

const INJECTED_CSS = `
.${HOVER_CLASS} {
  outline: 2px dashed #22d3ee !important;
  outline-offset: 2px !important;
  cursor: crosshair !important;
}
.${SELECTED_CLASS} {
  outline: 2px solid #10b981 !important;
  outline-offset: 2px !important;
}
`;

function generateSelector(el: Element): string {
  const tag = el.tagName.toLowerCase();

  if (el.id) {
    return `${tag}#${el.id}`;
  }

  if (el.className && typeof el.className === "string") {
    const classes = el.className
      .split(/\s+/)
      .filter((c) => c && c !== HOVER_CLASS && c !== SELECTED_CLASS)
      .slice(0, 3);
    if (classes.length > 0) {
      return `${tag}.${classes.join(".")}`;
    }
  }

  // Build nth-child path (max 4 levels)
  const parts: string[] = [];
  let current: Element | null = el;
  for (
    let i = 0;
    i < 4 && current && current !== current.ownerDocument.documentElement;
    i++
  ) {
    const parent: Element | null = current.parentElement;
    if (!parent) {
      parts.unshift(current.tagName.toLowerCase());
      break;
    }
    const siblings = Array.from(parent.children);
    const index = siblings.indexOf(current) + 1;
    parts.unshift(`${current.tagName.toLowerCase()}:nth-child(${index})`);
    current = parent;
  }
  return parts.join(" > ");
}

function getElementInfo(el: Element, doc: Document): ElementInfo {
  const rect = el.getBoundingClientRect();
  const text = (el as HTMLElement).innerText ?? el.textContent ?? "";
  return {
    tagName: el.tagName,
    id: el.id || "",
    className:
      typeof el.className === "string"
        ? el.className
            .split(/\s+/)
            .filter((c) => c && c !== HOVER_CLASS && c !== SELECTED_CLASS)
            .join(" ")
        : "",
    textContent: text.trim().slice(0, 80),
    selector: generateSelector(el),
    pagePath: doc.location?.pathname ?? "/",
    rect: {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    },
  };
}

export class VisualEditor {
  private iframe: HTMLIFrameElement | null = null;
  private active = false;
  private listeners: Partial<EventHandlers> = {};

  private hoverTarget: Element | null = null;
  private boundMouseover: ((e: Event) => void) | null = null;
  private boundMouseout: ((e: Event) => void) | null = null;
  private boundClick: ((e: Event) => void) | null = null;

  attach(iframe: HTMLIFrameElement): void {
    this.iframe = iframe;
  }

  detach(): void {
    this.disable();
    this.iframe = null;
  }

  on<K extends keyof EventHandlers>(event: K, handler: EventHandlers[K]): void {
    this.listeners[event] = handler;
  }

  off<K extends keyof EventHandlers>(event: K): void {
    delete this.listeners[event];
  }

  isActive(): boolean {
    return this.active;
  }

  enable(): void {
    if (this.active) return;
    this.active = true;
    if (this.iframe) {
      this.inject();
    }
    // If iframe not attached yet, inject() will run when reinject() is called from onLoad
  }

  disable(): void {
    if (!this.active) return;
    this.active = false;
    this.removeInjected();
  }

  clearSelection(): void {
    const doc = this.getDoc();
    if (!doc) return;
    doc
      .querySelectorAll(`.${SELECTED_CLASS}`)
      .forEach((el) => el.classList.remove(SELECTED_CLASS));
  }

  reinject(): void {
    if (!this.active) return;
    this.removeInjected();
    this.inject();
  }

  private getDoc(): Document | null {
    try {
      return this.iframe?.contentDocument ?? null;
    } catch {
      return null;
    }
  }

  private inject(): void {
    const doc = this.getDoc();
    if (!doc || !doc.body) return;

    // Inject CSS
    if (!doc.getElementById(STYLE_ID)) {
      const style = doc.createElement("style");
      style.id = STYLE_ID;
      style.textContent = INJECTED_CSS;
      doc.head.appendChild(style);
    }

    // Inject event listeners
    this.boundMouseover = (e: Event) => {
      const target = e.target as Element;
      if (!target || target === doc.body || target === doc.documentElement)
        return;
      if (this.hoverTarget && this.hoverTarget !== target) {
        this.hoverTarget.classList.remove(HOVER_CLASS);
      }
      target.classList.add(HOVER_CLASS);
      this.hoverTarget = target;
    };

    this.boundMouseout = (e: Event) => {
      const target = e.target as Element;
      target?.classList.remove(HOVER_CLASS);
      if (this.hoverTarget === target) {
        this.hoverTarget = null;
      }
    };

    this.boundClick = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      const target = e.target as Element;
      if (!target || target === doc.body || target === doc.documentElement)
        return;

      // Clear previous selection
      doc
        .querySelectorAll(`.${SELECTED_CLASS}`)
        .forEach((el) => el.classList.remove(SELECTED_CLASS));
      target.classList.add(SELECTED_CLASS);

      const info = getElementInfo(target, doc);
      this.listeners.elementSelected?.(info);
    };

    doc.addEventListener("mouseover", this.boundMouseover, true);
    doc.addEventListener("mouseout", this.boundMouseout, true);
    doc.addEventListener("click", this.boundClick, true);
  }

  private removeInjected(): void {
    const doc = this.getDoc();
    if (!doc) return;

    // Remove style
    doc.getElementById(STYLE_ID)?.remove();

    // Remove listeners
    if (this.boundMouseover)
      doc.removeEventListener("mouseover", this.boundMouseover, true);
    if (this.boundMouseout)
      doc.removeEventListener("mouseout", this.boundMouseout, true);
    if (this.boundClick)
      doc.removeEventListener("click", this.boundClick, true);
    this.boundMouseover = null;
    this.boundMouseout = null;
    this.boundClick = null;

    // Clear visual effects
    doc
      .querySelectorAll(`.${HOVER_CLASS}`)
      .forEach((el) => el.classList.remove(HOVER_CLASS));
    doc
      .querySelectorAll(`.${SELECTED_CLASS}`)
      .forEach((el) => el.classList.remove(SELECTED_CLASS));
    this.hoverTarget = null;
  }
}
