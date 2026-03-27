import { onUnmounted, ref } from "vue";

export interface JumpMark {
  text: string;
  /** The h3 heading element. */
  element: HTMLElement;
  /**
   * Elements that comprise this section's visual block — used in "tabs" mode
   * to show only the active section and hide all others.
   */
  sectionBlocks: HTMLElement[];
}

/** Recursively find elements matching a CSS selector, crossing shadow DOM boundaries. */
function findAllInShadowTree(root: Element | ShadowRoot, selector: string): HTMLElement[] {
  const results: HTMLElement[] = Array.from(root.querySelectorAll(selector)) as HTMLElement[];
  (root.querySelectorAll("*") as NodeListOf<Element>).forEach((el) => {
    if (el.shadowRoot) {
      results.push(...findAllInShadowTree(el.shadowRoot, selector));
    }
  });
  return results;
}

/** Recursively collect all h3 elements, crossing shadow DOM boundaries. */
function findAllH3s(root: Element | ShadowRoot): HTMLElement[] {
  return findAllInShadowTree(root, "h3");
}

/** Recursively collect all shadow roots beneath a root element. */
function findAllShadowRoots(root: Element | ShadowRoot): ShadowRoot[] {
  const roots: ShadowRoot[] = [];
  (root.querySelectorAll("*") as NodeListOf<Element>).forEach((el) => {
    if (el.shadowRoot) {
      roots.push(el.shadowRoot);
      roots.push(...findAllShadowRoots(el.shadowRoot));
    }
  });
  return roots;
}

/**
 * Walk up the DOM tree from `el`, crossing shadow DOM boundaries, and return
 * the first ancestor whose computed style has `overflow(-y): auto | scroll`.
 */
function findScrollableAncestor(el: HTMLElement): HTMLElement | null {
  let current: Node = el.parentNode!;
  while (current) {
    if (current instanceof HTMLElement) {
      const { overflow, overflowY } = getComputedStyle(current);
      if (/auto|scroll/.test(overflow) || /auto|scroll/.test(overflowY)) {
        return current;
      }
    }
    // Cross shadow DOM boundary upward
    if (!current.parentNode && current instanceof ShadowRoot) {
      current = current.host;
    } else {
      current = current.parentNode!;
    }
  }
  return null;
}

/**
 * Determine which DOM elements represent a section's visual block.
 *
 * Strategy A — h3 shares its parent with other h3s:
 *   Collect the h3 + all following siblings until the next h3.
 *
 * Strategy B — h3 is the only h3 in its parent:
 *   The parent IS the section container; return it.
 */
function getSectionBlocks(h3: HTMLElement, allH3s: HTMLElement[]): HTMLElement[] {
  const parent = h3.parentElement;
  if (!parent) return [h3];

  const siblingH3s = allH3s.filter((h) => h !== h3 && h.parentElement === parent);

  if (siblingH3s.length === 0) {
    // h3 is alone in its parent — the parent is the section wrapper
    return [parent];
  }

  // Collect siblings from this h3 up to (not including) the next h3
  const result: HTMLElement[] = [];
  let collecting = false;
  for (const child of Array.from(parent.children) as HTMLElement[]) {
    if (child === h3) {
      collecting = true;
    } else if (collecting && allH3s.includes(child)) {
      break;
    }
    if (collecting) result.push(child);
  }
  return result.length > 0 ? result : [parent];
}

/**
 * Scans a container element (and all nested shadow roots) for h3 headings and
 * exposes them as reactive JumpMark entries. Keeps the list updated via
 * MutationObservers so dynamically-rendered sections are picked up.
 */
