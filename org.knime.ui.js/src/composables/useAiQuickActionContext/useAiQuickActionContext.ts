import {
  type KaiQuickActionContext,
  KaiQuickActionError,
} from "@/api/gateway-api/generated-api";
import { createQuickActionError } from "@/services/toastPresets/aiQuickActions";
import type { QuickActionId } from "@/store/ai/types";

import * as generateAnnotation from "./quickActions/generateAnnotation";

const actions: Record<
  string,
  { buildContext: () => KaiQuickActionContext | null }
> = {
  generateAnnotation,
};

export const useAiQuickActionContext = (
  quickActionId: QuickActionId,
): KaiQuickActionContext | null => {
  const action = actions[quickActionId];

  if (!action) {
    throw createQuickActionError(
      KaiQuickActionError.CodeEnum.VALIDATIONERROR,
      `Unsupported quick action: ${quickActionId}.`,
    );
  }

  return action.buildContext();
};
