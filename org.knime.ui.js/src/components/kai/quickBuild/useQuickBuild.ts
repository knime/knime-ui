import { type Ref, ref, watch } from "vue";

import type { XY } from "@/api/gateway-api/generated-api";
import { useStore } from "@/composables/useStore";
import { getToastsProvider } from "@/plugins/toasts";
import { useChat } from "../chat/useChat";
import { useHubAuth } from "../useHubAuth";

type Result = {
  message: string;
  type: "SUCCESS" | "INPUT_NEEDED";
  interactionId: string;
};

export const useQuickBuild = ({
  nodeId,
  startPosition,
}: {
  nodeId: Ref<string | null>;
  startPosition: Ref<XY>;
}) => {
  const store = useStore();
  const $toast = getToastsProvider();

  const userQuery = ref("");
  const errorMessage = ref("");
  const result = ref<Result | null>(null);

  const { isProcessing, lastUserMessage, abortSendMessage, statusUpdate } =
    useChat("build");
  const { isAuthError, disconnectHub } = useHubAuth();

  let enableDetachedModeCalled = false;
  const enableDetachedMode = () => {
    if (enableDetachedModeCalled) {
      return;
    }

    store.dispatch("workflow/enableDetachedMode");
    enableDetachedModeCalled = true;
  };

  const sendMessage = async ({ message }: { message: string }) => {
    result.value = null;
    userQuery.value = message;
    const targetNodes = nodeId.value ? [nodeId.value] : [];

    try {
      errorMessage.value = "";
      result.value = await store.dispatch("aiAssistant/makeAiRequest", {
        chainType: "build",
        message,
        targetNodes,
        startPosition: startPosition.value,
      });

      // Ideally, we would check for "SUCCESS" here. To be backwards compatible,
      // we check for "INPUT_NEEDED" instead.
      if (result.value?.type !== "INPUT_NEEDED") {
        enableDetachedMode();
      }
    } catch (error: any) {
      if (isAuthError(error.message)) {
        $toast.show({
          type: "error",
          headline: "KNIME Hub session expired",
          message: "Please log in again to continue.",
        });

        // mark the provider as disconnected to trigger the Login Panel
        disconnectHub();
      } else {
        errorMessage.value = error.message;
      }
    }
  };

  watch(isProcessing, (value) => {
    if (value) {
      store.dispatch("workflow/lockQuickActionMenu");
    } else {
      store.dispatch("workflow/unlockQuickActionMenu");
    }
  });

  watch(
    () => statusUpdate.value?.type,
    (value) => {
      if (value === "WORKFLOW_BUILDING") {
        enableDetachedMode();
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
