import { computed } from "vue";
import { useStore } from "@/composables/useStore";
import type { ChainType } from "../types";

const useChat = (chainType: ChainType) => {
  const store = useStore();

  const messages = computed(() => store.state.aiAssistant[chainType].messages);

  const isProcessing = computed(
    () => store.state.aiAssistant[chainType].isProcessing,
  );

  const incomingTokens = computed(
    () => store.state.aiAssistant[chainType].incomingTokens,
  );

  const statusUpdate = computed(
    () => store.state.aiAssistant[chainType].statusUpdate,
  );

  const lastUserMessage = computed(() => {
    const messages = store.state.aiAssistant[chainType].messages;
    // @ts-expect-error
    const lastUserMessage = messages.findLast(
      (message) => message.role === "user",
    );
    return lastUserMessage?.content ?? "";
  });

  const sendMessage = (message: string) => {
    store.dispatch("aiAssistant/makeAiRequest", {
      chainType,
      message,
    });
  };

  const abortSendMessage = () => {
    if (
      confirm(
        "Are you sure you want to abort the request to the KNIME AI Assistant?",
      )
    ) {
      store.dispatch("aiAssistant/abortAiRequest", {
        chainType,
      });
    }
  };

  return {
    messages,
    isProcessing,
    incomingTokens,
    statusUpdate,
    lastUserMessage,
    sendMessage,
    abortSendMessage,
  };
};

export { useChat };