export function useDialogJumpMarks() {
  const sections = ref<JumpMark[]>([]);
  const hasAdvancedOptions = ref(false);
  const activeSection = ref<number | null>(null);

  let containerEl: HTMLElement | null = null;
  let containerObserver: MutationObserver | null = null;
  const shadowObservers = new Map<ShadowRoot, MutationObserver>();

  const refresh = () => {
    if (!containerEl) return;
    const h3Els = findAllH3s(containerEl);
    sections.value = h3Els
      .map((el) => ({
        text: el.textContent?.trim() ?? "",
        element: el,
        sectionBlocks: getSectionBlocks(el, h3Els),
      }))
      .filter((s) => s.text.length > 0);
    hasAdvancedOptions.value =
      findAllInShadowTree(containerEl, ".advanced-options").length > 0;
  };

  const setupShadowObservers = () => {
    if (!containerEl) return;
    for (const sr of findAllShadowRoots(containerEl)) {
      if (!shadowObservers.has(sr)) {
        const obs = new MutationObserver(() => {
          setupShadowObservers();
          refresh();
        });
        obs.observe(sr, { childList: true, subtree: true });
        shadowObservers.set(sr, obs);
      }
    }
  };

  /** Start watching a container element for h3 sections. */
  const connect = (el: HTMLElement) => {
    disconnect();
    containerEl = el;

    // Watch the light-DOM container for shadow-root creation
    containerObserver = new MutationObserver(() => {
      setupShadowObservers();
      refresh();
    });
    containerObserver.observe(el, { childList: true, subtree: true });

    setupShadowObservers();
    refresh();
  };

  /** Stop watching and clear all state. */
  const disconnect = () => {
    containerObserver?.disconnect();
    containerObserver = null;
    shadowObservers.forEach((obs) => obs.disconnect());
    shadowObservers.clear();
    containerEl = null;
    sections.value = [];
    hasAdvancedOptions.value = false;
    activeSection.value = null;
  };

  /** Restore all section blocks to their default visibility. */
  const showAllSections = () => {
    sections.value.forEach((s) => {
      s.sectionBlocks.forEach((el) => {
        el.style.display = "";
      });
      // Restore the h3 heading that may have been hidden in tab mode
      s.element.style.display = "";
    });
  };

  /**
   * Activate a section by index.
   *
   * "scrolling" mode: smooth-scroll to the section heading.
   * "tabs" mode:      hide all other sections, show only this one,
   *                   and snap-scroll the container to the top.
   */
  const activateSection = (index: number, mode: "scrolling" | "tabs" | "horizontal-tabs") => {
    const mark = sections.value[index];
    if (!mark) return;
    activeSection.value = index;

    if (mode === "tabs" || mode === "horizontal-tabs") {
      sections.value.forEach((s, i) => {
        s.sectionBlocks.forEach((el) => {
          el.style.display = i === index ? "" : "none";
        });
        // Hide the h3 heading inside tabs — the tab bar already shows it
        s.element.style.display = "none";
      });
      // Snap to top of the (now-only) visible content
      const container = findScrollableAncestor(mark.element);
      container?.scrollTo({ top: 0 });
    } else {
      showAllSections();
      // Smooth-scroll to the heading within its real scroll container
      const container = findScrollableAncestor(mark.element);
      if (!container) {
        mark.element.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      const containerTop = container.getBoundingClientRect().top;
      const elementTop = mark.element.getBoundingClientRect().top;
      container.scrollTo({
        top: container.scrollTop + (elementTop - containerTop),
        behavior: "smooth",
      });
    }
  };

  /**
   * Click all `.advanced-options` toggle links inside the dialog shadow DOM,
   * mirroring what the user would do manually to expand/collapse advanced settings.
   * State tracking (expanded/collapsed) is handled by the caller.
   */
  const toggleAdvancedOptions = () => {
    if (!containerEl) return;
    findAllInShadowTree(containerEl, ".advanced-options").forEach((el) =>
      el.click(),
    );
  };

  onUnmounted(disconnect);

  return {
    sections,
    hasAdvancedOptions,
    activeSection,
    connect,
    disconnect,
    activateSection,
    showAllSections,
    toggleAdvancedOptions,
  };
}
