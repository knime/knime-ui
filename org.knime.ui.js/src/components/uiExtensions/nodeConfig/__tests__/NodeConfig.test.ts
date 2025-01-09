import { type Mock, beforeAll, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import { FunctionButton } from "@knime/components";

import { Node } from "@/api/gateway-api/generated-api";
import * as applicationStore from "@/store/application";
import * as nodeConfigurationStore from "@/store/nodeConfiguration";
import * as uiControlsStore from "@/store/uiControls";
import * as workflowStore from "@/store/workflow";
import {
  createMetanode,
  createNativeNode,
  createWorkflow,
} from "@/test/factories";
import { mockVuexStore } from "@/test/utils/mockVuexStore";
import { setEnvironment } from "@/test/utils/setEnvironment";
import IncompatibleNodeConfigPlaceholder from "../IncompatibleNodeConfigPlaceholder.vue";
import NodeConfig from "../NodeConfig.vue";

describe("NodeConfig", () => {
  type MountOpts = {
    props?: Partial<InstanceType<typeof NodeConfig>["$props"]>;
    singleSelectedNodeMock?: Mock;
    component?: typeof NodeConfig | null;
  };

  const doMount = ({
    props = {},
    singleSelectedNodeMock = vi.fn(),
    component = null,
  }: MountOpts = {}) => {
    const $store = mockVuexStore({
      workflow: {
        ...workflowStore,
        state: {
          activeWorkflow: {
            projectMetadata: {
              title: "title",
            },
            info: {
              name: "fileName",
              containerType: "project",
            },
          },
        },
      },
      nodeConfiguration: nodeConfigurationStore,
      application: applicationStore,
      selection: {
        getters: {
          singleSelectedNode: singleSelectedNodeMock,
        },
      },
      uiControls: uiControlsStore,
      settings: { state: { settings: { nodeDialogSize: 100 } } },
    });

    const wrapper = mount(component ?? NodeConfig, {
      props,
      global: {
        plugins: [$store],
      },
    });

    return { wrapper, $store };
  };

  it("renders default", () => {
    const { wrapper } = doMount();
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find(".placeholder-text").text()).toBe(
      "Select a node to show its dialog.",
    );
  });

  it("shows different placeholder text when node without dialog is selected", () => {
    const { wrapper } = doMount({
      singleSelectedNodeMock: vi
        .fn()
        .mockReturnValue(createNativeNode({ id: "2" })),
    });

    expect(wrapper.find(".placeholder-text").text()).toBe(
      "This node dialog is not supported here.",
    );
  });

  it("shows download AP link for legacy dialogs in browser when ui control set", async () => {
    setEnvironment("BROWSER");

    const NodeConfig = (await import("../NodeConfig.vue")).default;

    const { wrapper, $store } = doMount({
      singleSelectedNodeMock: vi
        .fn()
        .mockReturnValue(createNativeNode({ id: "2" })),
      component: NodeConfig,
    });

    $store.state.uiControls.shouldDisplayDownloadAPButton = true;
    await nextTick();

    expect(wrapper.find(".placeholder-text").text()).toBe(
      "To configure nodes with a classic dialog, download the KNIME Analytics Platform.",
    );
  });

  it("shows placeholder component if selected node has a legacy dialog", () => {
    const { wrapper } = doMount({
      singleSelectedNodeMock: vi
        .fn()
        .mockReturnValue(createNativeNode({ id: "1" })),
    });

    expect(wrapper.find(".content-wrapper").exists()).toBe(true);
    expect(
      wrapper.findComponent(IncompatibleNodeConfigPlaceholder).exists(),
    ).toBe(true);
  });

  it("shows a message if selected node is a metanode in a browser", async () => {
    setEnvironment("BROWSER");
    const NodeConfig = (await import("../NodeConfig.vue")).default;

    const { wrapper, $store } = doMount({
      singleSelectedNodeMock: vi
        .fn()
        .mockReturnValue(createMetanode({ id: "2" })),
      component: NodeConfig,
    });

    $store.state.uiControls.shouldDisplayDownloadAPButton = true;
    await nextTick();

    expect(wrapper.find(".placeholder-text").text()).toBe(
      "Select a node to show its dialog.",
    );
  });

  describe("large mode", () => {
    const showModal = vi.fn();
    const closeModal = vi.fn();

    beforeAll(() => {
      HTMLDialogElement.prototype.showModal = showModal;
      HTMLDialogElement.prototype.close = closeModal;
    });

    const node = createNativeNode({
      id: "root:1",
      dialogType: Node.DialogTypeEnum.Web,
    });

    const workflow = createWorkflow({
      nodes: { [node.id]: node },
      nodeTemplates: {
        [node.templateId]: {
          icon: "",
          name: "Mock Node",
        },
      },
    });

    it("should toggle between large and small mode", async () => {
      vi.useFakeTimers();
      const { wrapper, $store } = doMount({
        singleSelectedNodeMock: vi.fn().mockReturnValue(node),
      });

      $store.commit("workflow/setActiveWorkflow", workflow);

      expect(wrapper.classes()).toContain("small");
      expect(wrapper.find(".title-bar").exists()).toBe(false);
      expect(wrapper.findComponent(FunctionButton).exists()).toBe(false);

      $store.commit("nodeConfiguration/setActiveNodeId", "root:1");

      const pushEventDispatcher = vi.fn();
      $store.commit(
        "nodeConfiguration/setPushEventDispatcher",
        pushEventDispatcher,
      );

      await nextTick();

      $store.commit("nodeConfiguration/setActiveExtensionConfig", {
        canBeEnlarged: true,
      });

      // @ts-ignore - start on Large Mode
      await wrapper.vm.toggleLarge();
      await nextTick();

      expect(wrapper.findComponent(FunctionButton).exists()).toBe(true);
      await wrapper.findComponent(FunctionButton).trigger("click");
      vi.runOnlyPendingTimers();
      await nextTick();

      expect(wrapper.find(".title-bar").text()).toMatch("Mock Node");
      expect(pushEventDispatcher).toHaveBeenCalledTimes(2);
      expect(pushEventDispatcher).toHaveBeenNthCalledWith(2, {
        eventType: "DisplayModeEvent",
        payload: { mode: "small" },
      });
    });
  });
});
