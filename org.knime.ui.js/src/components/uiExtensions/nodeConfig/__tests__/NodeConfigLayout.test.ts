import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { VueWrapper, mount } from "@vue/test-utils";

import { FunctionButton } from "@knime/components";
import {
  type APILayerDirtyState,
  ApplyState,
  ViewState,
} from "@knime/ui-extension-service";

import { type NativeNode, NodeState } from "@/api/gateway-api/generated-api";
import { createNativeNode } from "@/test/factories";
import NodeConfigLayout from "../NodeConfigLayout.vue";
import NodeConfigLoader from "../NodeConfigLoader.vue";

describe("NodeConfigLayout.vue", () => {
  const idleNode = createNativeNode({
    id: "root:1",
    state: { executionState: NodeState.ExecutionStateEnum.IDLE },
  });
  const configuredNode = createNativeNode({
    id: "root:2",
    state: { executionState: NodeState.ExecutionStateEnum.CONFIGURED },
  });
  const executedNode = createNativeNode({
    id: "root:3",
    state: { executionState: NodeState.ExecutionStateEnum.EXECUTED },
  });

  type MountOpts = {
    props?: {
      activeNode?: NativeNode;
      projectId?: string;
      workflowId?: string;
      disabled?: boolean;
      dirtyState?: APILayerDirtyState;
      nodeName?: string;
      isLargeMode?: boolean;
      canBeEnlarged?: boolean;
    };
  };

  const defaultProps: Required<MountOpts["props"]> = {
    activeNode: idleNode,
    projectId: "project1",
    workflowId: "workflow1",
    disabled: false,
    dirtyState: { apply: ApplyState.CLEAN, view: ViewState.CLEAN },
    nodeName: "Node1",
    isLargeMode: false,
    canBeEnlarged: false,
  };

  const doMount = ({ props }: MountOpts = {}) => {
    const wrapper = mount(NodeConfigLayout, {
      props: { ...defaultProps, ...props },
      global: {
        stubs: {
          NodeConfigLoader: {
            template:
              '<div><slot name="header" /><slot name="controls" /></div>',
          },
        },
      },
    });

    return { wrapper };
  };

  const setLoadingDone = async (wrapper: VueWrapper<any>) => {
    wrapper.findComponent(NodeConfigLoader).vm.$emit("loadingStateChange", {
      value: "ready",
    });
    await nextTick();
  };

  const getButton = (
    wrapper: VueWrapper<any>,
    buttonName: "apply" | "apply-execute" | "execute" | "discard",
  ) => {
    return wrapper.find(`button.${buttonName}`);
  };

  const isButtonDisabled = (
    wrapper: VueWrapper<any>,
    buttonName: "apply" | "apply-execute" | "execute" | "discard",
  ) => {
    const isDisabled = getButton(wrapper, buttonName).attributes("disabled");

    return isDisabled !== undefined;
  };

  describe("header", () => {
    it("should show header button on small dialogs and toggle large", async () => {
      const { wrapper } = doMount({
        props: { canBeEnlarged: true, isLargeMode: false },
      });

      expect(wrapper.findComponent(FunctionButton).exists()).toBe(true);
      expect(wrapper.findComponent(FunctionButton).exists()).toBe(true);
      await wrapper.findComponent(FunctionButton).trigger("click");

      expect(wrapper.emitted("toggleLarge")).toBeDefined();
    });

    it("should not show header on large dialogs", () => {
      const { wrapper } = doMount({
        props: { canBeEnlarged: true, isLargeMode: true },
      });

      expect(wrapper.find(".header").exists()).toBe(false);
      expect(wrapper.findComponent(FunctionButton).exists()).toBe(false);
    });

    it("should not show button on dialogs that cannot be enlarged", () => {
      const { wrapper } = doMount({
        props: { canBeEnlarged: false, isLargeMode: false },
      });

      expect(wrapper.find(".header").exists()).toBe(true);
      expect(wrapper.findComponent(FunctionButton).exists()).toBe(false);
    });
  });

  describe("action buttons", () => {
    const setDirtyState = (
      wrapper: VueWrapper<any>,
      state: APILayerDirtyState,
    ) => {
      return wrapper.setProps({ dirtyState: state });
    };

    it("should render correctly", async () => {
      const { wrapper } = doMount();

      expect(wrapper.find(".buttons").exists()).toBe(false);
      await setLoadingDone(wrapper);
      expect(wrapper.find(".buttons").exists()).toBe(true);
    });

    it("should handle button states for IDLE node", async () => {
      const { wrapper } = doMount();

      await setLoadingDone(wrapper);

      expect(wrapper.find("button.execute").exists()).toBe(false);
      expect(isButtonDisabled(wrapper, "discard")).toBe(true);
      expect(isButtonDisabled(wrapper, "apply-execute")).toBe(true);
      expect(isButtonDisabled(wrapper, "apply")).toBe(true);

      await setDirtyState(wrapper, {
        apply: ApplyState.CONFIG,
        view: ViewState.CONFIG,
      });

      expect(wrapper.find("button.execute").exists()).toBe(false);
      expect(wrapper.find("button.apply-execute").exists()).toBe(true);

      expect(isButtonDisabled(wrapper, "discard")).toBe(false);
      expect(isButtonDisabled(wrapper, "apply-execute")).toBe(false);
      expect(isButtonDisabled(wrapper, "apply")).toBe(false);
    });

    it("should handle button states for CONFIGURED node", async () => {
      const { wrapper } = doMount({ props: { activeNode: configuredNode } });

      await setLoadingDone(wrapper);

      expect(wrapper.find("button.execute").exists()).toBe(true);
      expect(wrapper.find("button.apply-execute").exists()).toBe(false);

      expect(isButtonDisabled(wrapper, "discard")).toBe(true);
      expect(isButtonDisabled(wrapper, "execute")).toBe(false);
      expect(isButtonDisabled(wrapper, "apply")).toBe(true);

      await setDirtyState(wrapper, {
        apply: ApplyState.CONFIG,
        view: ViewState.CONFIG,
      });

      expect(wrapper.find("button.execute").exists()).toBe(false);
      expect(wrapper.find("button.apply-execute").exists()).toBe(true);

      expect(isButtonDisabled(wrapper, "discard")).toBe(false);
      expect(isButtonDisabled(wrapper, "apply-execute")).toBe(false);
      expect(isButtonDisabled(wrapper, "apply")).toBe(false);
    });

    it("should handle button states for EXECUTED node", async () => {
      const { wrapper } = doMount({ props: { activeNode: executedNode } });

      await setLoadingDone(wrapper);

      expect(wrapper.find("button.execute").exists()).toBe(false);
      expect(wrapper.find("button.apply-execute").exists()).toBe(true);

      expect(isButtonDisabled(wrapper, "discard")).toBe(true);
      expect(isButtonDisabled(wrapper, "apply-execute")).toBe(true);
      expect(isButtonDisabled(wrapper, "apply")).toBe(true);

      await setDirtyState(wrapper, {
        apply: ApplyState.EXEC,
        view: ViewState.EXEC,
      });

      expect(wrapper.find("button.execute").exists()).toBe(false);
      expect(wrapper.find("button.apply-execute").exists()).toBe(true);

      expect(isButtonDisabled(wrapper, "discard")).toBe(false);
      expect(isButtonDisabled(wrapper, "apply-execute")).toBe(true);
      expect(isButtonDisabled(wrapper, "apply")).toBe(false);

      await setDirtyState(wrapper, {
        apply: ApplyState.CONFIG,
        view: ViewState.CONFIG,
      });

      expect(wrapper.find("button.execute").exists()).toBe(false);
      expect(wrapper.find("button.apply-execute").exists()).toBe(true);

      expect(isButtonDisabled(wrapper, "discard")).toBe(false);
      expect(isButtonDisabled(wrapper, "apply-execute")).toBe(false);
      expect(isButtonDisabled(wrapper, "apply")).toBe(false);
    });

    it("should handle discard", async () => {
      const { wrapper } = doMount({ props: { activeNode: configuredNode } });

      await setLoadingDone(wrapper);

      await setDirtyState(wrapper, {
        apply: ApplyState.CONFIG,
        view: ViewState.CONFIG,
      });

      expect(wrapper.emitted("discard")).toBeUndefined();

      const discardButton = getButton(wrapper, "discard");
      await discardButton.trigger("click");

      expect(wrapper.emitted("discard")).toBeDefined();
    });

    it("should handle apply & execute", async () => {
      const { wrapper } = doMount({ props: { activeNode: executedNode } });

      await setLoadingDone(wrapper);

      await setDirtyState(wrapper, {
        apply: ApplyState.CONFIG,
        view: ViewState.CONFIG,
      });

      expect(wrapper.emitted("apply")).toBeUndefined();

      const applyAndExecuteButton = getButton(wrapper, "apply-execute");
      await applyAndExecuteButton.trigger("click");

      expect(wrapper.emitted("apply")![0][0]).toBe(true);
    });

    it("should handle execute", async () => {
      const { wrapper } = doMount({ props: { activeNode: configuredNode } });

      await setLoadingDone(wrapper);

      const executeButton = getButton(wrapper, "execute");
      expect(wrapper.emitted("execute")).toBeUndefined();

      await executeButton.trigger("click");
      expect(wrapper.find("button.execute").exists()).toBe(true);

      expect(wrapper.emitted("execute")).toBeDefined();
    });

    it("should handle apply", async () => {
      const { wrapper } = doMount({ props: { activeNode: configuredNode } });

      await setLoadingDone(wrapper);

      await setDirtyState(wrapper, {
        apply: ApplyState.CONFIG,
        view: ViewState.CONFIG,
      });

      expect(wrapper.emitted("apply")).toBeUndefined();

      const applyButton = getButton(wrapper, "apply");
      await applyButton.trigger("click");

      expect(wrapper.emitted("apply")![0][0]).toBe(false);
    });
  });
});
