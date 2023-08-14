import {
  findFreeSpace,
  findFreeSpaceFrom,
  findFreeSpaceAroundCenterWithFallback,
  findFreeSpaceAroundPointWithFallback,
  NODE_PADDING,
  VISIBILITY_THRESHOLD,
} from "./findFreeSpaceOnCanvas";

import * as utils from "./utils";
import getWorkflowObjectBounds, { nodePadding } from "./workflowObjectBounds";

export const geometry = {
  findFreeSpace,
  findFreeSpaceFrom,
  findFreeSpaceAroundPointWithFallback,
  findFreeSpaceAroundCenterWithFallback,
  getWorkflowObjectBounds,
  nodePadding,
  utils,
  constants: {
    NODE_PADDING,
    VISIBILITY_THRESHOLD,
  },
};
