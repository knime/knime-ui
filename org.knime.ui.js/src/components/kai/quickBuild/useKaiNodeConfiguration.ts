import { type Ref, ref } from "vue";

import type { XY } from "@/api/gateway-api/generated-api";
import {
  type AiAssistantBuildEventPayload,
  useAIAssistantStore,
} from "@/store/aiAssistant";
import { useNodeConfigurationStore } from "@/store/nodeConfiguration/nodeConfiguration";
import { getToastPresets } from "@/toastPresets";
import { useChat } from "../chat/useChat";
import { useHubAuth } from "../useHubAuth";

export const useKaiNodeConfiguration = ({
  nodeId,
  startPosition,
}: {
  nodeId: Ref<string | null>;
  startPosition: Ref<XY>;
}) => {
  const { makeAiRequest } = useAIAssistantStore();

  const { isAuthError, disconnectHub } = useHubAuth();

  const { toastPresets } = getToastPresets();

  const userQuery = ref("");
  const errorMessage = ref("");
  const result = ref<AiAssistantBuildEventPayload | null>(null);

  const nodeConfigurationStore = useNodeConfigurationStore();

  const { isProcessing, lastUserMessage, abortSendMessage, statusUpdate } =
    useChat("build");

  const sendMessage = async ({ message }: { message: string }) => {
    result.value = null;
    message = `**Node configuration request**:\n\n${message}`;
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

      if (
        result.value &&
        result.value.type !== "INPUT_NEEDED" &&
        nodeId.value
      ) {
        // HACK: really bad way to force a re-render of the config dialogue
        nodeConfigurationStore.setActiveExtensionConfig(null);
        nodeConfigurationStore.setActiveNodeId(null);

        setTimeout(() => {
          nodeConfigurationStore.setActiveNodeId(nodeId.value);
        }, 100); // adjust the delay as needed
      }
    } catch (error: any) {
      if (isAuthError(error.message)) {
        toastPresets.connectivity.hubSessionExpired();

        // mark the provider as disconnected to trigger the Login Panel
        disconnectHub();
      } else {
        errorMessage.value = error.message;
      }
    }
  };

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
