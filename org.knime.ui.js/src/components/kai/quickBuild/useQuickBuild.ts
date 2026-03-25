import { type Ref, computed, onBeforeMount, ref, watch } from "vue";

import type { XY } from "@/api/gateway-api/generated-api";
import { getToastPresets } from "@/services/toastPresets";
import { useAIAssistantStore } from "@/store/ai/aiAssistant";
import { useAiProviderStore } from "@/store/ai/aiProvider";
import type { AiAssistantBuildEventPayload } from "@/store/ai/types";
import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import { useChat } from "../chat/useChat";
import { isAuthError } from "../utils";

export const useQuickBuild = ({
  nodeId,
  startPosition,
}: {
  nodeId: Ref<string | null>;
  startPosition: Ref<XY>;
}) => {
  const {
    enableDetachedMode,
    lockQuickActionMenu,
    unlockQuickActionMenu,
    hideQuickActionMenuConnector,
  } = useCanvasAnchoredComponentsStore();

  const aiAssistantStore = useAIAssistantStore();
  const { makeAiRequest, fetchUsage } = aiAssistantStore;

  const { disconnectAiProvider } = useAiProviderStore();

  const { toastPresets } = getToastPresets();

  const userQuery = ref("");
  const errorMessage = ref("");
  const result = ref<AiAssistantBuildEventPayload | null>(null);

  const {
    isProcessing,
    lastUserMessage,
    lastAiMessage,
    abortSendMessage,
    statusUpdate,
    pendingInquiry,
    pendingInquiryTraces,
    draftMessage,
    saveDraftMessage,
  } = useChat("build");

  // Inquiry traces from the last assistant message (for the final result view)
  const lastMessageInquiryTraces = computed(
    () => lastAiMessage.value?.inquiryTraces,
  );

  let enableDetachedModeCalled = false;
  const enableDetachedModeFn = () => {
    if (enableDetachedModeCalled) {
      return;
    }

    enableDetachedMode();
    enableDetachedModeCalled = true;
  };

  const sendMessage = async ({ message }: { message: string }) => {
    result.value = null;
    userQuery.value = message;
    const targetNodes = nodeId.value ? [nodeId.value] : [];

    try {
      errorMessage.value = "";
      result.value = (await makeAiRequest({
        chainType: "build",
        message,
        targetNodes,
        startPosition: startPosition.value,
      })) as AiAssistantBuildEventPayload;

      // Ideally, we would check for "SUCCESS" here. To be backwards compatible,
      // we check for "INPUT_NEEDED" instead.
      if (result.value?.type !== "INPUT_NEEDED") {
        enableDetachedModeFn();
      }
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "message" in error &&
        typeof error.message === "string"
      ) {
        if (isAuthError(error.message)) {
          toastPresets.connectivity.hubSessionExpired();

          // mark the provider as disconnected to trigger the Login Panel
          disconnectAiProvider();
        } else {
          errorMessage.value = error.message;
        }
      }
    }
  };

  watch(isProcessing, (value) => {
    if (value) {
      lockQuickActionMenu();
    } else {
      unlockQuickActionMenu();
    }
  });

  watch(
    () => statusUpdate.value?.type,
    (value) => {
      if (value === "WORKFLOW_BUILDING" || value === "NODE_ADDED") {
        hideQuickActionMenuConnector();
      }
    },
  );

  onBeforeMount(fetchUsage);

  return {
    userQuery,
    errorMessage,
    result,
    sendMessage,
    isProcessing,
    lastUserMessage,
    abortSendMessage,
    statusUpdate,
    pendingInquiry,
    pendingInquiryTraces,
    lastMessageInquiryTraces,
    draftMessage,
    saveDraftMessage,
  };
};
