import { computed } from "vue";
import { useLocalStorage } from "@vueuse/core";

const STORAGE_KEY = "KNIME_KANVAS_RENDERER";

type CanvasRendererType = "SVG" | "WebGL";

const getCurrentCanvasRenderer = (): CanvasRendererType => {
  return (
    (window.localStorage.getItem(STORAGE_KEY) as CanvasRendererType) ?? "SVG"
  );
};

const toggleCanvasRenderer = () => {
  const currentRenderer = getCurrentCanvasRenderer();

  const nextRenderer = currentRenderer === "SVG" ? "WebGL" : "SVG";

  window.localStorage.setItem(STORAGE_KEY, nextRenderer);
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
    STORAGE_KEY,
    "SVG",
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
