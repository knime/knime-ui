import {
  type Mock,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { nextTick } from "vue";
import { VueWrapper, mount } from "@vue/test-utils";

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
    isLargeMode?: boolean;
  };

  const doMount = ({
    props = {},
    singleSelectedNodeMock = vi.fn(),
    component = NodeConfig,
    isLargeMode = false,
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

    $store.state.nodeConfiguration.isLargeMode = isLargeMode;

    const wrapper = mount(component, {
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
    type ModeExpectation = "large" | "small";

    const showModal = vi.fn();
    const closeModal = vi.fn();
    const pushEventDispatcher = vi.fn();

    beforeAll(() => {
      HTMLDialogElement.prototype.showModal = showModal;
      HTMLDialogElement.prototype.close = closeModal;
      vi.useFakeTimers();
    });

    beforeEach(() => {
      showModal.mockClear();
      closeModal.mockClear();
      pushEventDispatcher.mockClear();
    });

    const doMountForLargeModeTesting = async (isLargeMode: boolean = false) => {
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

      const { wrapper, $store } = doMount({
        isLargeMode,
        singleSelectedNodeMock: vi.fn().mockReturnValue(node),
      });
      $store.commit("workflow/setActiveWorkflow", workflow);
      $store.commit("nodeConfiguration/setActiveNodeId", "root:1");
      await nextTick();
      $store.commit("nodeConfiguration/setActiveExtensionConfig", {
        canBeEnlarged: true,
      });

      $store.commit(
        "nodeConfiguration/setPushEventDispatcher",
        pushEventDispatcher,
      );
      await nextTick();
      return { wrapper, $store };
    };

    const expectEventDispatch = (mode: ModeExpectation) => {
      expect(pushEventDispatcher).toHaveBeenCalledTimes(1);
      expect(pushEventDispatcher).toHaveBeenNthCalledWith(1, {
        eventType: "DisplayModeEvent",
        payload: { mode },
      });
    };

    describe("toggles isLargeMode", () => {
      const expectMode = (
        wrapper: VueWrapper,
        expectation: ModeExpectation,
      ) => {
        expect(wrapper.classes()).toContain(expectation);
        if (expectation === "large") {
          expect(wrapper.find(".title-bar").text()).toMatch("Mock Node");
        } else {
          expect(wrapper.find(".title-bar").exists()).toBe(false);
        }
      };

      it("to large if starting small", async () => {
        const { wrapper, $store } = await doMountForLargeModeTesting();

        expect(wrapper.findComponent(FunctionButton).exists()).toBe(true);
        expectMode(wrapper, "small");

        $store.commit("nodeConfiguration/setIsLargeMode", true);
        await nextTick();

        expect(showModal).toHaveBeenCalledOnce();
        expectMode(wrapper, "large");
        expectEventDispatch("large");
      });

      it("to small if starting large via store", async () => {
        const { wrapper, $store } = await doMountForLargeModeTesting(true);

        expect(wrapper.findComponent(FunctionButton).exists()).toBe(true);
        expectMode(wrapper, "large");

        $store.commit("nodeConfiguration/setIsLargeMode", false);
        await nextTick();

        expect(closeModal).toHaveBeenCalledOnce();
        expectMode(wrapper, "small");
        expectEventDispatch("small");
      });

      it("to small if starting large by pressing escape", async () => {
        const { wrapper } = await doMountForLargeModeTesting(true);

        expectMode(wrapper, "large");

        const dialog = wrapper.find("dialog");
        expect(dialog.exists()).toBe(true);
        await dialog.trigger("keydown.esc");
        await nextTick();

        expect(closeModal).toHaveBeenCalledOnce();
        expectMode(wrapper, "small");
        expectEventDispatch("small");
      });

      it("to small if starting large by close button", async () => {
        const { wrapper } = await doMountForLargeModeTesting(true);

        expectMode(wrapper, "large");

        const closeButton = wrapper.findComponent(FunctionButton);
        expect(closeButton.exists()).toBe(true);
        await closeButton.trigger("click");

        expect(closeModal).toHaveBeenCalledOnce();
        expectMode(wrapper, "small");
        expectEventDispatch("small");
      });
    });
  });
});
