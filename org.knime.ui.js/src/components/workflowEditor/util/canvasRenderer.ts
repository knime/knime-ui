import { computed } from "vue";
import { useLocalStorage } from "@vueuse/core";

export const KANVAS_RENDERER_STORAGE_KEY = "KNIME_KANVAS_RENDERER";

export type CanvasRendererType = "SVG" | "WebGL";

const defaultRenderer: CanvasRendererType = "SVG";

const getCurrentCanvasRenderer = (): CanvasRendererType => {
  return (
    (window.localStorage.getItem(
      KANVAS_RENDERER_STORAGE_KEY,
    ) as CanvasRendererType) ?? defaultRenderer
  );
};

const toggleCanvasRenderer = () => {
  const currentRenderer = getCurrentCanvasRenderer();

  const nextRenderer = currentRenderer === "SVG" ? "WebGL" : "SVG";

  window.localStorage.setItem(KANVAS_RENDERER_STORAGE_KEY, nextRenderer);
};

const isWebGLRenderer = () => {
  return getCurrentCanvasRenderer() === "WebGL";
};

const isSVGRenderer = () => {
  return getCurrentCanvasRenderer() === "SVG";
};

/**
 * List of utils that can be accessed on demand to check for the renderer.
 * **Not reactive**
 */
export const canvasRendererUtils = {
  getCurrentCanvasRenderer,
  toggleCanvasRenderer,
  isWebGLRenderer,
  isSVGRenderer,
};

/**
 * Provides a composable with reactive properties to listen to renderer changes
 * @returns
 */
export const useCanvasRendererUtils = () => {
  const currentRenderer = useLocalStorage<CanvasRendererType>(
    KANVAS_RENDERER_STORAGE_KEY,
    defaultRenderer,
  );

  const toggleCanvasRenderer = () => {
    const nextRenderer = currentRenderer.value === "SVG" ? "WebGL" : "SVG";
    currentRenderer.value = nextRenderer;
  };

  const isWebGLRenderer = computed(() => currentRenderer.value === "WebGL");
  const isSVGRenderer = computed(() => currentRenderer.value === "SVG");

  return {
    currentRenderer,
    toggleCanvasRenderer,
    isWebGLRenderer,
    isSVGRenderer,
  };
};
