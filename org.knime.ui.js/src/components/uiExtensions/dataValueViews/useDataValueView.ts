import {
  type ComponentPublicInstance,
  type Ref,
  computed,
  reactive,
  ref,
  watch,
  watchEffect,
} from "vue";
import { onClickOutside, unrefElement, useWindowSize } from "@vueuse/core";
import {
  type ClientRectObject,
  autoPlacement,
  offset,
  shift,
  useFloating,
} from "@floating-ui/vue";

import {
  type DataValueViewConfig,
  type UIExtensionPushEvents,
} from "@knime/ui-extension-renderer/api";

type MaybeElement = HTMLElement | null | ComponentPublicInstance;

const INITIAL_OFFSET = 20;
export const useFloatingDataValueView = (
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

export type BoundingBoxInset = "top" | "left";
export type BoundingBoxDimension = "width" | "height";
export type BoundingBox = Record<
  BoundingBoxInset | BoundingBoxDimension,
  number
>;

export const useDraggableResizableRectState = () => {
  const state: BoundingBox = reactive({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
  });

  const setRect = (rect: Partial<BoundingBox>) => {
    Object.entries(rect).forEach(([key, value]) => {
      if (typeof value !== "undefined") {
        state[key] = value;
      }
    });
  };

  return { setRect, state: ref(state) };
};

export const useDraggableElement = (
  element: Ref<MaybeElement>,
  rectState: Ref<BoundingBox>,
  setRect: (rect: Partial<BoundingBox>) => void,
) => {
  const isDragging = ref(false);

  let startX = 0;
  let startY = 0;

  const onMouseMove = (event: MouseEvent) => {
    if (isDragging.value) {
      setRect({
        left: event.clientX - startX,
        top: event.clientY - startY,
      });
      event.preventDefault();
    }
  };

  const onMouseUp = () => {
    isDragging.value = false;
    window.removeEventListener("mouseup", onMouseUp);
    window.removeEventListener("mousemove", onMouseMove);
  };

  const onMouseDown = (event: MouseEvent) => {
    isDragging.value = true;
    const { left, top } = rectState.value;
    startX = event.clientX - left;
    startY = event.clientY - top;
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    event.preventDefault();
  };

  watchEffect(() => {
    (unrefElement(element) as HTMLElement | null)?.addEventListener(
      "mousedown",
      onMouseDown,
    );
    setRect({
      left: 0,
      top: 0,
    });
  });
  return { isDragging };
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

  const addListener = (
    listener: <T extends UIExtensionPushEvents.EventType>(
      event: UIExtensionPushEvents.PushEvent<T>,
    ) => void,
  ) =>
    watch(
      () => config.value !== null,
      (isShown) => {
        listener({
          eventType:
            "DataValueViewShownEvent" satisfies UIExtensionPushEvents.KnownEventType,
          payload: isShown,
        });
      },
    );

  return {
    /**
     * Calling this method will be ignored if open is called immediately beforehand or afterwards.
     */
    close,
    open,
    config,
    anchor,
    addListener,
  };
};

export const useDataValueViewSize = () => {
  const WIDTH_PERCENTAGE = 0.35;
  const MAX_WIDTH = 780;
  const MIN_WIDTH = 380;
  const ASPECT_RATIO = 1.6;
  const { width: windowWidth } = useWindowSize();

  const fraction = computed(() => windowWidth.value * WIDTH_PERCENTAGE);
  const width = computed(() => {
    if (fraction.value > MAX_WIDTH) {
      return MAX_WIDTH;
    }
    if (fraction.value < MIN_WIDTH) {
      return MIN_WIDTH;
    }
    return fraction.value;
  });
  const height = computed(() => width.value / ASPECT_RATIO);

  return {
    width,
    height,
    minSize: {
      width: MIN_WIDTH,
      height: MIN_WIDTH / ASPECT_RATIO,
    },
  };
};

/**
 * Composable for opening and closing a data value view.
 * The data value view is closed when clicking outside of it.
 */
export const useDataValueView = () => {
  const element = ref<MaybeElement>(null);

  const { close, open, config, anchor, addListener } = useOpenClose();

  onClickOutside(element, () => close());
  return {
    close,
    open,
    config,
    element,
    anchor,
    addListener,
  };
};
