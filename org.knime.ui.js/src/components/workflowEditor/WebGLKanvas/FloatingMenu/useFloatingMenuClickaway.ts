import { type Ref, nextTick, onBeforeUnmount, onMounted } from "vue";
import { type MaybeElementRef, onClickOutside } from "@vueuse/core";
import { useFocusTrap } from "@vueuse/integrations/useFocusTrap.mjs";

import { sleep } from "@knime/utils";

import { getKanvasDomElement } from "@/util/getKanvasDomElement";
import { CANVAS_ANCHOR_WRAPPER_ID } from "../../CanvasAnchoredComponents";

type UseFloatingMenuClickaway = {
  rootEl: MaybeElementRef<HTMLElement | undefined>;
  focusTrap: Ref<boolean>;
  onClickaway: () => void;
};

export const useFloatingMenuClickaway = (options: UseFloatingMenuClickaway) => {
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

    // preventing the default is being used as a signal on events that
    // originate from within the WebGL canvas to hint that the event was handled already
    if (event.defaultPrevented) {
      return;
    }

    options.onClickaway();
  };

  onMounted(async () => {
    // make a brief pause before registering the click outside handler,
    // to avoid closing immediately after opening
    await sleep(CLICKAWAY_REGISTER_DELAY_MS);

    kanvas!.addEventListener("pointerdown", doKanvasClickaway);

    onClickOutside(
      rootEl,
      () => {
        deactivateFocusTrap();
        options.onClickaway();
      },
      { capture: false, ignore: [kanvas] },
    );

    if (focusTrap.value) {
      await nextTick();
      activateFocusTrap();
    }
  });

  onBeforeUnmount(() => {
    kanvas?.removeEventListener("pointerdown", doKanvasClickaway);
    deactivateFocusTrap();
  });
};
