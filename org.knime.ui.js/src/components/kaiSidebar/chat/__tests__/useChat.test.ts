import { afterAll, beforeAll, expect, describe, it, vi } from "vitest";
import { useChat, MessageSeparator } from "../useChat";
import { defineComponent } from "vue";
import { mount } from "@vue/test-utils";
import { mockVuexStore } from "@/test/utils";
import { KaiMessage } from "@/api/gateway-api/generated-api";
import type { ChainType } from "@/components/kaiSidebar/types";
import type { Message } from "@/store/aiAssistant";
import type { MessageWithFeedbackSubmit } from "../useChat";

vi.mock("@/components/kaiSidebar/useKaiServer.ts", () => ({
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

  const doMount = ({
    chainType = "qa",
    messages = [],
  }: { chainType?: ChainType; messages?: Message[] } = {}) => {
    const storeConfig = {
      aiAssistant: {
        state: {
          hubID: null,
          qa: {
            conversationId: null,
            messages,
            statusUpdate: null,
            isProcessing: false,
            incomingTokens: "",
            projectAndWorkflowIds: null,
          },
          build: {
            conversationId: null,
            messages: [],
            statusUpdate: null,
            isProcessing: false,
            incomingTokens: "",
            projectAndWorkflowIds: null,
          },
        },
        actions: {},
      },
    };
    const $store = mockVuexStore(storeConfig);
    const dispatchSpy = vi.spyOn($store, "dispatch");

    const TestComponent = defineComponent({
      setup() {
        return useChat(chainType);
      },
      template: "<div></div>",
    });

    const wrapper = mount(TestComponent, {
      global: { plugins: [$store] },
    });

    const { messagesWithSeparators } = wrapper.vm;

    return {
      messagesWithSeparators,
      dispatchSpy,
    };
  };

  describe("messagesWithSeparators", () => {
    it("includes a welcome message as the first message", () => {
      const { messagesWithSeparators } = doMount();
      expect(
        (messagesWithSeparators[0] as MessageWithFeedbackSubmit).content,
      ).toBe("welcome message");
      expect(
        (messagesWithSeparators[0] as MessageWithFeedbackSubmit).role,
      ).toBe(KaiMessage.RoleEnum.Assistant);
    });

    it("maps raw messages to messages with submitFeedback function", () => {
      const messages = [
        { content: "message 1", role: KaiMessage.RoleEnum.User },
        {
          content: "message 2",
          role: KaiMessage.RoleEnum.User,
          feedbackId: "1",
        },
      ];
      const feedback = { isPositive: true, comment: "" };

      const { dispatchSpy, messagesWithSeparators } = doMount({ messages });
      expect(
        (messagesWithSeparators[0] as MessageWithFeedbackSubmit).submitFeedback,
      ).toBeFalsy();
      expect(
        (messagesWithSeparators[1] as MessageWithFeedbackSubmit).submitFeedback,
      ).toBeFalsy();

      const submitFeedback = (
        messagesWithSeparators[2] as MessageWithFeedbackSubmit
      ).submitFeedback;
      submitFeedback!(feedback);

      expect(dispatchSpy).toHaveBeenCalledWith("aiAssistant/submitFeedback", {
        chainType: "qa",
        idx: 1,
        feedback,
      });
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
});
