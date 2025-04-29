import {
  NODE_PADDING,
  VISIBILITY_THRESHOLD,
  findFreeSpace,
  findFreeSpaceAroundCenterWithFallback,
  findFreeSpaceAroundPointWithFallback,
  findFreeSpaceFrom,
} from "./findFreeSpaceOnCanvas";
import calculateMetaNodePortBarBounds from "./metaNodePortBarBounds";
import { buildSpatialHash, queryNearbyObjects } from "./spatialHash";
import * as utils from "./utils";
import getWorkflowObjectBounds, { nodePadding } from "./workflowObjectBounds";

export const geometry = {
  findFreeSpace,
  findFreeSpaceFrom,
  findFreeSpaceAroundPointWithFallback,
  findFreeSpaceAroundCenterWithFallback,
  buildSpatialHash,
  queryNearbyObjects,
  getWorkflowObjectBounds,
  calculateMetaNodePortBarBounds,
  nodePadding,
  utils,
  constants: {
    NODE_PADDING,
    VISIBILITY_THRESHOLD,
  },
};
