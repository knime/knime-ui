import { API } from "@api";

import type { Workflow } from "@/api/custom-types";
import type { XY } from "@/api/gateway-api/generated-api";
import { nodeSize } from "@/style/shapes";
import { geometry } from "@/util/geometry";
import type { GeometryArea, GeometryBounds } from "@/util/geometry/types";

// eslint-disable-next-line no-magic-numbers
const getRandomNoise = () => (Math.random() * 2 - 1) * 25;

/**
 * Tries to fit clipboard objects beginning at the screen's center
 * If no free space is found within the canvas's border, it will be pasted directly at center
 * @returns { Object } x and y position
 */
export const centerStrategy = ({
  visibleFrame,
  clipboardContent,
}: {
  visibleFrame: GeometryBounds;
  clipboardContent: { objectBounds: GeometryArea };
}) => {
  const { x, y } = geometry.utils.getCenteredPositionInVisibleFrame(
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
 * If the offsetted position is not visible within the canvas' borders, it returns null
 * @returns { Object | null } x and y position
 */
export const offsetStrategy = ({
  clipboardContent,
  visibleFrame,
}: {
  visibleFrame: GeometryBounds;
  clipboardContent: { objectBounds: GeometryBounds };
}) => {
  const { objectBounds } = clipboardContent;
  const meanOffset = 120;

  const offsetPosition: { left: number; top: number } = {
    left: objectBounds.left + meanOffset + getRandomNoise(),
    top: objectBounds.top + meanOffset + getRandomNoise(),
  };

  const visibility = geometry.utils.areaCoverage(
    {
      ...offsetPosition,
      width: objectBounds.width,
      height: objectBounds.height,
    },
    visibleFrame,
  );

  if (visibility >= geometry.constants.VISIBILITY_THRESHOLD) {
    return { x: offsetPosition.left, y: offsetPosition.top };
  }
  return null;
};

/*
 * returns position and what to do after pasting
 */
export const pastePartsAt = ({
  visibleFrame,
  clipboardContent,
  isWorkflowEmpty,
}: {
  visibleFrame: GeometryBounds;
  clipboardContent: { objectBounds: GeometryBounds };
  isWorkflowEmpty: boolean;
}) => {
  /* Workflow is empty */
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

export const pasteURI = (
  uri: string,
  activeWorkflow: Workflow,
  position: XY,
  visibleFrame: GeometryBounds,
) => {
  const {
    projectId,
    info: { containerId },
  } = activeWorkflow;

  const { x, y } = position
    ? {
        x: position.x - nodeSize / 2,
        y: position.y - nodeSize / 2,
      }
    : centerStrategy({
        visibleFrame,
        clipboardContent: {
          objectBounds: { width: nodeSize, height: nodeSize },
        },
      });

  return API.desktop.importURIAtWorkflowCanvas({
    uri,
    projectId,
    workflowId: containerId,
    x,
    y,
  });
};
