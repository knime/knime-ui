import { type Ref, ref, watch } from "vue";
import { useStore } from "vuex";

import { useChat } from "../chat/useChat";

type Result = { message: string; type: "SUCCESS" | "INPUT_NEEDED" };

export const useQuickBuild = ({ nodeId }: { nodeId: Ref<string | null> }) => {
  const store = useStore();

  const userQuery = ref<string>("");
  const errorMessage = ref<string>("");
  const result = ref<Result | null>(null);

  const {
    isProcessing,
    lastUserMessage,
    makeQuickBuildRequest,
    abortSendMessage,
    statusUpdate,
  } = useChat("build");

  const sendMessage = async ({ message }: { message: string }) => {
    result.value = null;
    userQuery.value = message;
    const targetNodes = nodeId.value ? [nodeId.value] : [];

    try {
      errorMessage.value = "";
      result.value = await makeQuickBuildRequest({
        message,
        targetNodes,
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
