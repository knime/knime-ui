import { expect, describe, beforeEach, it, vi } from "vitest";
import * as Vue from "vue";
import { shallowMount } from "@vue/test-utils";

import { mockVuexStore } from "@/test/utils/mockVuexStore";

import { TABS } from "@/store/panel";
import Kanvas from "@/components/workflow/kanvas/Kanvas.vue";
import Workflow from "../Workflow.vue";
import SelectionRectangle from "../SelectionRectangle/SelectionRectangle.vue";
import WorkflowEmpty from "../WorkflowEmpty.vue";
import WorkflowCanvas from "../WorkflowCanvas.vue";

describe("Kanvas", () => {
  let doShallowMount, wrapper, $store, storeConfig, isWorkflowEmpty;

  beforeEach(() => {
    isWorkflowEmpty = false;
    storeConfig = {
      canvas: {
        state: {
          zoomFactor: 1,
        },
        getters: {
          contentBounds: () => ({
            left: 5,
            top: 10,
            width: 20,
            height: 30,
          }),
        },
        actions: {
          fillScreen: vi.fn(),
        },
      },
      selection: {
        actions: {
          deselectAllObjects: vi.fn(),
        },
      },
      workflow: {
        state: {
          activeWorkflow: {
            info: {
              containerId: "workflow1",
            },
          },
        },
        getters: {
          isWorkflowEmpty() {
            return isWorkflowEmpty;
          },
        },
      },
      nodeRepository: {
        state: {
          isDraggingNode: false,
        },
      },
      panel: {
        actions: {
          setCurrentProjectActiveTab: vi.fn(),
        },
      },
      application: {
        state: {
          activeProjectId: "project1",
        },
        mutations: {
          setSavedStates: vi.fn(),
        },
        getters: {
          workflowCanvasState: () => null,
          hasAnnotationModeEnabled: () => false,
        },
      },
    };

    $store = mockVuexStore(storeConfig);

    doShallowMount = () => {
      wrapper = shallowMount(WorkflowCanvas, { global: { plugins: [$store] } });
    };
  });

  describe("with Workflow", () => {
    it("renders workflow, if it is not empty", () => {
      doShallowMount();

      expect(wrapper.findComponent(WorkflowEmpty).exists()).toBe(false);
      expect(wrapper.findComponent(Workflow).exists()).toBe(true);
    });

    it("clicking on empty canvas deselects all", () => {
      doShallowMount();

      let workflowComponent = wrapper.findComponent(Workflow);

      workflowComponent.vm.applyNodeSelectionPreview = vi.fn();
      wrapper
        .findComponent(SelectionRectangle)
        .vm.$emit("node-selection-preview", "args");

      expect(
        workflowComponent.vm.applyNodeSelectionPreview,
      ).toHaveBeenCalledWith("args");
    });

    it("does not fill the screen if workflow is not empty", async () => {
      doShallowMount();
      await Vue.nextTick();
      expect(storeConfig.canvas.actions.fillScreen).toHaveBeenCalled();
      const kanvas = wrapper.findComponent(Kanvas);
      kanvas.vm.$emit("container-size-changed");

      await Vue.nextTick();
      await Vue.nextTick();
      expect(storeConfig.canvas.actions.fillScreen).toHaveBeenCalledTimes(1);
    });

    it("switch from empty workflow", async () => {
      doShallowMount();
      await Vue.nextTick();
      storeConfig.canvas.actions.fillScreen.mockReset();

      // workaround, instead of triggering the canvas getter to reevaluate
      wrapper.vm.$options.watch.isWorkflowEmpty.handler.call(wrapper.vm, false);
      await Vue.nextTick();

      expect(storeConfig.canvas.actions.fillScreen).not.toHaveBeenCalled();
      expect(
        storeConfig.panel.actions.setCurrentProjectActiveTab,
      ).not.toHaveBeenCalledWith(expect.any(Object), TABS.NODE_REPOSITORY);
    });
  });

  describe("with empty workflow", () => {
    beforeEach(async () => {
      isWorkflowEmpty = true;
      doShallowMount();
      await Vue.nextTick();
    });

    it("renders workflow placeholder, if workflow is empty", () => {
      expect(wrapper.findComponent(WorkflowEmpty).exists()).toBe(true);
      expect(wrapper.findComponent(Workflow).exists()).toBe(false);
    });

    it("container size update fills the screen", async () => {
      storeConfig.canvas.actions.fillScreen.mockReset();

      const kanvas = wrapper.findComponent(Kanvas);
      kanvas.vm.$emit("container-size-changed");

      await Vue.nextTick();
      expect(storeConfig.canvas.actions.fillScreen).toHaveBeenCalledTimes(1);
    });

    it("switch to empty workflow", async () => {
      // workaround, instead of triggering the canvas getter to reevaluate
      wrapper.vm.$options.watch.isWorkflowEmpty.handler.call(wrapper.vm, true);
      await Vue.nextTick();

      expect(storeConfig.canvas.actions.fillScreen).toHaveBeenCalled();
    });
  });

  it("zooms to fit after mounting", async () => {
    doShallowMount();
    await Vue.nextTick();

    expect(storeConfig.canvas.actions.fillScreen).toHaveBeenCalled();
  });

  it("does not zoom to fit after mounting if a canvas state exists for this worflow", async () => {
    storeConfig.application.getters.workflowCanvasState = () => ({});
    $store = mockVuexStore(storeConfig);

    shallowMount(WorkflowCanvas, { global: { plugins: [$store] } });
    await Vue.nextTick();

    expect(storeConfig.canvas.actions.fillScreen).not.toHaveBeenCalled();
  });
});
