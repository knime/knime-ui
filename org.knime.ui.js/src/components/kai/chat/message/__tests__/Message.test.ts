import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { API } from "@api";

import KnimeIcon from "@knime/styles/img/KNIME_Triangle.svg";
import UserIcon from "@knime/styles/img/icons/user.svg";

import { KaiMessage } from "@/api/gateway-api/generated-api";
import type { InquiryTrace } from "@/store/ai/types";
import {
  NODE_FACTORIES,
  createAvailablePortTypes,
  createKaiInquiry,
  createNodeTemplate,
  createNodeWithExtensionInfo,
} from "@/test/factories";
import { deepMocked } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";
import MarkdownRenderer from "../../MarkdownRenderer.vue";
import FeedbackControls from "../FeedbackControls.vue";
import InquiryResponseTrace from "../InquiryResponseTrace.vue";
import KaiStatus from "../KaiStatus.vue";
import Message from "../Message.vue";
import MessagePlaceholder from "../MessagePlaceholder.vue";
import SuggestedNodes from "../SuggestedNodes.vue";
import AdditionalResources from "../additionalResources/AdditionalResources.vue";
import KaiInquiryCard from "../inquiry/KaiInquiryCard.vue";

const mockedAPI = deepMocked(API);

describe("Message.vue", () => {
  type ComponentProps = InstanceType<typeof Message>["$props"];

  const FACTORY_ID = NODE_FACTORIES.ExcelTableReaderNodeFactory;

  const knownNodeWithExtensionInfo = createNodeWithExtensionInfo();
  const missingNodeWithExtensionInfo1 = createNodeWithExtensionInfo({
    factoryId: "FIRST.node.from.uninstalled.extension",
    factoryName: "FIRST.node.from.uninstalled.extension",
    title: "An Awesome FIRST node",
    owner: "knime",
    featureName: "KNIME Awesome nodes",
    featureSymbolicName: "ext.with.awesome.nodes",
  });
  const missingNodeWithExtensionInfo2 = createNodeWithExtensionInfo({
    factoryId: "SECOND.node.from.uninstalled.extension",
    factoryName: "SECOND.node.from.uninstalled.extension",
    title: "An Awesome SECOND node",
    owner: "knime",
    featureName: "KNIME Awesome nodes",
    featureSymbolicName: "ext.with.awesome.nodes",
  });
  const missingNodeWithExtensionInfo3 = createNodeWithExtensionInfo({
    factoryId: "some.node.from.a.SECOND.uninstalled.extension",
    factoryName: "some.node.from.a.SECOND.uninstalled.extension",
    title: "A node that sucks sometimes",
    owner: "someone else",
    featureName: "John's buggy nodes",
    featureSymbolicName: "johns.buggy.nodes",
  });

  const nodeTemplate1 = createNodeTemplate({
    id: FACTORY_ID,
    name: knownNodeWithExtensionInfo.title,
    nodeFactory: {
      className: FACTORY_ID,
    },
  });

  mockedAPI.noderepository.getNodeTemplates.mockResolvedValue({
    [nodeTemplate1.id]: nodeTemplate1,
  });

  const defaultProps: ComponentProps = {
    role: KaiMessage.RoleEnum.Assistant,
    content: "Mock AI message",
    nodes: [
      knownNodeWithExtensionInfo,
      missingNodeWithExtensionInfo1,
      missingNodeWithExtensionInfo2,
      missingNodeWithExtensionInfo3,
    ],
    references: { someReference: ["www.google.com"] },
  };

  const doMount = ({ props }: { props?: Partial<ComponentProps> } = {}) => {
    const mockedStores = mockStores();

    const availablePortTypes = createAvailablePortTypes();
    mockedStores.applicationStore.setAvailablePortTypes(availablePortTypes);

    const wrapper = mount(Message, {
      props: { ...defaultProps, ...props },
      global: {
        plugins: [mockedStores.testingPinia],
      },
    });

    return { wrapper, mockedStores };
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("assistant message", () => {
    it("should render correctly", () => {
      const { wrapper } = doMount();

      expect(wrapper.find(".icon").classes()).not.toContain("user");
      expect(wrapper.findComponent(UserIcon).exists()).toBe(false);
      expect(wrapper.findComponent(KnimeIcon).exists()).toBe(true);
      expect(wrapper.find(".body").classes()).not.toContain("user");
      expect(wrapper.findComponent(MarkdownRenderer).text()).toMatch(
        defaultProps.content!,
      );
      expect(wrapper.findComponent(MessagePlaceholder).exists()).toBe(false);
    });

    it("should render message placeholder", () => {
      const { wrapper } = doMount({
        props: {
          content: "",
        },
      });

      expect(wrapper.find("content").exists()).toBe(false);
      expect(wrapper.findComponent(MessagePlaceholder).exists()).toBe(true);
    });

    it("should render suggested nodes and AdditionalResources button", async () => {
      const { wrapper, mockedStores } = doMount();

      await flushPromises();
      expect(mockedAPI.noderepository.getNodeTemplates).toHaveBeenCalledOnce();
      expect(
        wrapper.findComponent(SuggestedNodes).props("nodeTemplates"),
      ).toEqual([mockedStores.nodeTemplatesStore.cache[FACTORY_ID]]);

      expect(
        wrapper.findComponent(AdditionalResources).props("extensions"),
      ).toEqual({
        [missingNodeWithExtensionInfo1.featureSymbolicName]: {
          featureName: missingNodeWithExtensionInfo1.featureName,
          featureSymbolicName:
            missingNodeWithExtensionInfo1.featureSymbolicName,
          owner: missingNodeWithExtensionInfo1.owner,
          nodes: [
            {
              factoryId: missingNodeWithExtensionInfo1.factoryId,
              factoryName: missingNodeWithExtensionInfo1.factoryName,
              title: missingNodeWithExtensionInfo1.title,
            },
            {
              factoryId: missingNodeWithExtensionInfo2.factoryId,
              factoryName: missingNodeWithExtensionInfo2.factoryName,
              title: missingNodeWithExtensionInfo2.title,
            },
          ],
        },
        [missingNodeWithExtensionInfo3.featureSymbolicName]: {
          featureName: missingNodeWithExtensionInfo3.featureName,
          featureSymbolicName:
            missingNodeWithExtensionInfo3.featureSymbolicName,
          owner: missingNodeWithExtensionInfo3.owner,
          nodes: [
            {
              factoryId: missingNodeWithExtensionInfo3.factoryId,
              factoryName: missingNodeWithExtensionInfo3.factoryName,
              title: missingNodeWithExtensionInfo3.title,
            },
          ],
        },
      });
    });

    it("should render kai status", () => {
      const { wrapper } = doMount({
        props: {
          statusUpdate: { message: "some status from KAI" },
        },
      });

      expect(wrapper.findComponent(KaiStatus).props("status")).toBe(
        "some status from KAI",
      );
    });
  });

  describe("user message", () => {
    it("should render correctly", () => {
      const { wrapper } = doMount({
        props: {
          role: KaiMessage.RoleEnum.User,
        },
      });

      expect(wrapper.find(".icon").classes()).toContain("user");
      expect(wrapper.findComponent(UserIcon).exists()).toBe(true);
      expect(wrapper.findComponent(KnimeIcon).exists()).toBe(false);
      expect(wrapper.find(".body").classes()).toContain("user");
      expect(wrapper.findComponent(MarkdownRenderer).text()).toMatch(
        defaultProps.content!,
      );
      expect(wrapper.findComponent(MessagePlaceholder).exists()).toBe(false);
      expect(mockedAPI.noderepository.getNodeTemplates).not.toHaveBeenCalled();
    });
  });

  it("should render feedback controls", async () => {
    const interactionId = "some-interaction-id";
    const { wrapper } = doMount({
      props: {
        role: KaiMessage.RoleEnum.User,
        isError: true,
        interactionId,
      },
    });

    expect(wrapper.findComponent(FeedbackControls).exists()).toBe(false);

    await wrapper.setProps({
      role: KaiMessage.RoleEnum.Assistant,
      isError: false,
    });

    expect(wrapper.findComponent(FeedbackControls).exists()).toBe(true);
    expect(wrapper.findComponent(FeedbackControls).props("interactionId")).toBe(
      interactionId,
    );
  });

  describe("quick-build explanation truncation", () => {
    it("truncates content if kind is quick-build-explanation and there are more than 2 lines", () => {
      const multiLine = "Line1\nLine2\nLine3\nLine4";
      const { wrapper } = doMount({
        props: { kind: "quick-build-explanation", content: multiLine },
      });

      expect(wrapper.findComponent(MarkdownRenderer).text()).toContain(
        "Line1\nLine2 …",
      );
      expect(wrapper.find(".show-full-content-button").exists()).toBe(true);
    });

    it('displays full content after clicking "Show full explanation"', async () => {
      const multiLine = "Line1\nLine2\nLine3\nLine4";
      const { wrapper } = doMount({
        props: { kind: "quick-build-explanation", content: multiLine },
      });

      expect(wrapper.findComponent(MarkdownRenderer).text()).toContain(
        "Line1\nLine2 …",
      );
      await wrapper.find(".show-full-content-button").trigger("click");

      expect(wrapper.findComponent(MarkdownRenderer).text()).toBe(multiLine);
      expect(wrapper.find(".show-full-content-button").exists()).toBe(false);
    });

    it("does not truncate content if there are 2 or fewer lines", () => {
      const twoLines = "Line1\nLine2";
      const { wrapper } = doMount({
        props: { kind: "quick-build-explanation", content: twoLines },
      });

      expect(wrapper.findComponent(MarkdownRenderer).text()).toBe(twoLines);
      expect(wrapper.find(".show-full-content-button").exists()).toBe(false);
    });

    it("does not truncate content if kind is not quick-build-explanation", () => {
      const multiLine = "Line1\nLine2\nLine3\nLine4";
      const { wrapper } = doMount({
        props: { kind: "other", content: multiLine },
      });

      expect(wrapper.findComponent(MarkdownRenderer).text()).toBe(multiLine);
      expect(wrapper.find(".show-full-content-button").exists()).toBe(false);
    });
  });

  describe("inquiry rendering", () => {
    const pendingInquiry = createKaiInquiry();
    const traces: InquiryTrace[] = [
      { inquiry: pendingInquiry, selectedOptionId: "allow", suffix: "Saved" },
    ];

    it("renders InquiryResponseTrace rows for each trace", () => {
      const { wrapper } = doMount({ props: { inquiryTraces: traces } });

      const renderedTraces = wrapper.findAllComponents(InquiryResponseTrace);
      expect(renderedTraces).toHaveLength(1);
      expect(renderedTraces[0].props("trace")).toEqual(traces[0]);
    });

    it("does not render the inquiry-traces section when there are no traces", () => {
      const { wrapper } = doMount();

      expect(wrapper.find(".inquiry-traces").exists()).toBe(false);
    });

    it("renders KaiInquiryCard and hides markdown when pendingInquiry and chainType are set", () => {
      const { wrapper } = doMount({
        props: { pendingInquiry: { inquiry: pendingInquiry, chainType: "qa" } },
      });

      expect(wrapper.findComponent(KaiInquiryCard).exists()).toBe(true);
      expect(wrapper.findComponent(MarkdownRenderer).exists()).toBe(false);
    });

    it("uses variant='waiting' on KaiStatus when pendingInquiry is set", () => {
      const { wrapper } = doMount({
        props: {
          pendingInquiry: { inquiry: pendingInquiry, chainType: "qa" },
          statusUpdate: { message: "Waiting for user input..." },
        },
      });

      expect(wrapper.findComponent(KaiStatus).props("variant")).toBe("waiting");
    });

    it("uses variant='loading' on KaiStatus when no pendingInquiry is set", () => {
      const { wrapper } = doMount({
        props: { statusUpdate: { message: "Thinking..." } },
      });

      expect(wrapper.findComponent(KaiStatus).props("variant")).toBe("loading");
    });
  });
});
