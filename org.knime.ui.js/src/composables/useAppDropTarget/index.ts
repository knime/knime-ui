import { computed, ref } from "vue";
import type { XY } from "@/api/gateway-api/generated-api";

// export const DROP_AREA_ID = "app-drop-area";

type UseAppDropTargetOptions = {
  // target: Ref<HTMLElement | { $el: HTMLElement } | undefined>;
  onFileDrop?: (files: File[]) => void;
  onURLDrop?: (url: string) => void;
};

type OverlayConfig = {
  position: XY;
  width: number;
  height: number;
};

const __activeOverlayConfig = ref<OverlayConfig>();
export const activeOverlayConfig = computed(() => __activeOverlayConfig.value);

const useElementMeasuring = () => {
  const width = ref(0);
  const height = ref(0);
  const x = ref(0);
  const y = ref(0);

  const measureTarget = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();

    width.value = rect.width;
    height.value = element.offsetHeight;
    x.value = rect.x;
    y.value = rect.y;
  };

  const isElementVisible = (element: HTMLElement) => {
    return Boolean(element.offsetParent);
  };

  const measureTargetAsync = (element: HTMLElement) => {
    return new Promise<void>((resolve) => {
      const observer = new IntersectionObserver((entries) => {
        const isVisible = entries.some((e) => e.isIntersecting);

        if (isVisible) {
          measureTarget(element);
          observer.disconnect();
          resolve();
        }
      });

      observer.observe(element);
    });
  };

  return {
    width: computed(() => width.value),
    height: computed(() => height.value),
    x: computed(() => x.value),
    y: computed(() => y.value),
    isElementVisible,
    measureTarget,
    measureTargetAsync,
  };
};

export const useAppDropTarget = (options: UseAppDropTargetOptions = {}) => {
  const hasRendered = ref(false);
  const isDragFromWithinApp = ref(false);

  const {
    width,
    height,
    x,
    y,
    isElementVisible,
    measureTarget,
    measureTargetAsync,
  } = useElementMeasuring();

  const currentTarget = ref<HTMLElement>();
  // const { target: currentTarget } = options;

  const clearOverlay = () => {
    hasRendered.value = false;
    __activeOverlayConfig.value = undefined;
  };

  window.addEventListener("dragstart", (e) => {
    isDragFromWithinApp.value = true;
  });

  window.addEventListener("dragend", (e) => {
    isDragFromWithinApp.value = false;
  });

  const onDragOver = (e: DragEvent) => {
    if (isDragFromWithinApp.value) {
      return;
    }

    e.stopPropagation();
    e.preventDefault();

    if (!hasRendered.value || !__activeOverlayConfig.value) {
      __activeOverlayConfig.value = {
        width: width.value,
        height: height.value,
        position: { x: x.value, y: y.value },
      };
      hasRendered.value = true;
    }
  };

  const onDragLeave = (e: DragEvent) => {
    const isChild = currentTarget.value?.contains(
      e.relatedTarget as HTMLElement,
    );

    if (e.relatedTarget && isChild) {
      return;
    }

    if (hasRendered.value) {
      clearOverlay();
    }
  };

  const isFile = (item: DataTransferItem) => item.kind === "file";

  const handleDrop = (event: DragEvent) => {
    if (isDragFromWithinApp.value) {
      return;
    }

    const dataTransfer = event.dataTransfer;

    if (!dataTransfer) {
      return;
    }

    event.preventDefault();
    consola.trace("App drop event::", { event });

    const link = dataTransfer.getData("URL");
    if (link) {
      options.onURLDrop?.(link);
    } else if (dataTransfer.items) {
      const items = [...dataTransfer.items];
      const files = items.filter(isFile).map((item) => item.getAsFile()!);
      options.onFileDrop?.(files);
    }

    clearOverlay();
  };

  const setup = (target: HTMLElement) => {
    target.addEventListener("dragover", onDragOver);
    target.addEventListener("dragleave", onDragLeave);
    target.addEventListener("drop", handleDrop, { capture: true });
  };

  const teardown = (target: HTMLElement) => {
    target.removeEventListener("dragover", onDragOver);
    target.removeEventListener("dragleave", onDragLeave);
  };

  const setTarget = async (newTarget: HTMLElement) => {
    if (currentTarget.value) {
      teardown(currentTarget.value!);
    }

    currentTarget.value = newTarget;

    if (isElementVisible(newTarget)) {
      measureTarget(currentTarget.value);
    } else {
      await measureTargetAsync(currentTarget.value);
    }

    setup(currentTarget.value);
  };

  return {
    activeOverlayConfig,
    setTarget,
    teardown: () => {
      if (currentTarget.value) {
        teardown(currentTarget.value!);
      }
    },
  };
};
