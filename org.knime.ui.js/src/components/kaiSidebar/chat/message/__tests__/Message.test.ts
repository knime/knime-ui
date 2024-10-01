import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { deepMocked, mockVuexStore } from "@/test/utils";

import UserIcon from "@knime/styles/img/icons/user.svg";
import KnimeIcon from "@knime/styles/img/KNIME_Triangle.svg";
import { KaiMessage } from "@/api/gateway-api/generated-api";
import {
  NODE_FACTORIES,
  createAvailablePortTypes,
  createNodeTemplate,
  createNodeWithExtensionInfo,
} from "@/test/factories";
import * as nodeTemplatesStore from "@/store/nodeTemplates";
import * as applicationStore from "@/store/application";
import { API } from "@/api";

import Message from "../Message.vue";
import KaiReferences from "../KaiReferences.vue";
import MessagePlaceholder from "../MessagePlaceholder.vue";
import SuggestedNodes from "../SuggestedNodes.vue";
import SuggestedExtensions from "../SuggestedExtensions.vue";
import KaiStatus from "../KaiStatus.vue";
import FeedbackControls from "../FeedbackControls.vue";

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
    const $store = mockVuexStore({
      nodeTemplates: nodeTemplatesStore,
      application: applicationStore,
    });

    const availablePortTypes = createAvailablePortTypes();
    $store.commit("application/setAvailablePortTypes", availablePortTypes);

    const wrapper = mount(Message, {
      props: { ...defaultProps, ...props },
      global: {
        plugins: [$store],
      },
    });

    return { wrapper, $store };
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
      expect(wrapper.findComponent(KaiReferences).props("references")).toEqual(
        defaultProps.references,
      );
      expect(wrapper.find(".body").classes()).not.toContain("user");
      expect(wrapper.find(".content").text()).toMatch(defaultProps.content!);
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

    it("should render suggested nodes and extensions", async () => {
      const { wrapper, $store } = doMount();

      await flushPromises();
      expect(mockedAPI.noderepository.getNodeTemplates).toHaveBeenCalledOnce();
      expect(
        wrapper.findComponent(SuggestedNodes).props("nodeTemplates"),
      ).toEqual([$store.state.nodeTemplates.cache[FACTORY_ID]]);

      expect(
        wrapper.findComponent(SuggestedExtensions).props("extensions"),
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
          statusUpdate: "some status from KAI",
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
      expect(wrapper.findComponent(KaiReferences).props("references")).toEqual(
        defaultProps.references,
      );
      expect(wrapper.find(".body").classes()).toContain("user");
      expect(wrapper.find(".content").text()).toMatch(defaultProps.content!);
      expect(wrapper.findComponent(MessagePlaceholder).exists()).toBe(false);
      expect(mockedAPI.noderepository.getNodeTemplates).not.toHaveBeenCalled();
    });
  });

  it("should render feedback controls", async () => {
    const submitFeedback = vi.fn();
    const { wrapper } = doMount({
      props: {
        role: KaiMessage.RoleEnum.User,
        isError: true,
        submitFeedback,
      },
    });

    expect(wrapper.findComponent(FeedbackControls).exists()).toBe(false);

    await wrapper.setProps({
      role: KaiMessage.RoleEnum.Assistant,
      isError: false,
    });

    expect(wrapper.findComponent(FeedbackControls).exists()).toBe(true);
    expect(
      wrapper.findComponent(FeedbackControls).props("submitFeedback"),
    ).toBe(submitFeedback);
  });
});
