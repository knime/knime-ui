const STORAGE_KEY = "KNIME_KANVAS_RENDERER";

enum CanvasRendererType {
  SVG = "SVG",
  WebGL = "WebGL",
}

const getCurrentCanvasRenderer = (): CanvasRendererType => {
  return (
    (window.localStorage.getItem(STORAGE_KEY) as CanvasRendererType) ??
    CanvasRendererType.SVG
  );
};

const toggleCanvasRenderer = () => {
  const currentRenderer = getCurrentCanvasRenderer();

  const nextRenderer =
    currentRenderer === CanvasRendererType.SVG
      ? CanvasRendererType.WebGL
      : CanvasRendererType.SVG;

  window.localStorage.setItem(STORAGE_KEY, nextRenderer);
};

const isWebGLRenderer = () => {
  return getCurrentCanvasRenderer() === CanvasRendererType.WebGL;
};

const isSVGRenderer = () => {
  return getCurrentCanvasRenderer() === CanvasRendererType.SVG;
};

export const canvasRendererUtils = {
  getCurrentCanvasRenderer,
  toggleCanvasRenderer,
  isWebGLRenderer,
  isSVGRenderer,
};
