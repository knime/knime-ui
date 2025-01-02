import { computed } from "vue";
import { storeToRefs } from "pinia";

import { KaiMessage } from "@/api/gateway-api/generated-api";
import { useConfirmDialog } from "@/composables/useConfirmDialog";
import { type Message, useAIAssistantStore } from "@/store/aiAssistant";
import type { ChainType } from "../types";
import { useKaiServer } from "../useKaiServer";

import { isSameDay } from "./utils";

class MessageSeparator {
  timestamp: number;

  constructor(timestamp: number) {
    this.timestamp = timestamp;
  }
}

const useChat = (chainType: ChainType) => {
  const aiAssistant = storeToRefs(useAIAssistantStore());
  const { makeAiRequest, abortAiRequest } = useAIAssistantStore();
  const { uiStrings } = useKaiServer();

  const { show: showConfirmDialog } = useConfirmDialog();

  const messagesWithSeparators = computed(() => {
    // Computes an array of messages interlaced with day separators.

    const now = Date.now();
    const rawMessages = aiAssistant[chainType].value.messages;
    const initialTimestamp = rawMessages[0]?.timestamp ?? now;
    const welcomeMessage: Message = {
      role: KaiMessage.RoleEnum.Assistant,
      content: uiStrings.welcomeMessages?.[chainType] ?? "",
      timestamp: initialTimestamp,
    };

    const allMessages: Message[] = [
      // The first message is always a welcome message.
      welcomeMessage,
      ...rawMessages,
    ];

    // Initialize array for messages and separators.
    const result: (Message | MessageSeparator)[] = [];

    // Loop through messages, including an extra iteration for end-of-list processing.
    for (let i = 0; i < allMessages.length + 1; i++) {
      // Get current message or null for final loop iteration.
      const currMsg = allMessages[i] ?? null;
      const currMsgTimestamp = currMsg?.timestamp ?? now;
      // Use previous message's timestamp or fallback to current date for first loop iteration.
      const prevMsgTimestamp = allMessages[i - 1]?.timestamp ?? now;

      // Add a separator when the day changes
      if (!isSameDay(currMsgTimestamp, prevMsgTimestamp)) {
        result.push(new MessageSeparator(currMsgTimestamp));
      }

      if (currMsg) {
        result.push(currMsg);
      }
    }
    return result;
  });

  const isProcessing = computed(
    () => aiAssistant[chainType].value.isProcessing,
  );

  const incomingTokens = computed(
    () => aiAssistant[chainType].value.incomingTokens,
  );

  const statusUpdate = computed(
    () => aiAssistant[chainType].value.statusUpdate,
  );

  const lastUserMessage = computed(() => {
    const messages = aiAssistant[chainType].value.messages;

    const lastUserMessage = messages.findLast(
      (message: Message) => message.role === "user",
    );

    return lastUserMessage?.content ?? "";
  });

  const sendMessage = async ({
    message,
    targetNodes = [],
  }: {
    message: string;
    targetNodes?: string[];
  }) => {
    await makeAiRequest({
      chainType,
      message,
      targetNodes,
    });
  };

  const abortSendMessage = async () => {
    const { confirmed } = await showConfirmDialog({
      title: "Confirm action",
      message:
        "Are you sure you want to abort the request to the KNIME AI Assistant?",
      buttons: [
        { type: "cancel", label: "Cancel" },
        { type: "confirm", label: "Confirm", flushRight: true },
      ],
    });
    if (confirmed) {
      abortAiRequest({
        chainType,
      });
    }
  };

  return {
    messagesWithSeparators,
    isProcessing,
    incomingTokens,
    statusUpdate,
    lastUserMessage,
    sendMessage,
    abortSendMessage,
  };
};

export { useChat, MessageSeparator };
