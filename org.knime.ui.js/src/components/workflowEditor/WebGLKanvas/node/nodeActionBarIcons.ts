import type { GraphicsContext } from "pixi.js";

import CancelIcon from "@/assets/cancel.svg?raw";
import OpenDialogIcon from "@/assets/configure-node.svg?raw";
import ExecuteIcon from "@/assets/execute.svg?raw";
import OpenViewIcon from "@/assets/open-view.svg?raw";
import PauseIcon from "@/assets/pause-execution.svg?raw";
import ResetIcon from "@/assets/reset-all.svg?raw";
import ResumeIcon from "@/assets/resume-execution.svg?raw";
import StepIcon from "@/assets/step-execution.svg?raw";
import type { IconKeys } from "../../common/useNodeActionBar";
import { loadSvgInGraphicsContext } from "../util/loadSvgInGraphicsContext";

let iconsCache: Record<IconKeys, GraphicsContext> | null = null;

export const getActionBarIcons = () => {
  if (iconsCache === null) {
    iconsCache = {
      CancelIcon: loadSvgInGraphicsContext(CancelIcon),
      OpenDialogIcon: loadSvgInGraphicsContext(OpenDialogIcon),
      ExecuteIcon: loadSvgInGraphicsContext(ExecuteIcon),
      OpenViewIcon: loadSvgInGraphicsContext(OpenViewIcon),
      PauseIcon: loadSvgInGraphicsContext(PauseIcon),
      ResetIcon: loadSvgInGraphicsContext(ResetIcon),
      ResumeIcon: loadSvgInGraphicsContext(ResumeIcon),
      StepIcon: loadSvgInGraphicsContext(StepIcon),
    };
  }

  return iconsCache;
};
