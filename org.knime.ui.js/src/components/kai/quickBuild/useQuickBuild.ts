import { type Ref, ref, watch } from "vue";

import type { XY } from "@/api/gateway-api/generated-api";
import {
  type AiAssistantBuildEventPayload,
  useAIAssistantStore,
} from "@/store/aiAssistant";
import { useFloatingMenusStore } from "@/store/workflow/floatingMenus";
import { useChat } from "../chat/useChat";

export const useQuickBuild = ({
  nodeId,
  startPosition,
}: {
  nodeId: Ref<string | null>;
  startPosition: Ref<XY>;
}) => {
  const { enableDetachedMode, lockQuickActionMenu, unlockQuickActionMenu } =
    useFloatingMenusStore();
  const { makeAiRequest } = useAIAssistantStore();

  const userQuery = ref("");
  const errorMessage = ref("");
  const result = ref<AiAssistantBuildEventPayload | null>(null);

  const { isProcessing, lastUserMessage, abortSendMessage, statusUpdate } =
    useChat("build");

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
    } catch (error: any) {
      errorMessage.value = error.message;
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
      if (value === "WORKFLOW_BUILDING") {
        enableDetachedModeFn();
      }
    },
  );

  return {
    userQuery,
    errorMessage,
    result,
    sendMessage,
    isProcessing,
    lastUserMessage,
    abortSendMessage,
    statusUpdate,
  };
};
