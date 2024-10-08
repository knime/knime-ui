import { computed } from "vue";

import { useStore } from "@/composables/useStore";
import type { Feedback, Message } from "@/store/aiAssistant";
import type { ChainType } from "../types";
import { useKaiServer } from "../useKaiServer";
import { isSameDay } from "./utils";
import { KaiMessage } from "@/api/gateway-api/generated-api";

class MessageSeparator {
  timestamp: number;

  constructor(timestamp: number) {
    this.timestamp = timestamp;
  }
}

/**
 * Represents a chat message with optional feedback functionality.
 */
type MessageWithFeedbackSubmit = Message & {
  submitFeedback?: CallableFunction;
};

const useChat = (chainType: ChainType) => {
  const { uiStrings } = useKaiServer();

  const store = useStore();

  const messagesWithSeparators = computed(() => {
    // Computes an array of messages interlaced with day separators.

    const now = Date.now();
    const rawMessages = store.state.aiAssistant[chainType].messages;
    const initialTimestamp = rawMessages[0]?.timestamp ?? now;
    const welcomeMessage: Message = {
      role: KaiMessage.RoleEnum.Assistant,
      content: uiStrings.welcomeMessages?.[chainType] ?? "",
      timestamp: initialTimestamp,
    };

    const allMessages: MessageWithFeedbackSubmit[] = [
      // The first message is always a welcome message.
      welcomeMessage,
      ...rawMessages.map((message, idx) => {
        if (message.feedbackId) {
          // Add submitFeedback function to messages with feedbackId.
          return {
            ...message,
            submitFeedback: (feedback: Feedback) =>
              store.dispatch("aiAssistant/submitFeedback", {
                chainType,
                idx,
                feedback,
              }),
          };
        } else {
          return message;
        }
      }),
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

    const lastUserMessage = messages.findLast(
      (message: Message) => message.role === "user",
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
export type { MessageWithFeedbackSubmit };
