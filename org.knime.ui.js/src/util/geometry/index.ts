import {
  findFreeSpace,
  findFreeSpaceFrom,
  findFreeSpaceAroundCenterWithFallback,
  findFreeSpaceAroundPointWithFallback,
  NODE_PADDING,
  VISIBILITY_THRESHOLD,
} from "./findFreeSpaceOnCanvas";

import {
  areaCoverage,
  rectangleIntersection,
  snapToGrid,
  getCenteredPositionInVisibleFrame,
} from "./geometry";
import getWorkflowObjectBounds, { nodePadding } from "./workflowObjectBounds";

export const geometry = {
  findFreeSpace,
  findFreeSpaceFrom,
  findFreeSpaceAroundPointWithFallback,
  findFreeSpaceAroundCenterWithFallback,
  getWorkflowObjectBounds,
  nodePadding,
  utils: {
    areaCoverage,
    rectangleIntersection,
    snapToGrid,
    getCenteredPositionInVisibleFrame,
  },
  constants: {
    NODE_PADDING,
    VISIBILITY_THRESHOLD,
  },
};
