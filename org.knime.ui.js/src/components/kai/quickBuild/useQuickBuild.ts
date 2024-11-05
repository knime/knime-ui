import { type Ref, ref, watch } from "vue";

import type { XY } from "@/api/gateway-api/generated-api";
import { useStore } from "@/composables/useStore";
import { useChat } from "../chat/useChat";

type Result = { message: string; type: "SUCCESS" | "INPUT_NEEDED" };

export const useQuickBuild = ({
  nodeId,
  startPosition,
}: {
  nodeId: Ref<string | null>,
  startPosition: Ref<XY>
}) => {
  const store = useStore();

  const userQuery = ref("");
  const errorMessage = ref("");
  const result = ref<Result | null>(null);

  const { isProcessing, lastUserMessage, abortSendMessage, statusUpdate } =
    useChat("build");

  const makeQuickBuildRequest = ({
    message,
    targetNodes,
    startPosition,
  }: {
    message: string;
    targetNodes: string[];
    startPosition: XY;
  }) => {
    return store.dispatch("aiAssistant/makeQuickBuildRequest", {
      message,
      targetNodes,
      startPosition,
    });
  };

  const sendMessage = async ({ message }: { message: string }) => {
    result.value = null;
    userQuery.value = message;
    const targetNodes = nodeId.value ? [nodeId.value] : [];

    try {
      errorMessage.value = "";
      result.value = await makeQuickBuildRequest({
        message,
        targetNodes,
        startPosition: startPosition.value,
      });
    } catch (error: any) {
      errorMessage.value = error.message;
    }
  };

  watch(isProcessing, (value) => {
    if (value) {
      store.dispatch("workflow/lockQuickActionMenu");
    } else {
      store.dispatch("workflow/unlockQuickActionMenu");
    }
  });

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
