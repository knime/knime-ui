import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { VueWrapper, mount } from "@vue/test-utils";

import { FunctionButton } from "@knime/components";

import type { KnimeNode } from "@/api/custom-types";
import { Node, WorkflowInfo } from "@/api/gateway-api/generated-api";
import { isBrowser, isDesktop } from "@/environment";
import {
  createMetanode,
  createNativeNode,
  createWorkflow,
} from "@/test/factories";
import { mockEnvironment } from "@/test/utils/mockEnvironment";
import { mockStores } from "@/test/utils/mockStores";
import IncompatibleNodeConfigPlaceholder from "../IncompatibleNodeConfigPlaceholder.vue";
import NodeConfig from "../NodeConfig.vue";
import NodeConfigWrapper from "../NodeConfigWrapper.vue";

vi.mock("@/environment");

describe("NodeConfig", () => {
  type MountOpts = {
    props?: Partial<InstanceType<typeof NodeConfig>["$props"]>;
    singleSelectedNodeMock?: KnimeNode | null;
    component?: typeof NodeConfig | null;
    isLargeMode?: boolean;
  };

  beforeAll(() => {
    mockEnvironment("DESKTOP", { isBrowser, isDesktop });
  });

  const doMount = ({
    props = {},
    singleSelectedNodeMock = null,
    component = NodeConfig,
    isLargeMode,
  }: MountOpts = {}) => {
    const mockedStores = mockStores();
    mockedStores.workflowStore.setActiveWorkflow(
      createWorkflow({
        info: {
          name: "fileName",
          containerType: WorkflowInfo.ContainerTypeEnum.Project,
        },
      }),
    );

    // @ts-expect-error
    mockedStores.selectionStore.singleSelectedNode = singleSelectedNodeMock;
    mockedStores.settingsStore.settings.nodeDialogSize = 100;
    mockedStores.applicationStore.activeProjectId = "project";

    mockedStores.nodeConfigurationStore.isLargeMode = isLargeMode ?? false;

    const wrapper = mount(component, {
      props,
      global: {
        stubs: {
          ToastStack: true,
        },
        plugins: [mockedStores.testingPinia],
      },
    });

    return { wrapper, mockedStores };
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
      singleSelectedNodeMock: createNativeNode({ id: "2" }),
    });

    expect(wrapper.find(".placeholder-text").text()).toBe(
      "This node dialog is not supported here.",
    );
  });

  it("shows download AP link for legacy dialogs in browser when ui control set", async () => {
    mockEnvironment("BROWSER", { isBrowser, isDesktop });

    const NodeConfig = (await import("../NodeConfig.vue")).default;

    const { wrapper, mockedStores } = doMount({
      singleSelectedNodeMock: createNativeNode({ id: "2" }),
      component: NodeConfig,
    });

    mockedStores.uiControlsStore.shouldDisplayDownloadAPButton = true;
    await nextTick();

    expect(wrapper.find(".placeholder-text").text()).toBe(
      "To configure nodes with a classic dialog, download the KNIME Analytics Platform.",
    );
  });

  it("shows placeholder component if selected node has a legacy dialog", () => {
    const { wrapper } = doMount({
      singleSelectedNodeMock: createNativeNode({ id: "1" }),
    });

    expect(wrapper.find(".content-wrapper").exists()).toBe(true);
    expect(
      wrapper.findComponent(IncompatibleNodeConfigPlaceholder).exists(),
    ).toBe(true);
  });

  it("shows a message if selected node is a metanode in a browser", async () => {
    mockEnvironment("BROWSER", { isBrowser, isDesktop });
    const NodeConfig = (await import("../NodeConfig.vue")).default;

    const { wrapper, mockedStores } = doMount({
      singleSelectedNodeMock: createMetanode({ id: "2" }),
      component: NodeConfig,
    });

    mockedStores.uiControlsStore.shouldDisplayDownloadAPButton = true;
    await nextTick();

    expect(wrapper.find(".placeholder-text").text()).toBe(
      "Configuration is not available for metanodes. Select a node to show its dialog.",
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
      vi.clearAllMocks();
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

      const { wrapper, mockedStores } = doMount({
        isLargeMode,
        singleSelectedNodeMock: node,
      });
      mockedStores.workflowStore.setActiveWorkflow(workflow);
      await nextTick();

      // @ts-expect-error
      mockedStores.nodeConfigurationStore.setActiveExtensionConfig({
        canBeEnlarged: true,
      });

      mockedStores.nodeConfigurationStore.setPushEventDispatcher(
        pushEventDispatcher,
      );

      return { wrapper, mockedStores };
    };

    const expectEventDispatch = (mode: ModeExpectation) => {
      expect(pushEventDispatcher).toHaveBeenCalledTimes(1);
      expect(pushEventDispatcher).toHaveBeenNthCalledWith(1, {
        eventType: "DisplayModeEvent",
        payload: { mode },
      });
    };

    const expectMode = (wrapper: VueWrapper, expectation: ModeExpectation) => {
      expect(wrapper.find("dialog").classes()).toContain(expectation);
      if (expectation === "large") {
        expect(wrapper.find(".title-bar").text()).toMatch("Mock Node");
      } else {
        expect(wrapper.find(".title-bar").exists()).toBe(false);
      }
    };

    it("if starting small can be toggled to large via store", async () => {
      const { wrapper, mockedStores } = await doMountForLargeModeTesting();

      expect(wrapper.findComponent(FunctionButton).exists()).toBe(true);
      expectMode(wrapper, "small");

      mockedStores.nodeConfigurationStore.setIsLargeMode(true);
      await nextTick();

      expect(showModal).toHaveBeenCalledOnce();
      expectMode(wrapper, "large");
      expectEventDispatch("large");
    });

    describe("if starting large", () => {
      let wrapper: VueWrapper, mockedStores: ReturnType<typeof mockStores>;

      beforeEach(async () => {
        ({ wrapper, mockedStores } = await doMountForLargeModeTesting(true));
      });

      it("is in right mode and has close button", () => {
        expectMode(wrapper, "large");
        expect(wrapper.findComponent(FunctionButton).exists()).toBe(true);
      });

      it("can be toggled to small via store", async () => {
        mockedStores.nodeConfigurationStore.setIsLargeMode(false);
        await nextTick();

        expect(closeModal).toHaveBeenCalledOnce();
        expectMode(wrapper, "small");
        expectEventDispatch("small");
      });

      it("is toggled to small by pressing escape", async () => {
        await wrapper.find("dialog").trigger("cancel");

        expect(closeModal).toHaveBeenCalledOnce();
        expectMode(wrapper, "small");
        expectEventDispatch("small");
      });

      it("is toggled to small by close button", async () => {
        await wrapper.findComponent(FunctionButton).trigger("click");

        expect(closeModal).toHaveBeenCalledOnce();
        expectMode(wrapper, "small");
        expectEventDispatch("small");
      });

      it("is toggled to small if dialog background is clicked", async () => {
        const { wrapper } = await doMountForLargeModeTesting(true);

        expectMode(wrapper, "large");

        await wrapper.find("dialog").trigger("click");

        expect(closeModal).toHaveBeenCalledOnce();
        expectMode(wrapper, "small");
        expectEventDispatch("small");
      });

      it("is not toggled to small if dialog area is clicked", async () => {
        const { wrapper } = await doMountForLargeModeTesting(true);

        expectMode(wrapper, "large");

        await wrapper.findComponent(NodeConfigWrapper).trigger("click");

        expect(closeModal).not.toHaveBeenCalled();
        expect(pushEventDispatcher).not.toHaveBeenCalled();
        expectMode(wrapper, "large");
      });
    });
  });
});
