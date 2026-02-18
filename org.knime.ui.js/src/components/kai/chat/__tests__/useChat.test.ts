import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { defineComponent } from "vue";
import { mount } from "@vue/test-utils";

import {
  KaiInquiry,
  type KaiInquiry as KaiInquiryType,
  KaiMessage,
} from "@/api/gateway-api/generated-api";
import type { ChainType, InquiryTrace, Message } from "@/store/ai/types";
import { mockStores } from "@/test/utils/mockStores";
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

  const emptyConversationState = {
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
    chainType = "qa",
    messages = [],
  }: { chainType?: ChainType; messages?: Message[] } = {}) => {
    const mockedStores = mockStores();
    mockedStores.aiAssistantStore.build = { ...emptyConversationState };
    mockedStores.aiAssistantStore.qa = {
      ...emptyConversationState,
      messages,
    };

    const TestComponent = defineComponent({
      setup() {
        return useChat(chainType);
      },
      template: "<div></div>",
    });

    const wrapper = mount(TestComponent, {
      global: { plugins: [mockedStores.testingPinia] },
    });

    return {
      vm: wrapper.vm,
      messagesWithSeparators: wrapper.vm.messagesWithSeparators,
      mockedStores,
    };
  };

  describe("messagesWithSeparators", () => {
    it("includes a welcome message as the first message", () => {
      const { messagesWithSeparators } = doMount();
      expect((messagesWithSeparators[0] as Message).content).toBe(
        "welcome message",
      );
      expect((messagesWithSeparators[0] as Message).role).toBe(
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

      const { messagesWithSeparators } = doMount({ messages });

      expect(messagesWithSeparators[2]).toBeInstanceOf(MessageSeparator);
      expect(messagesWithSeparators[4]).toBeInstanceOf(MessageSeparator);
    });

    it("adds a day separator before the first message if it's on a different day", () => {
      const messages: Message[] = [
        {
          content: "message 1",
          role: KaiMessage.RoleEnum.User,
          timestamp: new Date("2024-01-02T00:00:00Z").getTime(),
        },
      ];

      const { messagesWithSeparators } = doMount({ messages });

      expect(messagesWithSeparators[0]).toBeInstanceOf(MessageSeparator);
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

      const { messagesWithSeparators } = doMount({ messages });

      expect(
        messagesWithSeparators.some((item) => item instanceof MessageSeparator),
      ).toBe(false);
    });
  });

  describe("isProcessing", () => {
    it("is false by default", () => {
      const { vm } = doMount();
      expect(vm.isProcessing).toBe(false);
    });

    it("reflects the store's isProcessing state", () => {
      const { vm, mockedStores } = doMount();
      mockedStores.aiAssistantStore.qa.isProcessing = true;
      expect(vm.isProcessing).toBe(true);
    });
  });

  describe("statusUpdate", () => {
    it("is null by default", () => {
      const { vm } = doMount();
      expect(vm.statusUpdate).toBeNull();
    });

    it("reflects the store's statusUpdate state", () => {
      const { vm, mockedStores } = doMount();
      mockedStores.aiAssistantStore.qa.statusUpdate = {
        message: "Thinking...",
        type: "INFO",
      };
      expect(vm.statusUpdate).toEqual({ message: "Thinking...", type: "INFO" });
    });
  });

  describe("pendingInquiry", () => {
    it("is null by default", () => {
      const { vm } = doMount();
      expect(vm.pendingInquiry).toBeNull();
    });

    it("reflects the store's pendingInquiry state", () => {
      const inquiry: KaiInquiryType = {
        inquiryId: "inq-1",
        inquiryType: KaiInquiry.InquiryTypeEnum.Permission,
        title: "Allow data sampling?",
        description: "K-AI wants to sample data.",
        options: [{ id: "allow", label: "Allow", style: "primary" }],
      };

      const { vm, mockedStores } = doMount();
      mockedStores.aiAssistantStore.qa.pendingInquiry = inquiry;

      expect(vm.pendingInquiry).toEqual(inquiry);
    });
  });

  describe("pendingInquiryTraces", () => {
    it("is an empty array by default", () => {
      const { vm } = doMount();
      expect(vm.pendingInquiryTraces).toEqual([]);
    });

    it("reflects the store's pendingInquiryTraces state", () => {
      const trace: InquiryTrace = {
        inquiry: {
          inquiryId: "inq-1",
          inquiryType: KaiInquiry.InquiryTypeEnum.Permission,
          title: "Allow data sampling?",
          description: "K-AI wants to sample data.",
          options: [{ id: "allow", label: "Allow", style: "primary" }],
        },
        selectedOptionId: "allow",
        suffix: "Saved",
      };

      const { vm, mockedStores } = doMount();
      mockedStores.aiAssistantStore.qa.pendingInquiryTraces = [trace];

      expect(vm.pendingInquiryTraces).toEqual([trace]);
    });
  });

  describe("lastAiMessage", () => {
    it("is null when there are no messages", () => {
      const { vm } = doMount();
      expect(vm.lastAiMessage).toBeNull();
    });

    it("returns the last assistant message", () => {
      const messages: Message[] = [
        { content: "user question", role: KaiMessage.RoleEnum.User },
        { content: "assistant reply", role: KaiMessage.RoleEnum.Assistant },
        { content: "follow-up question", role: KaiMessage.RoleEnum.User },
        { content: "second reply", role: KaiMessage.RoleEnum.Assistant },
      ];

      const { vm } = doMount({ messages });
      expect(vm.lastAiMessage?.content).toBe("second reply");
    });

    it("ignores user messages when finding the last assistant message", () => {
      const messages: Message[] = [
        { content: "assistant reply", role: KaiMessage.RoleEnum.Assistant },
        { content: "user follow-up", role: KaiMessage.RoleEnum.User },
      ];

      const { vm } = doMount({ messages });
      expect(vm.lastAiMessage?.content).toBe("assistant reply");
    });

    it("exposes inquiryTraces on the last assistant message", () => {
      const trace: InquiryTrace = {
        inquiry: {
          inquiryId: "inq-1",
          inquiryType: KaiInquiry.InquiryTypeEnum.Permission,
          title: "Allow data sampling?",
          description: "K-AI wants to sample data.",
          options: [{ id: "allow", label: "Allow", style: "primary" }],
        },
        selectedOptionId: "allow",
      };
      const messages: Message[] = [
        {
          content: "assistant reply",
          role: KaiMessage.RoleEnum.Assistant,
          inquiryTraces: [trace],
        },
      ];

      const { vm } = doMount({ messages });
      expect(vm.lastAiMessage?.inquiryTraces).toEqual([trace]);
    });
  });

  describe("lastUserMessage", () => {
    it("returns an empty string when there are no messages", () => {
      const { vm } = doMount();
      expect(vm.lastUserMessage).toBe("");
    });

    it("returns the content of the last user message", () => {
      const messages: Message[] = [
        { content: "first message", role: KaiMessage.RoleEnum.User },
        { content: "assistant reply", role: KaiMessage.RoleEnum.Assistant },
        { content: "second message", role: KaiMessage.RoleEnum.User },
      ];

      const { vm } = doMount({ messages });
      expect(vm.lastUserMessage).toBe("second message");
    });

    it("ignores assistant messages when finding the last user message", () => {
      const messages: Message[] = [
        { content: "user question", role: KaiMessage.RoleEnum.User },
        { content: "assistant reply", role: KaiMessage.RoleEnum.Assistant },
      ];

      const { vm } = doMount({ messages });
      expect(vm.lastUserMessage).toBe("user question");
    });
  });
});
