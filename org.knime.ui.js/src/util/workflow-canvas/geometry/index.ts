export * from "./spatialHash";
import {
  CONSTANTS,
  findFreeSpaceAroundCenterWithFallback,
  findFreeSpaceAroundPointWithFallback,
} from "./findFreeSpaceOnCanvas";

export const freeSpaceInCanvas = {
  aroundCenterWithFallback: findFreeSpaceAroundCenterWithFallback,
  aroundPointWithFallback: findFreeSpaceAroundPointWithFallback,
  VISIBILITY_THRESHOLD: CONSTANTS.VISIBILITY_THRESHOLD,
};
