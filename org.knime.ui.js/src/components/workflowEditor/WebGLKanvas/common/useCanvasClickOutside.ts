import { type Ref, nextTick, onBeforeUnmount, onMounted } from "vue";
import { type MaybeElementRef, onClickOutside } from "@vueuse/core";
import { useFocusTrap } from "@vueuse/integrations/useFocusTrap.mjs";

import { sleep } from "@knime/utils";

import { getKanvasDomElement } from "@/util/getKanvasDomElement";
import { CANVAS_ANCHOR_WRAPPER_ID } from "../../CanvasAnchoredComponents";

/**
 * This hook is an extension of the VueUse `onClickOutside` sensor. It adds
 * the possibility to attach a focus trap, or to ignore certain canvas events.
 */
type UseCanvasClickOutside = {
  /**
   * Element to detect clicks outside of.
   */
  rootEl: MaybeElementRef;
  /**
   * Whether to activate focus trap on the rootEl.
   */
  focusTrap: Ref<boolean>;
  /**
   * CSS selectors of elements to ignore when detecting outside clicks.
   */
  ignoreCssSelectors?: Array<string>;
  /**
   * Function to determine if canvas events should be ignored.
   * @param event - The pointer event
   * @returns true if the event should be ignored
   * @example (event) => event.dataset?.initiator === "ignored-initiator"
   */
  ignoreCanvasEvents?: (event: PointerEvent) => boolean;
  /**
   * Callback fired when clicking outside the rootEl.
   */
  onClickOutside: () => void;
};

export const useCanvasClickOutside = (options: UseCanvasClickOutside) => {
  const CLICKAWAY_REGISTER_DELAY_MS = 300;
  const { rootEl, focusTrap } = options;

  const { activate: activateFocusTrap, deactivate: deactivateFocusTrap } =
    useFocusTrap(rootEl);

  const kanvas = getKanvasDomElement();

  const doKanvasClickaway = (event: PointerEvent) => {
    const wrapper = kanvas!.querySelector(`#${CANVAS_ANCHOR_WRAPPER_ID}`);
    // ignore children of the anchored container
    if (wrapper?.contains(event.target as HTMLElement)) {
      return;
    }

    if (options.ignoreCanvasEvents?.(event)) {
      return;
    }

    options.onClickOutside();
  };

  onMounted(async () => {
    // Focus trap needs to be activated before the sleep call
    // in order to register the correct element to return the focus to
    if (focusTrap.value) {
      await nextTick();
      activateFocusTrap();
    }

    // make a brief pause before registering the click outside handler,
    // to avoid closing immediately after opening
    await sleep(CLICKAWAY_REGISTER_DELAY_MS);

    kanvas!.addEventListener("pointerdown", doKanvasClickaway);

    onClickOutside(
      rootEl,
      () => {
        deactivateFocusTrap();
        options.onClickOutside();
      },
      {
        capture: true,
        ignore: [kanvas, ...(options.ignoreCssSelectors || [])],
      },
    );
  });

  onBeforeUnmount(() => {
    kanvas?.removeEventListener("pointerdown", doKanvasClickaway);
    deactivateFocusTrap();
  });
};
