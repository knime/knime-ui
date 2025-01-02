import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { defineComponent } from "vue";
import { mount } from "@vue/test-utils";

import { KaiMessage } from "@/api/gateway-api/generated-api";
import type { ChainType } from "@/components/kai/types";
import type { Message } from "@/store/aiAssistant";
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

  const doMount = ({
    chainType = "qa",
    messages = [],
  }: { chainType?: ChainType; messages?: Message[] } = {}) => {
    const mockedStores = mockStores();
    mockedStores.aiAssistantStore.build = {
      conversationId: null,
      messages: [],
      statusUpdate: null,
      isProcessing: false,
      incomingTokens: "",
      projectAndWorkflowIds: null,
    };
    mockedStores.aiAssistantStore.qa = {
      conversationId: null,
      messages,
      statusUpdate: null,
      isProcessing: false,
      incomingTokens: "",
      projectAndWorkflowIds: null,
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

    const { messagesWithSeparators } = wrapper.vm;

    return {
      messagesWithSeparators,
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
});
