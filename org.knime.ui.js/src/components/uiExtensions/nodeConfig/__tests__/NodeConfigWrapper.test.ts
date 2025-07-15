import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import { Node, NodeState } from "@/api/gateway-api/generated-api";
import AppRightPanelSkeleton from "@/components/application/AppSkeletonLoader/AppRightPanelSkeleton.vue";
import { createNativeNode, createWorkflow } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import type { ExtensionConfig } from "../../common/types";
import NodeConfigButtons from "../NodeConfigButtons.vue";
import NodeConfigLoader from "../NodeConfigLoader.vue";
import NodeConfigWrapper from "../NodeConfigWrapper.vue";

describe("NodeConfigWrapper.vue", () => {
  const projectId = "project1";
  const workflowId = "workflow1";

  afterEach(() => {
    vi.clearAllMocks();
  });

  const idleNode = createNativeNode({
    id: "root:1",
    dialogType: Node.DialogTypeEnum.Web,
    state: { executionState: NodeState.ExecutionStateEnum.IDLE },
  });
  const configuredNode = createNativeNode({
    id: "root:2",
    dialogType: Node.DialogTypeEnum.Web,
    state: { executionState: NodeState.ExecutionStateEnum.CONFIGURED },
  });
  const executedNode = createNativeNode({
    id: "root:3",
    dialogType: Node.DialogTypeEnum.Web,
    state: { executionState: NodeState.ExecutionStateEnum.EXECUTED },
  });
  const executingNode = createNativeNode({
    id: "root:4",
    dialogType: Node.DialogTypeEnum.Web,
    state: { executionState: NodeState.ExecutionStateEnum.EXECUTING },
  });
  const nonEmbeddableNode = createNativeNode({
    id: "root:5",
    dialogType: Node.DialogTypeEnum.Swing,
    state: { executionState: NodeState.ExecutionStateEnum.EXECUTED },
  });

  const createStores = async (initiallySelectedNode?: string) => {
    const mockedStores = mockStores();
    mockedStores.settingsStore.settings.nodeDialogSize = 200;

    const workflow = createWorkflow({
      projectId,
      info: {
        containerId: workflowId,
      },
      nodes: {
        [idleNode.id]: idleNode,
        [configuredNode.id]: configuredNode,
        [executedNode.id]: executedNode,
        [executingNode.id]: executingNode,
        [nonEmbeddableNode.id]: nonEmbeddableNode,
      },
      nodeTemplates: {
        [idleNode.templateId]: { name: "template" },
        [configuredNode.templateId]: { name: "template" },
        [executedNode.templateId]: { name: "template" },
        [executingNode.templateId]: { name: "template" },
        [nonEmbeddableNode.templateId]: { name: "template" },
      },
    });

    mockedStores.applicationStore.setActiveProjectId(projectId);
    mockedStores.workflowStore.setActiveWorkflow(workflow);
    await mockedStores.selectionStore.selectNodes([
      initiallySelectedNode ?? idleNode.id,
    ]);

    return mockedStores;
  };

  type MountOpts = {
    initiallySelectedNode?: string;
    slots?: any;
  };

  const doMount = async ({ initiallySelectedNode, slots }: MountOpts = {}) => {
    const mockedStores = await createStores(initiallySelectedNode);

    const wrapper = mount(NodeConfigWrapper, {
      global: {
        plugins: [mockedStores.testingPinia],
      },
      slots,
    });

    return { wrapper, mockedStores };
  };

  describe("title-bar", () => {
    it("has title bar on large mode", async () => {
      const { wrapper, mockedStores } = await doMount();

      expect(wrapper.find(".title-bar").exists()).toBe(false);

      mockedStores.nodeConfigurationStore.setIsLargeMode(true);
      mockedStores.nodeConfigurationStore.activeExtensionConfig = {
        canBeEnlarged: true,
      } as ExtensionConfig;

      await nextTick();
      expect(wrapper.find(".title-bar").exists()).toBe(true);

      const minimizeButton = wrapper.find('[data-test-id="exit-large-mode"]');
      expect(minimizeButton.exists()).toBe(true);
      await minimizeButton.trigger("click");

      expect(mockedStores.nodeConfigurationStore.isLargeMode).toBe(false);
    });
  });

  describe("header", () => {
    it("should show header button on small dialogs and toggle large", async () => {
      const { wrapper, mockedStores } = await doMount();

      mockedStores.nodeConfigurationStore.activeExtensionConfig = {
        canBeEnlarged: true,
      } as ExtensionConfig;
      await nextTick();

      const expandButton = wrapper.find('[data-test-id="expand-dialog-btn"]');
      expect(expandButton.exists()).toBe(true);
      await expandButton.trigger("click");
      expect(
        vi.mocked(mockedStores.nodeConfigurationStore.setIsLargeMode),
      ).toHaveBeenCalledWith(true);
    });

    it("should not show header on large dialogs", async () => {
      const { wrapper, mockedStores } = await doMount();
      mockedStores.nodeConfigurationStore.setIsLargeMode(true);
      await nextTick();

      mockedStores.nodeConfigurationStore.activeExtensionConfig = {
        canBeEnlarged: false,
      } as ExtensionConfig;
      await nextTick();

      expect(wrapper.find(".header").exists()).toBe(false);
      const expandButton = wrapper.find('[data-test-id="expand-dialog-btn"]');
      expect(expandButton.exists()).toBe(false);
    });

    it("should not show enlarge dialog button on dialogs that cannot be enlarged", async () => {
      const { wrapper, mockedStores } = await doMount();
      mockedStores.nodeConfigurationStore.activeExtensionConfig = {
        canBeEnlarged: false,
      } as ExtensionConfig;
      await nextTick();

      expect(wrapper.find(".header").exists()).toBe(true);
      const expandButton = wrapper.find('[data-test-id="expand-dialog-btn"]');
      expect(expandButton.exists()).toBe(false);
    });
  });

  it("renders a loading skeleton when UIExtension is loading", async () => {
    const { wrapper } = await doMount();
    wrapper
      .findComponent(NodeConfigLoader)
      .vm.$emit("loadingStateChange", { value: "loading", message: "" });

    await nextTick();
    expect(wrapper.findComponent(AppRightPanelSkeleton).exists()).toBe(true);
  });

  describe("dialog buttons", () => {
    const mountWithButtons = async (opts: MountOpts = {}) => {
      const result = await doMount({
        ...opts,
        initiallySelectedNode: configuredNode.id,
      });

      result.wrapper
        .findComponent(NodeConfigLoader)
        .vm.$emit("controlsVisibilityChange", true);
      result.wrapper
        .findComponent(NodeConfigLoader)
        .vm.$emit("loadingStateChange", { value: "ready" });

      return result;
    };

    it("handles apply", async () => {
      const { wrapper, mockedStores } = await mountWithButtons();

      wrapper.findComponent(NodeConfigButtons).vm.$emit("apply", false);

      expect(
        mockedStores.nodeConfigurationStore.applySettings,
      ).toHaveBeenCalledWith({
        nodeId: configuredNode.id,
        execute: false,
      });
    });

    it("handles apply and execute", async () => {
      const { wrapper, mockedStores } = await mountWithButtons();

      wrapper.findComponent(NodeConfigButtons).vm.$emit("apply", true);

      expect(
        mockedStores.nodeConfigurationStore.applySettings,
      ).toHaveBeenCalledWith({
        nodeId: configuredNode.id,
        execute: true,
      });
    });

    it("handles execute", async () => {
      const { wrapper, mockedStores } = await mountWithButtons();

      wrapper.findComponent(NodeConfigButtons).vm.$emit("execute");

      expect(mockedStores.executionStore.executeNodes).toHaveBeenCalledWith([
        configuredNode.id,
      ]);
    });

    it("handles discard", async () => {
      const { wrapper, mockedStores } = await mountWithButtons();

      wrapper.findComponent(NodeConfigButtons).vm.$emit("discard");

      expect(
        mockedStores.nodeConfigurationStore.discardSettings,
      ).toHaveBeenCalled();
    });

    it("minimizes large mode when applySettings is called", async () => {
      const { wrapper, mockedStores } = await mountWithButtons();

      mockedStores.nodeConfigurationStore.setIsLargeMode(true);
      vi.mocked(
        mockedStores.nodeConfigurationStore.applySettings,
      ).mockResolvedValue(true);

      wrapper.findComponent(NodeConfigButtons).vm.$emit("apply", false);
      await flushPromises();

      expect(
        vi.mocked(mockedStores.nodeConfigurationStore).setIsLargeMode,
      ).toHaveBeenCalledWith(false);
    });

    it("minimizes large mode when discardSettings is called", async () => {
      const { wrapper, mockedStores } = await mountWithButtons();
      mockedStores.nodeConfigurationStore.setIsLargeMode(true);

      wrapper.findComponent(NodeConfigButtons).vm.$emit("discard");

      expect(
        vi.mocked(mockedStores.nodeConfigurationStore).setIsLargeMode,
      ).toHaveBeenLastCalledWith(false);
    });

    it("minimizes large mode when executeActiveNode is called", async () => {
      const { wrapper, mockedStores } = await mountWithButtons();
      mockedStores.nodeConfigurationStore.setIsLargeMode(true);

      wrapper.findComponent(NodeConfigButtons).vm.$emit("execute");
      await flushPromises();

      expect(
        vi.mocked(mockedStores.nodeConfigurationStore).setIsLargeMode,
      ).toHaveBeenCalledWith(false);
    });
  });

  it("renders inactive slot when nothing is selected", async () => {
    const { wrapper, mockedStores } = await doMount({
      slots: { inactive: { template: '<div id="slotted" />' } },
    });
    await flushPromises();

    expect(wrapper.find("#slotted").exists()).toBe(false);

    await mockedStores.selectionStore.deselectAllObjects();

    expect(wrapper.find("#slotted").exists()).toBe(true);
  });

  it("renders inactive slot when node is not embeddable", async () => {
    const { wrapper } = await doMount({
      initiallySelectedNode: nonEmbeddableNode.id,
      slots: { inactive: { template: '<div id="slotted" />' } },
    });
    await flushPromises();

    expect(wrapper.find("#slotted").exists()).toBe(true);
  });
});
