import { describe, expect, it } from "vitest";
import { VueWrapper, mount } from "@vue/test-utils";

import type { APILayerDirtyState } from "@knime/ui-extension-renderer/api";

import {
  type ComponentNode,
  type NativeNode,
  NodeState,
} from "@/api/gateway-api/generated-api";
import { createNativeNode } from "@/test/factories";
import NodeConfigButtons from "../NodeConfigButtons.vue";

describe("NodeConfigButtons.vue", () => {
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
      activeNode?: NativeNode | ComponentNode;
      dirtyState?: APILayerDirtyState;
    };
  };

  const defaultProps: Required<MountOpts["props"]> = {
    activeNode: idleNode,
    dirtyState: { apply: "clean", view: "clean" },
  };

  const setDirtyState = (
    wrapper: VueWrapper<any>,
    state: APILayerDirtyState,
  ) => {
    return wrapper.setProps({ dirtyState: state });
  };

  const doMount = ({ props }: MountOpts = {}) => {
    const wrapper = mount(NodeConfigButtons, {
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

  const expectButtonsInDirtyState = (wrapper: VueWrapper) => {
    expect(wrapper.find("button.execute").exists()).toBe(false);
    expect(wrapper.find("button.apply-execute").exists()).toBe(true);

    expect(isButtonDisabled(wrapper, "discard")).toBe(false);
    expect(isButtonDisabled(wrapper, "apply-execute")).toBe(false);
    expect(isButtonDisabled(wrapper, "apply")).toBe(false);
  };

  it("should handle button states for IDLE node", async () => {
    const { wrapper } = doMount();

    expect(wrapper.find("button.execute").exists()).toBe(false);
    expect(isButtonDisabled(wrapper, "discard")).toBe(true);
    expect(isButtonDisabled(wrapper, "apply-execute")).toBe(true);
    expect(isButtonDisabled(wrapper, "apply")).toBe(true);

    await setDirtyState(wrapper, {
      apply: "configured",
      view: "configured",
    });

    expectButtonsInDirtyState(wrapper);
  });

  it("should handle button states for CONFIGURED node", async () => {
    const { wrapper } = doMount({ props: { activeNode: configuredNode } });

    expect(wrapper.find("button.execute").exists()).toBe(true);
    expect(wrapper.find("button.apply-execute").exists()).toBe(false);

    expect(isButtonDisabled(wrapper, "discard")).toBe(true);
    expect(isButtonDisabled(wrapper, "execute")).toBe(false);
    expect(isButtonDisabled(wrapper, "apply")).toBe(true);

    await setDirtyState(wrapper, {
      apply: "configured",
      view: "configured",
    });

    expectButtonsInDirtyState(wrapper);
  });

  it("should handle button states for EXECUTED node", async () => {
    const { wrapper } = doMount({ props: { activeNode: executedNode } });

    expect(wrapper.find("button.execute").exists()).toBe(false);
    expect(wrapper.find("button.apply-execute").exists()).toBe(true);

    expect(isButtonDisabled(wrapper, "discard")).toBe(true);
    expect(isButtonDisabled(wrapper, "apply-execute")).toBe(true);
    expect(isButtonDisabled(wrapper, "apply")).toBe(true);

    await setDirtyState(wrapper, {
      apply: "executed",
      view: "executed",
    });

    expect(wrapper.find("button.execute").exists()).toBe(false);
    expect(wrapper.find("button.apply-execute").exists()).toBe(true);

    expect(isButtonDisabled(wrapper, "discard")).toBe(false);
    expect(isButtonDisabled(wrapper, "apply-execute")).toBe(true);
    expect(isButtonDisabled(wrapper, "apply")).toBe(false);

    await setDirtyState(wrapper, {
      apply: "configured",
      view: "configured",
    });

    expectButtonsInDirtyState(wrapper);
  });

  it("should handle discard", async () => {
    const { wrapper } = doMount({ props: { activeNode: configuredNode } });

    await setDirtyState(wrapper, {
      apply: "configured",
      view: "configured",
    });

    expect(wrapper.emitted("discard")).toBeUndefined();

    const discardButton = getButton(wrapper, "discard");
    await discardButton.trigger("click");

    expect(wrapper.emitted("discard")).toBeDefined();
  });

  it("should handle apply & execute", async () => {
    const { wrapper } = doMount({ props: { activeNode: executedNode } });

    await setDirtyState(wrapper, {
      apply: "configured",
      view: "configured",
    });

    expect(wrapper.emitted("apply")).toBeUndefined();

    const applyAndExecuteButton = getButton(wrapper, "apply-execute");
    await applyAndExecuteButton.trigger("click");

    expect(wrapper.emitted("apply")![0][0]).toBe(true);
  });

  it("should handle execute", async () => {
    const { wrapper } = doMount({ props: { activeNode: configuredNode } });

    const executeButton = getButton(wrapper, "execute");
    expect(wrapper.emitted("execute")).toBeUndefined();

    await executeButton.trigger("click");
    expect(wrapper.find("button.execute").exists()).toBe(true);

    expect(wrapper.emitted("execute")).toBeDefined();
  });

  it("should handle apply", async () => {
    const { wrapper } = doMount({ props: { activeNode: configuredNode } });

    await setDirtyState(wrapper, {
      apply: "configured",
      view: "configured",
    });

    expect(wrapper.emitted("apply")).toBeUndefined();

    const applyButton = getButton(wrapper, "apply");
    await applyButton.trigger("click");

    expect(wrapper.emitted("apply")![0][0]).toBe(false);
  });
});
