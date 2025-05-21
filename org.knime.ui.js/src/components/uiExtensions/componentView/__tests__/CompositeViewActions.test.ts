import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";
import { mount } from "@vue/test-utils";

import { NodeState } from "@/api/gateway-api/generated-api";
import { createComponentNode, createNativeNode } from "@/test/factories";
import CompositeViewActions from "../CompositeViewActions.vue";
import { useCompositeViewActions } from "../useCompositeViewActions";

vi.mock("@/composables/usePageBuilder/usePageBuilder", () => ({
  applyAndExecute: vi.fn(),
  applyToDefaultAndExecute: vi.fn(),
  resetToDefaults: vi.fn(),
  isCompositeViewDefault: ref(true),
  isCompositeViewDirty: ref(false),
}));

const componentNode = createComponentNode({
  id: "test-node",
  hasView: true,
  outPorts: [
    { typeId: "flowVariable", portContentVersion: 456 },
    { typeId: "table", portContentVersion: 123 },
  ],
  state: {
    executionState: NodeState.ExecutionStateEnum.EXECUTED,
  },
  allowedActions: {
    canExecute: false,
  },
});

describe("CompositeViewActions", () => {
  const createWrapper = async (
    nodeState: NodeState.ExecutionStateEnum = NodeState.ExecutionStateEnum
      .EXECUTED,
    isDirty = false,
    isDefault = true,
  ) => {
    const usePageBuilder = await import(
      "@/composables/usePageBuilder/usePageBuilder"
    );
    usePageBuilder.isCompositeViewDirty.value = isDirty;
    usePageBuilder.isCompositeViewDefault.value = isDefault;

    return mount(CompositeViewActions, {
      props: {
        componentNode: {
          ...componentNode,
          state: { executionState: nodeState },
        },
      },
      global: {
        provide: {
          isCompositeViewDirty: ref(isDirty),
          isCompositeViewDefault: ref(isDefault),
        },
        stubs: {
          SubMenu: false,
        },
      },
    });
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly when executed", async () => {
    const wrapper = await createWrapper();
    expect(wrapper.find(".composite-view-actions").exists()).toBe(true);
    expect(wrapper.find(".dropdown-icon").exists()).toBe(true);
  });

  it("shows dirty indicator when changes exist", async () => {
    const wrapper = await createWrapper(
      NodeState.ExecutionStateEnum.EXECUTED,
      true,
    );
    await nextTick();
    const indicator = wrapper.find(".unsaved-changes-indicator");
    expect(indicator.classes("dirty")).toBe(true);
  });

  it("hides dirty indicator when no changes exist", async () => {
    const wrapper = await createWrapper(
      NodeState.ExecutionStateEnum.EXECUTED,
      false,
    );
    await nextTick();
    const indicator = wrapper.find(".unsaved-changes-indicator");
    expect(indicator.classes("dirty")).toBe(false);
  });

  it("disables menu when not executed", async () => {
    const wrapper = await createWrapper(
      NodeState.ExecutionStateEnum.CONFIGURED,
    );
    const subMenu = wrapper.findComponent({ name: "SubMenu" });
    expect(subMenu.props("disabled")).toBe(true);
  });

  it("menu items have correct disabled states", async () => {
    const wrapper = await createWrapper(
      NodeState.ExecutionStateEnum.EXECUTED,
      true,
      false,
    );
    await nextTick();
    const items = wrapper.findComponent({ name: "SubMenu" }).props("items");

    expect(items[0].disabled).toBe(false); // Execute with changes
    expect(items[1].disabled).toBe(false); // Apply as new default
    expect(items[2].disabled).toBe(false); // Reset to default

    const wrapper2 = await createWrapper(
      NodeState.ExecutionStateEnum.EXECUTED,
      false,
      true,
    );
    await nextTick();
    const items2 = wrapper2.findComponent({ name: "SubMenu" }).props("items");
    expect(items2[0].disabled).toBe(true);
    expect(items2[1].disabled).toBe(true);
    expect(items2[2].disabled).toBe(true);
  });

  it("triggers actions correctly", async () => {
    const { applyAndExecute, applyToDefaultAndExecute, resetToDefaults } =
      await import("@/composables/usePageBuilder/usePageBuilder");

    const wrapper = await createWrapper(
      NodeState.ExecutionStateEnum.EXECUTED,
      true,
      false,
    );
    await nextTick();
    const items = wrapper.findComponent({ name: "SubMenu" }).props("items");

    items[0].metadata.onClick();
    expect(applyAndExecute).toHaveBeenCalled();

    items[1].metadata.onClick();
    expect(applyToDefaultAndExecute).toHaveBeenCalledWith(componentNode.id);

    items[2].metadata.onClick();
    expect(resetToDefaults).toHaveBeenCalledWith(componentNode.id);
  });
});

describe("useCompositeViewActions", () => {
  it("returns actions config for component nodes with view", () => {
    const result = useCompositeViewActions(componentNode);

    expect(result).toEqual({
      icon: expect.any(Object),
      label: "Data App View",
      extraComponent: CompositeViewActions,
      extraComponentProps: { componentNode },
    });
  });

  it("returns null for non-component nodes", () => {
    const node = {
      ...createNativeNode(),
      hasView: true,
    };
    expect(useCompositeViewActions(node)).toBeNull();
  });

  it("returns null for nodes without view", () => {
    const node = {
      ...componentNode,
      hasView: false,
    };
    expect(useCompositeViewActions(node)).toBeNull();
  });
});
