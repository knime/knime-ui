import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";

const DEFAULT_PAN_AMOUNT = 20;

export const useArrowKeyPanning = () => {
  const canvasStore = useWebGLCanvasStore();

  const handlePanning = (event: KeyboardEvent, amount = DEFAULT_PAN_AMOUNT) => {
    const offset = {
      x: canvasStore.canvasOffset.x,
      y: canvasStore.canvasOffset.y,
    };

    switch (event.key) {
      case "ArrowLeft":
        offset.x += amount;
        break;
      case "ArrowRight":
        offset.x -= amount;
        break;
      case "ArrowUp":
        offset.y += amount;
        break;
      case "ArrowDown":
        offset.y -= amount;
        break;
    }

    canvasStore.setCanvasOffset({ x: offset.x, y: offset.y });
  };

  return { handlePanning };
};
