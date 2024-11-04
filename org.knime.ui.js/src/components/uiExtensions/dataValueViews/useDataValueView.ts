import {
  type ComponentPublicInstance,
  type Ref,
  computed,
  reactive,
  ref,
  toRefs,
  watchEffect,
} from "vue";
import { onClickOutside, unrefElement } from "@vueuse/core";
import {
  type ClientRectObject,
  autoPlacement,
  offset,
  shift,
  useFloating,
} from "@floating-ui/vue";

import type { DataValueViewConfig } from "@knime/ui-extension-service";

type MaybeElement = HTMLElement | null | ComponentPublicInstance;

const INITIAL_OFFSET = 20;
const useFloatingDataValueView = (
  dataValueViewElement: Ref<MaybeElement>,
  { anchor }: { anchor: Ref<null | ClientRectObject> },
) =>
  useFloating(
    computed(() => {
      const anchorValue = anchor.value;
      return anchorValue ? { getBoundingClientRect: () => anchorValue } : null;
    }),
    dataValueViewElement,
    {
      placement: "top",
      strategy: "fixed",
      middleware: [
        offset(INITIAL_OFFSET),
        shift({
          mainAxis: true,
          crossAxis: true,
          padding: 20,
        }),
        autoPlacement({
          /**
           * Note that the order of the placements is important.
           * The first placement that fits is used.
           *
           * We prioritize bottom over top so that when an overlap
           * is required, we try to have the top of the anchor element
           * still visible.
           */
          allowedPlacements: ["bottom", "top", "left", "right"],
        }),
      ],
    },
  );

const useDraggableElement = (element: Ref<MaybeElement>) => {
  const state = reactive({
    isDragging: false,
    left: 0,
    top: 0,
  });

  let startX = 0;
  let startY = 0;

  const onMouseMove = (event: MouseEvent) => {
    if (state.isDragging) {
      state.left = event.clientX - startX;
      state.top = event.clientY - startY;
      event.preventDefault();
    }
  };

  const onMouseUp = () => {
    state.isDragging = false;
    window.removeEventListener("mouseup", onMouseUp);
    window.removeEventListener("mousemove", onMouseMove);
  };

  const onMouseDown = (event: MouseEvent) => {
    state.isDragging = true;
    startX = event.clientX - state.left;
    startY = event.clientY - state.top;
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    event.preventDefault();
  };

  watchEffect(() => {
    (unrefElement(element) as HTMLElement | null)?.addEventListener(
      "mousedown",
      onMouseDown,
    );
    state.left = 0;
    state.top = 0;
  });
  return toRefs(state);
};

/**
 * The time in milliseconds to wait before closing the data value view.
 * If in the meantime, a new data value view is opened, the closing is ignored.
 */
const DELAY_IGNORING_CLOSE = 200;

const useOpenClose = () => {
  const config = ref<DataValueViewConfig | null>(null);
  const anchor = ref<ClientRectObject | null>(null);

  let shouldBeClosed = false; // for not closing when opening new one immediately afterwards
  let justOpened = false; // for not closing when opening new one immediately beforehand
  const open = (newConfig: DataValueViewConfig) => {
    shouldBeClosed = false;
    if (!config.value) {
      anchor.value = newConfig.anchor;
    }
    config.value = newConfig;

    justOpened = true;
    setTimeout(() => {
      justOpened = false;
    }, DELAY_IGNORING_CLOSE);
  };
  const close = (
    { withoutDelay }: { withoutDelay: boolean } = { withoutDelay: false },
  ) => {
    if (withoutDelay) {
      config.value = null;
      return;
    }
    if (justOpened) {
      return;
    }
    shouldBeClosed = true;
    setTimeout(() => {
      if (shouldBeClosed) {
        config.value = null;
        shouldBeClosed = false;
      }
    }, DELAY_IGNORING_CLOSE);
  };

  return {
    /**
     * Calling this method will be ignored if open is called immediately beforehand or afterwards.
     */
    close,
    open,
    config,
    anchor,
  };
};

/**
 * Composable for opening and closing a data value view.
 * The data value view is a floating element that is draggable and closed when clicking outside of it.
 */
export const useDataValueView = () => {
  const element = ref<MaybeElement>(null);

  const { close, open, config, anchor } = useOpenClose();
  const { floatingStyles } = useFloatingDataValueView(element, {
    anchor,
  });
  const { left, top, isDragging } = useDraggableElement(element);
  const styles = computed(() => ({
    ...floatingStyles.value,
    left: `${left.value}px`,
    top: `${top.value}px`,
  }));

  onClickOutside(element, () => close());
  return {
    close,
    open,
    config,
    element,
    styles,
    isDragging,
  };
};
