import { VueWrapper, flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockVuexStore, mockedObject } from "@/test/utils";
import * as applicationStore from "@/store/application";
import * as selectionStore from "@/store/selection";
import * as workflowStore from "@/store/workflow";
import { getToastsProvider } from "@/plugins/toasts";

import NodeConfigWrapper from "../NodeConfigWrapper.vue";
import { createNativeNode, createWorkflow } from "@/test/factories";
import { NodeState } from "@/api/gateway-api/generated-api";
import NodeConfigLoader from "../NodeConfigLoader.vue";
import { nextTick } from "vue";
import { useNodeConfigAPI } from "../../common/useNodeConfigAPI";
import { ApplyState, ViewState } from "@knime/ui-extension-service";

const toast = mockedObject(getToastsProvider());

vi.mock("@/environment", async () => {
  const actual = await vi.importActual("@/environment");
  return {
    ...actual,
    environment: "BROWSER",
    isDesktop: false,
    isBrowser: true,
  };
});

describe("NodeConfigWrapper.vue", () => {
  const projectId = "project1";
  const workflowId = "workflow1";

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

  const createStore = () => {
    const $store = mockVuexStore({
      application: applicationStore,
      selection: selectionStore,
      workflow: workflowStore,
    });

    const workflow = createWorkflow({
      projectId,
      info: {
        containerId: workflowId,
      },
      nodes: {
        [idleNode.id]: idleNode,
        [configuredNode.id]: configuredNode,
        [executedNode.id]: executedNode,
      },
    });

    $store.commit("application/setActiveProjectId", projectId);
    $store.commit("workflow/setActiveWorkflow", workflow);
    $store.dispatch("selection/selectNode", idleNode.id);

    return $store;
  };

  type MountOpts = {
    $store: ReturnType<typeof createStore>;
  };

  const doMount = ({ $store }: MountOpts = { $store: createStore() }) => {
    const wrapper = mount(NodeConfigWrapper, {
      global: {
        plugins: [$store],
        stubs: {
          NodeConfigLoader: {
            template: '<div><slot name="controls" /></div>',
          },
        },
      },
    });

    const dispatchSpy = vi.spyOn($store, "dispatch");

    return { wrapper, $store, dispatchSpy };
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

  describe("action buttons", () => {
    const {
      dirtyState,
      setDirtyState,
      resetDirtyState,
      setApplyComplete,
      setEventDispatcher,
    } = useNodeConfigAPI();

    afterEach(() => {
      resetDirtyState();
    });

    it("should render correctly", async () => {
      const { wrapper } = doMount();

      expect(wrapper.find(".buttons").exists()).toBe(false);
      await setLoadingDone(wrapper);
      expect(wrapper.find(".buttons").exists()).toBe(true);
    });

    it("should handle button states for IDLE node", async () => {
      const { wrapper, $store } = doMount();

      await setLoadingDone(wrapper);

      await $store.dispatch("selection/selectNode", idleNode.id);

      expect(wrapper.find("button.execute").exists()).toBe(false);
      expect(isButtonDisabled(wrapper, "discard")).toBe(true);
      expect(isButtonDisabled(wrapper, "apply-execute")).toBe(true);
      expect(isButtonDisabled(wrapper, "apply")).toBe(true);

      setDirtyState({ apply: ApplyState.CONFIG, view: ViewState.CONFIG });
      await nextTick();

      expect(wrapper.find("button.execute").exists()).toBe(false);
      expect(wrapper.find("button.apply-execute").exists()).toBe(true);

      expect(isButtonDisabled(wrapper, "discard")).toBe(false);
      expect(isButtonDisabled(wrapper, "apply-execute")).toBe(false);
      expect(isButtonDisabled(wrapper, "apply")).toBe(false);
    });

    it("should handle button states for CONFIGURED node", async () => {
      const { wrapper, $store } = doMount();

      await setLoadingDone(wrapper);

      await $store.dispatch("selection/deselectAllObjects");
      await $store.dispatch("selection/selectNode", configuredNode.id);

      expect(wrapper.find("button.execute").exists()).toBe(true);
      expect(wrapper.find("button.apply-execute").exists()).toBe(false);

      expect(isButtonDisabled(wrapper, "discard")).toBe(true);
      expect(isButtonDisabled(wrapper, "execute")).toBe(false);
      expect(isButtonDisabled(wrapper, "apply")).toBe(true);

      setDirtyState({ apply: ApplyState.CONFIG, view: ViewState.CONFIG });
      await nextTick();

      expect(wrapper.find("button.execute").exists()).toBe(false);
      expect(wrapper.find("button.apply-execute").exists()).toBe(true);

      expect(isButtonDisabled(wrapper, "discard")).toBe(false);
      expect(isButtonDisabled(wrapper, "apply-execute")).toBe(false);
      expect(isButtonDisabled(wrapper, "apply")).toBe(false);
    });

    it("should handle button states for EXECUTED node", async () => {
      const { wrapper, $store } = doMount();

      await setLoadingDone(wrapper);

      await $store.dispatch("selection/deselectAllObjects");
      await $store.dispatch("selection/selectNode", executedNode.id);

      expect(wrapper.find("button.execute").exists()).toBe(false);
      expect(wrapper.find("button.apply-execute").exists()).toBe(true);

      expect(isButtonDisabled(wrapper, "discard")).toBe(true);
      expect(isButtonDisabled(wrapper, "apply-execute")).toBe(true);
      expect(isButtonDisabled(wrapper, "apply")).toBe(true);

      setDirtyState({ apply: ApplyState.EXEC, view: ViewState.EXEC });

      await nextTick();

      expect(wrapper.find("button.execute").exists()).toBe(false);
      expect(wrapper.find("button.apply-execute").exists()).toBe(true);

      expect(isButtonDisabled(wrapper, "discard")).toBe(false);
      expect(isButtonDisabled(wrapper, "apply-execute")).toBe(true);
      expect(isButtonDisabled(wrapper, "apply")).toBe(false);

      setDirtyState({ apply: ApplyState.CONFIG, view: ViewState.CONFIG });

      await nextTick();

      expect(wrapper.find("button.execute").exists()).toBe(false);
      expect(wrapper.find("button.apply-execute").exists()).toBe(true);

      expect(isButtonDisabled(wrapper, "discard")).toBe(false);
      expect(isButtonDisabled(wrapper, "apply-execute")).toBe(false);
      expect(isButtonDisabled(wrapper, "apply")).toBe(false);
    });

    it("should handle discard", async () => {
      const { wrapper, $store } = doMount();

      await setLoadingDone(wrapper);

      await $store.dispatch("selection/deselectAllObjects");
      await $store.dispatch("selection/selectNode", configuredNode.id);

      setDirtyState({ apply: ApplyState.CONFIG, view: ViewState.CONFIG });
      await nextTick();

      const discardButton = getButton(wrapper, "discard");
      await discardButton.trigger("click");

      expect(dirtyState.value).toEqual({
        apply: ApplyState.CLEAN,
        view: ViewState.CLEAN,
      });
    });

    it("should handle apply & execute", async () => {
      const { wrapper, $store, dispatchSpy } = doMount();

      const mockDispatcher = vi.fn();
      setEventDispatcher(mockDispatcher);

      await setLoadingDone(wrapper);

      await $store.dispatch("selection/deselectAllObjects");
      await $store.dispatch("selection/selectNode", executedNode.id);

      setDirtyState({ apply: ApplyState.CONFIG, view: ViewState.CONFIG });
      await nextTick();

      const applyAndExecuteButton = getButton(wrapper, "apply-execute");
      await applyAndExecuteButton.trigger("click");
      setApplyComplete(true);
      await flushPromises();
      expect(mockDispatcher).toHaveBeenCalled();

      expect(dispatchSpy).toHaveBeenCalledWith("workflow/executeNodes", [
        executedNode.id,
      ]);
    });

    it("should handle execute", async () => {
      const { wrapper, $store, dispatchSpy } = doMount();

      await setLoadingDone(wrapper);

      await $store.dispatch("selection/deselectAllObjects");
      await $store.dispatch("selection/selectNode", configuredNode.id);

      const executeButton = getButton(wrapper, "execute");
      await executeButton.trigger("click");
      expect(wrapper.find("button.execute").exists()).toBe(true);

      expect(dispatchSpy).toHaveBeenCalledWith("workflow/executeNodes", [
        configuredNode.id,
      ]);
    });

    it("should handle apply", async () => {
      const { wrapper, $store, dispatchSpy } = doMount();

      const mockDispatcher = vi.fn();
      setEventDispatcher(mockDispatcher);

      await setLoadingDone(wrapper);

      await $store.dispatch("selection/deselectAllObjects");
      await $store.dispatch("selection/selectNode", configuredNode.id);

      setDirtyState({ apply: ApplyState.CONFIG, view: ViewState.CONFIG });
      await nextTick();

      const applyButton = getButton(wrapper, "apply");
      await applyButton.trigger("click");
      setApplyComplete(true);
      await flushPromises();
      expect(mockDispatcher).toHaveBeenCalled();

      expect(dispatchSpy).not.toHaveBeenCalledWith("workflow/executeNodes", [
        executedNode.id,
      ]);
    });
  });

  describe("apply on clickaway", () => {
    const { setDirtyState, resetDirtyState, setEventDispatcher } =
      useNodeConfigAPI();

    afterEach(() => {
      resetDirtyState();
      vi.clearAllMocks();
    });

    it("should apply changes when selected node changes", async () => {
      const { wrapper, $store } = doMount();

      const mockDispatcher = vi.fn();
      setEventDispatcher(mockDispatcher);
      $store.commit("application/setPermissions", { canConfigureNodes: true });
      await setLoadingDone(wrapper);

      // make some changes that require saving
      setDirtyState({ apply: ApplyState.CONFIG, view: ViewState.CONFIG });
      await nextTick();

      // change to another node
      $store.dispatch("selection/deselectAllObjects");
      $store.dispatch("selection/selectNode", configuredNode.id);
      await flushPromises();

      expect(toast.show).not.toHaveBeenCalled();
      expect(mockDispatcher).toHaveBeenCalled();
    });

    it("should not apply changes when permissions don't allow it", async () => {
      const { wrapper, $store } = doMount();

      const mockDispatcher = vi.fn();
      setEventDispatcher(mockDispatcher);
      $store.commit("application/setPermissions", { canConfigureNodes: false });
      await setLoadingDone(wrapper);

      // make some changes that require saving
      setDirtyState({ apply: ApplyState.CONFIG, view: ViewState.CONFIG });
      await nextTick();

      // change to another node
      $store.dispatch("selection/deselectAllObjects");
      $store.dispatch("selection/selectNode", configuredNode.id);
      await flushPromises();

      expect(toast.show).not.toHaveBeenCalled();
      expect(mockDispatcher).not.toHaveBeenCalled();
    });

    it("should show warning toast when node is executed", async () => {
      const { wrapper, $store } = doMount();

      const mockDispatcher = vi.fn();
      setEventDispatcher(mockDispatcher);
      $store.commit("application/setPermissions", { canConfigureNodes: true });
      await setLoadingDone(wrapper);

      // set the executedNode as the selected one
      $store.dispatch("selection/deselectAllObjects");
      $store.dispatch("selection/selectNode", executedNode.id);
      await flushPromises();

      // make some changes that require saving
      setDirtyState({ apply: ApplyState.CONFIG, view: ViewState.CONFIG });
      await nextTick();

      // change to another node
      $store.dispatch("selection/deselectAllObjects");
      $store.dispatch("selection/selectNode", configuredNode.id);
      await flushPromises();

      expect(toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          headline: "Node configuration was not saved",
        }),
      );
      expect(mockDispatcher).not.toHaveBeenCalled();
    });

    it("should apply changes when component is unmounted", async () => {
      const { wrapper, $store } = doMount();

      const mockDispatcher = vi.fn();
      setEventDispatcher(mockDispatcher);
      $store.commit("application/setPermissions", { canConfigureNodes: false });
      await setLoadingDone(wrapper);

      // make some changes that require saving
      setDirtyState({ apply: ApplyState.CONFIG, view: ViewState.CONFIG });
      await nextTick();

      // change to another node
      wrapper.unmount();

      expect(toast.show).not.toHaveBeenCalled();
      expect(mockDispatcher).not.toHaveBeenCalled();
    });
  });
});
