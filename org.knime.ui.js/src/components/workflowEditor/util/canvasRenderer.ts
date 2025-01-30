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

export const canvasRendererUtils = {
  getCurrentCanvasRenderer,
  toggleCanvasRenderer,
  isWebGLRenderer,
  isSVGRenderer,
};
