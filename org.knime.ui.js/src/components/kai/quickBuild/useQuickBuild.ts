import { ref, watch, type Ref } from "vue";
import { useChat } from "../chat/useChat";
import { useStore } from "vuex";

export const useQuickBuild = ({ nodeId }: { nodeId: Ref<string> }) => {
  const store = useStore();

  const userQuery = ref<string>("");
  const error = ref<string>("");
  const result = ref<string>("");

  const {
    isProcessing,
    lastUserMessage,
    makeQuickBuildRequest,
    abortSendMessage,
    statusUpdate,
  } = useChat("build");

  const sendMessage = async ({ message }: { message: string }) => {
    userQuery.value = message;
    const targetNodes = nodeId.value ? [nodeId.value] : [];

    try {
      const { message: _message } = await makeQuickBuildRequest({
        message,
        targetNodes,
      });
      result.value = _message;
    } catch (_error) {
      error.value = _error.message;
    }
  };

  watch(isProcessing, (value) => {
    if (value) {
      store.dispatch("workflow/lockQuickActionMenu"); 
    } else {
      store.dispatch("workflow/unlockQuickActionMenu");
    }
  })

  return {
    userQuery,
    error,
    result,
    sendMessage,
    isProcessing,
    lastUserMessage,
    abortSendMessage,
    statusUpdate,
  };
};
