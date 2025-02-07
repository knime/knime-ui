import SVGKanvasFloatingMenu from "../SVGKanvas/FloatingMenu/FloatingMenu.vue";
import WebGLKanvasFloatingMenu from "../WebGLKanvas/FloatingMenu/FloatingMenu.vue";
import { canvasRendererUtils } from "../util/canvasRenderer";

/**
 * Resolves the FloatingMenu component which enables the "anchoring" behavior for
 * components in the HTML namespace to be positioned with respect to objects in the canvas,
 * irrespective to the canvas rendering system (SVG or WebGL)
 * @returns
 */
export const getFloatingMenuComponent = () => {
  const FloatingMenu = canvasRendererUtils.isSVGRenderer()
    ? SVGKanvasFloatingMenu
    : WebGLKanvasFloatingMenu;

  return { FloatingMenu };
};
