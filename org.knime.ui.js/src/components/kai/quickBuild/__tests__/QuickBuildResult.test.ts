import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import { KaiMessage } from "@/api/gateway-api/generated-api";
import type { InquiryTrace } from "@/store/ai/types";
import { createKaiInquiry } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import Message from "../../chat/message/Message.vue";
import QuickBuildResult from "../QuickBuildResult.vue";

describe("QuickBuildResult.vue", () => {
  type ComponentProps = InstanceType<typeof QuickBuildResult>["$props"];

  const defaultProps: ComponentProps = {
    message: "I built a workflow for you.",
    interactionId: "interaction-123",
  };

  const doMount = ({ props }: { props?: Partial<ComponentProps> } = {}) => {
    const mockedStores = mockStores({ stubActions: true });
    mockedStores.nodeTemplatesStore.getNodeTemplates.mockResolvedValue({
      found: {},
      missing: [],
    });

    const wrapper = mount(QuickBuildResult, {
      props: { ...defaultProps, ...props },
      global: { plugins: [mockedStores.testingPinia] },
    });

    return { wrapper };
  };

  it("renders a Message component with the provided content", () => {
    const { wrapper } = doMount();

    const message = wrapper.findComponent(Message);
    expect(message.exists()).toBe(true);
    expect(message.props("content")).toBe("I built a workflow for you.");
  });

  it("passes the assistant role to Message", () => {
    const { wrapper } = doMount();

    expect(wrapper.findComponent(Message).props("role")).toBe(
      KaiMessage.RoleEnum.Assistant,
    );
  });

  it("passes kind='quick-build-explanation' to Message for content truncation support", () => {
    const { wrapper } = doMount();

    expect(wrapper.findComponent(Message).props("kind")).toBe(
      "quick-build-explanation",
    );
  });

  it("passes interactionId to Message for feedback controls", () => {
    const { wrapper } = doMount({
      props: { interactionId: "my-interaction-id" },
    });

    expect(wrapper.findComponent(Message).props("interactionId")).toBe(
      "my-interaction-id",
    );
  });

  it("passes inquiryTraces to Message when provided", () => {
    const traces: InquiryTrace[] = [
      { inquiry: createKaiInquiry(), selectedOptionId: "allow" },
    ];

    const { wrapper } = doMount({ props: { inquiryTraces: traces } });

    expect(wrapper.findComponent(Message).props("inquiryTraces")).toEqual(
      traces,
    );
  });
});
