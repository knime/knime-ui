export * from "./spatialHash";
import {
  CONSTANTS,
  findFreeSpaceAroundCenterWithFallback,
  findFreeSpaceAroundPointWithFallback,
} from "./findFreeSpaceOnCanvas";
import * as workflowBounds from "./workflowBounds";

export const freeSpaceInCanvas = {
  aroundCenterWithFallback: findFreeSpaceAroundCenterWithFallback,
  aroundPointWithFallback: findFreeSpaceAroundPointWithFallback,
  VISIBILITY_THRESHOLD: CONSTANTS.VISIBILITY_THRESHOLD,
};

export { workflowBounds };
