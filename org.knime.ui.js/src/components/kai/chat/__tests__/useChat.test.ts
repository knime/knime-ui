import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { KaiMessage } from "@/api/gateway-api/generated-api";
import type {
  ChainType,
  ConversationState,
  InquiryTrace,
  Message,
} from "@/store/ai/types";
import { createKaiInquiry } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import { mountComposable } from "@/test/utils/mountComposable";
import { MessageSeparator, useChat } from "../useChat";

vi.mock("@/components/kai/useKaiServer.ts", () => ({
  useKaiServer: vi.fn().mockImplementation(() => ({
    uiStrings: { welcomeMessages: { qa: "welcome message" } },
  })),
}));

describe("useChat", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  const emptyConversationState: ConversationState = {
    conversationId: null,
    messages: [],
    statusUpdate: null,
    isProcessing: false,
    incomingTokens: "",
    projectAndWorkflowIds: null,
    pendingInquiry: null,
    pendingInquiryTraces: [],
  };

  const doMount = ({
    chainType = "qa" as ChainType,
    messages = [],
  }: { chainType?: ChainType; messages?: Message[] } = {}) => {
    const mockedStores = mockStores();
    mockedStores.aiAssistantStore.build = { ...emptyConversationState };
    mockedStores.aiAssistantStore.qa = { ...emptyConversationState, messages };

    return {
      ...mountComposable({
        composable: useChat,
        composableProps: chainType,
        mockedStores,
      }),
      mockedStores,
    };
  };

  describe("messagesWithSeparators", () => {
    it("includes a welcome message as the first message", () => {
      const { getComposableResult } = doMount();
      const { messagesWithSeparators } = getComposableResult();

      expect((messagesWithSeparators.value[0] as Message).content).toBe(
        "welcome message",
      );
      expect((messagesWithSeparators.value[0] as Message).role).toBe(
        KaiMessage.RoleEnum.Assistant,
      );
    });

    it("adds day separators when the day changes between messages", () => {
      const messages: Message[] = [
        {
          content: "message 1",
          role: KaiMessage.RoleEnum.User,
          timestamp: new Date("2024-01-01T00:00:00Z").getTime(),
        },
        {
          content: "message 2",
          role: KaiMessage.RoleEnum.User,
          timestamp: new Date("2024-01-02T00:00:00Z").getTime(),
        },
        {
          content: "message 3",
          role: KaiMessage.RoleEnum.User,
          timestamp: new Date("2024-01-03T00:00:00Z").getTime(),
        },
      ];

      const { getComposableResult } = doMount({ messages });
      const { messagesWithSeparators } = getComposableResult();

      expect(messagesWithSeparators.value[2]).toBeInstanceOf(MessageSeparator);
      expect(messagesWithSeparators.value[4]).toBeInstanceOf(MessageSeparator);
    });

    it("adds a day separator before the first message if it's on a different day", () => {
      const messages: Message[] = [
        {
          content: "message 1",
          role: KaiMessage.RoleEnum.User,
          timestamp: new Date("2024-01-02T00:00:00Z").getTime(),
        },
      ];

      const { getComposableResult } = doMount({ messages });
      const { messagesWithSeparators } = getComposableResult();

      expect(messagesWithSeparators.value[0]).toBeInstanceOf(MessageSeparator);
    });

    it("does not add a day separator if all messages are on the same day", () => {
      const messages: Message[] = [
        {
          content: "message 1",
          role: KaiMessage.RoleEnum.User,
          timestamp: new Date("2024-01-01T00:00:00Z").getTime(),
        },
        {
          content: "message 2",
          role: KaiMessage.RoleEnum.User,
          timestamp: new Date("2024-01-01T12:00:00Z").getTime(),
        },
      ];

      const { getComposableResult } = doMount({ messages });
      const { messagesWithSeparators } = getComposableResult();

      expect(
        messagesWithSeparators.value.some(
          (item) => item instanceof MessageSeparator,
        ),
      ).toBe(false);
    });
  });

  describe("isProcessing", () => {
    it("is false by default", () => {
      const { getComposableResult } = doMount();
      expect(getComposableResult().isProcessing.value).toBe(false);
    });

    it("reflects the store's isProcessing state", () => {
      const { getComposableResult, mockedStores } = doMount();
      mockedStores.aiAssistantStore.qa.isProcessing = true;
      expect(getComposableResult().isProcessing.value).toBe(true);
    });
  });

  describe("statusUpdate", () => {
    it("is null by default", () => {
      const { getComposableResult } = doMount();
      expect(getComposableResult().statusUpdate.value).toBeNull();
    });

    it("reflects the store's statusUpdate state", () => {
      const { getComposableResult, mockedStores } = doMount();
      mockedStores.aiAssistantStore.qa.statusUpdate = {
        message: "Thinking...",
        type: "INFO",
      };
      expect(getComposableResult().statusUpdate.value).toEqual({
        message: "Thinking...",
        type: "INFO",
      });
    });
  });

  describe("pendingInquiry", () => {
    it("is null by default", () => {
      const { getComposableResult } = doMount();
      expect(getComposableResult().pendingInquiry.value).toBeNull();
    });

    it("reflects the store's pendingInquiry state", () => {
      const inquiry = createKaiInquiry();
      const { getComposableResult, mockedStores } = doMount();
      mockedStores.aiAssistantStore.qa.pendingInquiry = inquiry;
      expect(getComposableResult().pendingInquiry.value).toEqual(inquiry);
    });
  });

  describe("pendingInquiryTraces", () => {
    it("is an empty array by default", () => {
      const { getComposableResult } = doMount();
      expect(getComposableResult().pendingInquiryTraces.value).toEqual([]);
    });

    it("reflects the store's pendingInquiryTraces state", () => {
      const trace: InquiryTrace = {
        inquiry: createKaiInquiry(),
        selectedOptionId: "allow",
        suffix: "Saved",
      };
      const { getComposableResult, mockedStores } = doMount();
      mockedStores.aiAssistantStore.qa.pendingInquiryTraces = [trace];
      expect(getComposableResult().pendingInquiryTraces.value).toEqual([trace]);
    });
  });

  describe("lastAiMessage", () => {
    it("is null when there are no messages", () => {
      const { getComposableResult } = doMount();
      expect(getComposableResult().lastAiMessage.value).toBeNull();
    });

    it("returns the last assistant message", () => {
      const messages: Message[] = [
        { content: "user question", role: KaiMessage.RoleEnum.User },
        { content: "assistant reply", role: KaiMessage.RoleEnum.Assistant },
        { content: "follow-up question", role: KaiMessage.RoleEnum.User },
        { content: "second reply", role: KaiMessage.RoleEnum.Assistant },
      ];

      const { getComposableResult } = doMount({ messages });
      expect(getComposableResult().lastAiMessage.value?.content).toBe(
        "second reply",
      );
    });

    it("ignores user messages when finding the last assistant message", () => {
      const messages: Message[] = [
        { content: "assistant reply", role: KaiMessage.RoleEnum.Assistant },
        { content: "user follow-up", role: KaiMessage.RoleEnum.User },
      ];

      const { getComposableResult } = doMount({ messages });
      expect(getComposableResult().lastAiMessage.value?.content).toBe(
        "assistant reply",
      );
    });

    it("exposes inquiryTraces on the last assistant message", () => {
      const trace: InquiryTrace = {
        inquiry: createKaiInquiry(),
        selectedOptionId: "allow",
      };
      const messages: Message[] = [
        {
          content: "assistant reply",
          role: KaiMessage.RoleEnum.Assistant,
          inquiryTraces: [trace],
        },
      ];

      const { getComposableResult } = doMount({ messages });
      expect(getComposableResult().lastAiMessage.value?.inquiryTraces).toEqual([
        trace,
      ]);
    });
  });

  describe("lastUserMessage", () => {
    it("returns an empty string when there are no messages", () => {
      const { getComposableResult } = doMount();
      expect(getComposableResult().lastUserMessage.value).toBe("");
    });

    it("returns the content of the last user message", () => {
      const messages: Message[] = [
        { content: "first message", role: KaiMessage.RoleEnum.User },
        { content: "assistant reply", role: KaiMessage.RoleEnum.Assistant },
        { content: "second message", role: KaiMessage.RoleEnum.User },
      ];

      const { getComposableResult } = doMount({ messages });
      expect(getComposableResult().lastUserMessage.value).toBe(
        "second message",
      );
    });

    it("ignores assistant messages when finding the last user message", () => {
      const messages: Message[] = [
        { content: "user question", role: KaiMessage.RoleEnum.User },
        { content: "assistant reply", role: KaiMessage.RoleEnum.Assistant },
      ];

      const { getComposableResult } = doMount({ messages });
      expect(getComposableResult().lastUserMessage.value).toBe("user question");
    });
  });
});
