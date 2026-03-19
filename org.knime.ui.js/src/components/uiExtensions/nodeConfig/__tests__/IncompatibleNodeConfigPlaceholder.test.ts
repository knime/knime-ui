import { describe, expect, it, vi } from "vitest";
import { computed, nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { createRouter, createWebHistory } from "vue-router";

import { Node, NodeState } from "@/api/gateway-api/generated-api";
import {
  createComponentNode,
  createMetanode,
  createNativeNode,
  createWorkflow,
} from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import IncompatibleNodeConfigPlaceholder from "../IncompatibleNodeConfigPlaceholder.vue";

vi.mock("@/environment", async () => {
  const actual = await vi.importActual<typeof import("@/environment")>(
    "@/environment",
  );
  return {
    ...actual,
    isDesktop: vi.fn(() => true),
  };
});

vi.mock("@/composables/useAnalyticsPlatformDownloadUrl", () => ({
  useAnalyticsPlatformDownloadUrl: () => ({
    href: computed(
      () =>
        "https://www.knime.com/downloads/download-analytics-platform?src=node-configuration-panel",
    ),
  }),
}));

describe("IncompatibleNodeConfigPlaceholder.vue", () => {
  const embeddableNode = createNativeNode({
    id: "root:1",
    dialogType: Node.DialogTypeEnum.Web,
    state: { executionState: NodeState.ExecutionStateEnum.EXECUTED },
  });
  const nonEmbeddableNode = createNativeNode({
    id: "root:2",
    dialogType: Node.DialogTypeEnum.Swing,
    state: { executionState: NodeState.ExecutionStateEnum.EXECUTED },
  });
  const embeddableComponent = createComponentNode({
    id: "root:3",
    dialogType: Node.DialogTypeEnum.Web,
  });
  const nonEmbeddableComponent = createComponentNode({
    id: "root:4",
    dialogType: Node.DialogTypeEnum.Swing,
  });
  const metanode = createMetanode({ id: "root:5" });
  const nodeWithNoDialog = (() => {
    const node = createNativeNode({
      id: "root:6",
      state: { executionState: NodeState.ExecutionStateEnum.EXECUTED },
    });
    delete node.dialogType;
    return node;
  })();

  const doMount = () => {
    const mockedStores = mockStores();

    const workflow = createWorkflow({
      nodes: {
        [embeddableNode.id]: embeddableNode,
        [nonEmbeddableNode.id]: nonEmbeddableNode,
        [embeddableComponent.id]: embeddableComponent,
        [nonEmbeddableComponent.id]: nonEmbeddableComponent,
        [metanode.id]: metanode,
        [nodeWithNoDialog.id]: nodeWithNoDialog,
      },
    });
    mockedStores.workflowStore.setActiveWorkflow(workflow);

    const router = createRouter({
      history: createWebHistory(),
      routes: [
        {
          path: "/workflow/:workflowId",
          name: "WorkflowPage",
          component: { template: "<div />" },
        },
        { path: "/:catchAll(.*)", component: { template: "<div />" } },
      ],
    });

    const pushSpy = vi.spyOn(router, "push");

    const wrapper = mount(IncompatibleNodeConfigPlaceholder, {
      global: {
        plugins: [mockedStores.testingPinia, router],
        stubs: {
          KdsEmptyState: {
            name: "KdsEmptyState",
            props: ["headline", "description", "button"],
            template: "<div><slot /></div>",
          },
        },
      },
    });

    return { wrapper, mockedStores, router, pushSpy };
  };

  it("renders placeholder when nothing is selected", () => {
    const { wrapper } = doMount();

    const emptyState = wrapper.findComponent({ name: "KdsEmptyState" });
    expect(emptyState.exists()).toBe(true);
    expect(emptyState.props("headline")).toBe("Select a node to configure");
  });

  it("renders placeholder for metanodes", async () => {
    const { wrapper, mockedStores } = doMount();

    await mockedStores.selectionStore.selectNodes([metanode.id]);
    await nextTick();

    const emptyState = wrapper.findComponent({ name: "KdsEmptyState" });
    expect(emptyState.exists()).toBe(true);
    expect(emptyState.props("headline")).toBe("No settings");
    expect(emptyState.props("description")).toBe(
      "This metanode groups multiple nodes and has no configuration.",
    );
    expect(emptyState.props("button")).toMatchObject({
      label: "Open metanode",
      variant: "outlined",
      size: "small",
    });
  });

  it("navigates to metanode when button is clicked", async () => {
    const { wrapper, mockedStores, pushSpy } = doMount();

    await mockedStores.selectionStore.selectNodes([metanode.id]);
    await nextTick();

    const emptyState = wrapper.findComponent({ name: "KdsEmptyState" });
    await emptyState.vm.$emit("button-click");
    await nextTick();

    expect(pushSpy).toHaveBeenCalledWith({
      name: "WorkflowPage",
      params: { projectId: expect.any(String), workflowId: metanode.id },
    });
  });

  it("renders placeholder for nodes with no dialog", async () => {
    const { wrapper, mockedStores } = doMount();

    await mockedStores.selectionStore.selectNodes([nodeWithNoDialog.id]);
    await nextTick();

    const emptyState = wrapper.findComponent({ name: "KdsEmptyState" });
    expect(emptyState.exists()).toBe(true);
    expect(emptyState.props("headline")).toBe("No settings");
    expect(emptyState.props("description")).toBe(
      "This node requires no configuration.",
    );
    expect(emptyState.props("button")).toBeUndefined();
  });

  describe("legacy nodes", () => {
    it("handles download button", async () => {
      const { wrapper, mockedStores } = doMount();

      mockedStores.uiControlsStore.shouldDisplayDownloadAPButton = true;
      await mockedStores.selectionStore.selectNodes([nonEmbeddableNode.id]);
      await nextTick();

      const emptyState = wrapper.findComponent({ name: "KdsEmptyState" });
      expect(emptyState.exists()).toBe(true);
      expect(emptyState.props("headline")).toBe(
        "This node uses the classic configuration dialog",
      );
      expect(emptyState.props("description")).toBe(
        "This node has not been migrated to the new interface. To configure nodes with a classic dialog, download the KNIME Analytics Platform.",
      );
      expect(emptyState.props("button")).toMatchObject({
        label: "Get KNIME Analytics Platform",
        variant: "filled",
        size: "small",
        trailingIcon: "external-link",
      });
    });

    it("renders correct placeholder when download button should not be displayed", async () => {
      const { wrapper, mockedStores } = doMount();
      await mockedStores.selectionStore.selectNodes([nonEmbeddableNode.id]);
      await nextTick();

      const emptyState = wrapper.findComponent({ name: "KdsEmptyState" });
      expect(emptyState.exists()).toBe(true);
      expect(emptyState.props("headline")).toBe(
        "This node uses the classic configuration dialog",
      );
      expect(emptyState.props("description")).toBe(
        "This node has not been migrated to the new interface. You can configure it using the classic dialog.",
      );
      expect(emptyState.props("button")).toMatchObject({
        label: "Open dialog",
        variant: "outlined",
        size: "small",
      });
    });

    it("opens node configuration when button is clicked", async () => {
      const { wrapper, mockedStores } = doMount();
      await mockedStores.selectionStore.selectNodes([nonEmbeddableNode.id]);
      await nextTick();

      const openNodeConfigSpy = vi.spyOn(
        mockedStores.desktopInteractionsStore,
        "openNodeConfiguration",
      );

      const emptyState = wrapper.findComponent({ name: "KdsEmptyState" });
      await emptyState.vm.$emit("button-click");
      await nextTick();

      expect(openNodeConfigSpy).toHaveBeenCalledWith(nonEmbeddableNode.id);
    });
  });

  it("renders only one empty state at a time", async () => {
    const { wrapper, mockedStores } = doMount();

    // Test no selection
    expect(wrapper.findAllComponents({ name: "KdsEmptyState" })).toHaveLength(
      1,
    );

    // Test metanode
    await mockedStores.selectionStore.selectNodes([metanode.id]);
    await nextTick();
    expect(wrapper.findAllComponents({ name: "KdsEmptyState" })).toHaveLength(
      1,
    );

    // Test no dialog
    await mockedStores.selectionStore.selectNodes([nodeWithNoDialog.id]);
    await nextTick();
    expect(wrapper.findAllComponents({ name: "KdsEmptyState" })).toHaveLength(
      1,
    );

    // Test legacy dialog
    await mockedStores.selectionStore.selectNodes([nonEmbeddableNode.id]);
    await nextTick();
    expect(wrapper.findAllComponents({ name: "KdsEmptyState" })).toHaveLength(
      1,
    );
  });
});
