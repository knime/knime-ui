import { useSVGCanvasStore } from "./canvas-svg";
// import { useCanvasStore as useWebGLCanvasStore } from "./canvas-webgl";

export const useCanvasStore = () => {
  return useSVGCanvasStore();
};
