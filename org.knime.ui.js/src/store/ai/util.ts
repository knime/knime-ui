import { KaiQuickActionError } from "@/api/gateway-api/generated-api";
import { getToastPresets } from "@/services/toastPresets";
import { parseQuickActionError } from "@/services/toastPresets/aiQuickActions";
import { useAiProviderStore } from "@/store/ai/aiProvider";

/**
 * Handles quick action errors by showing appropriate toast messages.
 */
export const handleQuickActionError = (error: unknown) => {
  const toasts = getToastPresets().toastPresets.aiQuickActions;
  const parsedError = parseQuickActionError(error);
  const { connectAiProvider, aiProviderId } = useAiProviderStore();

  switch (parsedError.code) {
    case KaiQuickActionError.CodeEnum.QUOTAEXCEEDED:
      toasts.quotaExceeded({ message: parsedError.message });
      break;

    case KaiQuickActionError.CodeEnum.TIMEOUT:
      toasts.timeout({ message: parsedError.message });
      break;

    case KaiQuickActionError.CodeEnum.LLMERROR:
      toasts.llmError({ message: parsedError.message });
      break;

    case KaiQuickActionError.CodeEnum.VALIDATIONERROR:
      toasts.validationError({ message: parsedError.message });
      break;

    case KaiQuickActionError.CodeEnum.SERVICEUNAVAILABLE:
      toasts.serviceUnavailable({ message: parsedError.message });
      break;

    case KaiQuickActionError.CodeEnum.AUTHENTICATIONFAILED:
      toasts.authenticationFailed({
        message: parsedError.message,
        hubId: aiProviderId ?? "KNIME Hub",
        onLogin: connectAiProvider,
      });
      break;

    case KaiQuickActionError.CodeEnum.UNKNOWN:
    default:
      toasts.unknownError({ message: parsedError.message });
      break;
  }
};
