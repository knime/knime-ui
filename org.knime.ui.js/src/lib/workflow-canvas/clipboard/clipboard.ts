import type { XY } from "@/api/gateway-api/generated-api";
import { geometry } from "@/lib/geometry";
import type { GeometryArea, GeometryBounds } from "@/lib/geometry";
import { freeSpaceInCanvas } from "..";

// eslint-disable-next-line no-magic-numbers
const getRandomNoise = () => (Math.random() * 2 - 1) * 25;

/**
 * Tries to fit clipboard objects beginning at the screen's center
 * If no free space is found within the canvas's border, it will be pasted directly at center
 */
export const centerStrategy = ({
  visibleFrame,
  clipboardContent,
}: {
  visibleFrame: GeometryBounds;
  clipboardContent: { objectBounds: GeometryArea };
}): XY => {
  const { x, y } = geometry.getCenteredPositionInVisibleFrame(
    visibleFrame,
    clipboardContent.objectBounds,
  );

  const centerPosition = {
    x: x + getRandomNoise(),
    y: y + getRandomNoise(),
  };

  return centerPosition;
};

/**
 * Tries to fit clipboard objects beginning at a fixed positive offset with random noise from the original position
 * If the offset position is not visible within the canvas' borders, it returns null
 */
export const offsetStrategy = ({
  clipboardContent,
  visibleFrame,
}: {
  visibleFrame: GeometryBounds;
  clipboardContent: { objectBounds: GeometryBounds };
}): XY | null => {
  const { objectBounds } = clipboardContent;
  const meanOffset = 120;

  const offsetPosition: { left: number; top: number } = {
    left: objectBounds.left + meanOffset + getRandomNoise(),
    top: objectBounds.top + meanOffset + getRandomNoise(),
  };

  const visibility = geometry.areaCoverage(
    {
      ...offsetPosition,
      width: objectBounds.width,
      height: objectBounds.height,
    },
    visibleFrame,
  );

  if (visibility >= freeSpaceInCanvas.VISIBILITY_THRESHOLD) {
    return { x: offsetPosition.left, y: offsetPosition.top };
  }
  return null;
};

/**
 * Determines in which position of the canvas to place the contents of the
 * clipboard upon a paste operation
 */
const determinePastePosition = (params: {
  visibleFrame: GeometryBounds;
  clipboardContent: { objectBounds: GeometryBounds };
  isWorkflowEmpty: boolean;
}): { position: XY; fillScreenAfterPaste?: boolean } => {
  const { clipboardContent, isWorkflowEmpty, visibleFrame } = params;

  if (isWorkflowEmpty) {
    consola.info("workflow is empty: paste to center");
    return {
      position: centerStrategy({ visibleFrame, clipboardContent }),
      fillScreenAfterPaste: true,
    };
  }

  return {
    position:
      offsetStrategy({ visibleFrame, clipboardContent }) ||
      centerStrategy({ visibleFrame, clipboardContent }),
  };
};

export const clipboard = {
  determinePastePosition,
  defaultPastePosition: centerStrategy,
};
