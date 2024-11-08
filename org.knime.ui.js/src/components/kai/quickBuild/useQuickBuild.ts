import { type Ref, ref, watch } from "vue";

import type { XY } from "@/api/gateway-api/generated-api";
import { useStore } from "@/composables/useStore";
import { useChat } from "../chat/useChat";

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

  const userQuery = ref("");
  const errorMessage = ref("");
  const result = ref<Result | null>(null);

  const { isProcessing, lastUserMessage, abortSendMessage, statusUpdate } =
    useChat("build");

  let enableBannerModeCalled = false;
  const enableBannerMode = () => {
    if (enableBannerModeCalled) {
      return;
    }

    store.dispatch("workflow/enableBannerMode");
    enableBannerModeCalled = true;
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

  watch(
    () => statusUpdate.value?.type,
    (value) => {
      if (value === "WORKFLOW_BUILDING") {
        enableBannerMode();
      }
    },
  );

  watch(result, (value) => {
    if (value?.type === "SUCCESS") {
      enableBannerMode();
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
