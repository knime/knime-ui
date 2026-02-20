import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import { KaiMessage } from "@/api/gateway-api/generated-api";
import { mockStores } from "@/test/utils/mockStores";
import ChatControls from "../../chat/ChatControls.vue";
import Message from "../../chat/message/Message.vue";
import QuickBuildInput from "../QuickBuildInput.vue";

describe("QuickBuildInput.vue", () => {
  type ComponentProps = InstanceType<typeof QuickBuildInput>["$props"];

  const defaultProps: ComponentProps = {
    lastUserMessage: "",
    errorMessage: "",
    usage: null,
  };

  const doMount = ({ props }: { props?: Partial<ComponentProps> } = {}) => {
    const mockedStores = mockStores({ stubActions: true });
    mockedStores.nodeTemplatesStore.getNodeTemplates.mockResolvedValue({
      found: {},
      missing: [],
    });

    const wrapper = mount(QuickBuildInput, {
      props: { ...defaultProps, ...props },
      global: { plugins: [mockedStores.testingPinia] },
    });

    return { wrapper, mockedStores };
  };

  describe("prompt message", () => {
    it("renders the prompt Message when both prompt and interactionId are provided", () => {
      const { wrapper } = doMount({
        props: {
          prompt: "Here is a suggested workflow",
          interactionId: "abc-123",
        },
      });

      const message = wrapper.findComponent(Message);
      expect(message.exists()).toBe(true);
      expect(message.props("content")).toBe("Here is a suggested workflow");
      expect(message.props("role")).toBe(KaiMessage.RoleEnum.Assistant);
    });

    it("does not render the prompt Message when prompt is undefined", () => {
      const { wrapper } = doMount({
        props: { interactionId: "abc-123" },
      });

      expect(wrapper.findComponent(Message).exists()).toBe(false);
    });

    it("does not render the prompt Message when interactionId is undefined", () => {
      const { wrapper } = doMount({
        props: { prompt: "Here is a suggested workflow" },
      });

      expect(wrapper.findComponent(Message).exists()).toBe(false);
    });
  });

  describe("error display", () => {
    it("shows the error message when errorMessage is set", () => {
      const { wrapper } = doMount({
        props: { errorMessage: "Something went wrong" },
      });

      expect(wrapper.find(".error").exists()).toBe(true);
      expect(wrapper.find(".error").text()).toContain("Something went wrong");
    });

    it("does not show the error div when errorMessage is empty", () => {
      const { wrapper } = doMount();

      expect(wrapper.find(".error").exists()).toBe(false);
    });
  });

  describe("chatControls integration", () => {
    it("renders ChatControls with the 'What would you like to build?' placeholder", () => {
      const { wrapper } = doMount();

      expect(wrapper.findComponent(ChatControls).props("placeholder")).toBe(
        "What would you like to build?",
      );
    });

    it("passes lastUserMessage as text when an errorMessage is set", () => {
      const { wrapper } = doMount({
        props: {
          lastUserMessage: "build me a pipeline",
          errorMessage: "Something failed",
        },
      });

      expect(wrapper.findComponent(ChatControls).props("text")).toBe(
        "build me a pipeline",
      );
    });

    it("passes empty string as text when there is no error", () => {
      const { wrapper } = doMount({
        props: { lastUserMessage: "build me a pipeline", errorMessage: "" },
      });

      expect(wrapper.findComponent(ChatControls).props("text")).toBe("");
    });
  });
});
