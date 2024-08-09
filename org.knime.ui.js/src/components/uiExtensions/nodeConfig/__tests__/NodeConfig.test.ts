import { expect, describe, it, vi, beforeAll, type Mock } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";

import { sleep } from "@knime/utils";
import { mockVuexStore } from "@/test/utils/mockVuexStore";
import * as applicationStore from "@/store/application";
import * as workflowStore from "@/store/workflow";
import * as nodeConfigurationStore from "@/store/nodeConfiguration";
import * as uiControlsStore from "@/store/uiControls";
import { createNativeNode, createWorkflow } from "@/test/factories";
import IncompatibleNodeConfigPlaceholder from "../IncompatibleNodeConfigPlaceholder.vue";
import NodeConfig from "../NodeConfig.vue";
import { setEnvironment } from "@/test/utils/setEnvironment";

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
      "Please select one node.",
    );
  });

  it("shows different placeholder text when node without dialog is selected", () => {
    const { wrapper } = doMount({
      singleSelectedNodeMock: vi.fn().mockReturnValue({
        id: 2,
        kind: "node",
      }),
    });

    expect(wrapper.find(".placeholder-text").text()).toBe(
      "This node dialog is not supported here.",
    );
  });

  it("shows download AP link for legacy dialogs in browser when ui control set", async () => {
    setEnvironment("BROWSER");

    const NodeConfig = (await import("../NodeConfig.vue")).default;

    const { wrapper, $store } = doMount({
      singleSelectedNodeMock: vi.fn().mockReturnValue({
        id: 2,
        kind: "node",
      }),
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
      singleSelectedNodeMock: vi.fn().mockReturnValue({
        id: 1,
        kind: "node",
      }),
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
      singleSelectedNodeMock: vi.fn().mockReturnValue({
        id: 2,
        kind: "metanode",
      }),
      component: NodeConfig,
    });

    $store.state.uiControls.shouldDisplayDownloadAPButton = true;
    await nextTick();

    expect(wrapper.find(".placeholder-text").text()).toBe(
      "Please select one node.",
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
      hasDialog: true,
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
      const { wrapper, $store } = doMount({
        singleSelectedNodeMock: vi.fn().mockReturnValue(node),
      });

      $store.commit("workflow/setActiveWorkflow", workflow);

      expect(wrapper.classes()).toContain("small");
      expect(wrapper.find(".title-bar").exists()).toBe(false);
      expect(wrapper.find(".toggle-display-mode-btn").exists()).toBe(false);

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

      await nextTick();

      expect(wrapper.find(".toggle-display-mode-btn").exists()).toBe(true);

      await wrapper.find(".toggle-display-mode-btn").trigger("click");

      expect(wrapper.find(".title-bar").text()).toMatch("Mock Node");
      expect(wrapper.classes()).toContain("large");
      expect(showModal).toHaveBeenCalled();
      expect(pushEventDispatcher).toHaveBeenCalledWith({
        eventType: "DisplayModeEvent",
        payload: { mode: "large" },
      });

      await wrapper.find(".toggle-display-mode-btn").trigger("click");
      await sleep(0);

      expect(pushEventDispatcher).toHaveBeenCalledTimes(2);
      expect(pushEventDispatcher).toHaveBeenLastCalledWith({
        eventType: "DisplayModeEvent",
        payload: { mode: "small" },
      });
    });
  });
});
