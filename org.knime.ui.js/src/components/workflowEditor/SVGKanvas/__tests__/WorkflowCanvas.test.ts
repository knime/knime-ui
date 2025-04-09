import { type Mock, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises, shallowMount } from "@vue/test-utils";

import { TABS } from "@/store/panel";
import { mockStores } from "@/test/utils/mockStores";
import SelectionRectangle from "../SelectionRectangle/SelectionRectangle.vue";
import Workflow from "../Workflow.vue";
import WorkflowCanvas from "../WorkflowCanvas.vue";
import WorkflowEmpty from "../WorkflowEmpty.vue";
import Kanvas from "../kanvas/Kanvas.vue";

describe("WorkflowCanvas", () => {
  type MountOpts = {
    isWorkflowEmpty?: boolean;
    screenToCanvasCoordinatesMock?: Mock<() => [number, number]> | null;
    workflowCanvasState?: any | null;
  };
  const doShallowMount = ({
    isWorkflowEmpty = false,
    screenToCanvasCoordinatesMock,
    workflowCanvasState = null,
  }: MountOpts = {}) => {
    const mockedStores = mockStores();
    mockedStores.applicationStore.activeProjectId = "project1";

    // @ts-expect-error
    mockedStores.workflowStore.isWorkflowEmpty = isWorkflowEmpty;

    // @ts-expect-error
    mockedStores.canvasStateTrackingStore.workflowCanvasState =
      workflowCanvasState;

    // @ts-expect-error
    mockedStores.canvasStore.screenToCanvasCoordinates =
      screenToCanvasCoordinatesMock ?? (() => [0, 0]);

    const wrapper = shallowMount(WorkflowCanvas, {
      global: { plugins: [mockedStores.testingPinia] },
    });

    return { wrapper, mockedStores };
  };

  describe("with Workflow", () => {
    it("renders workflow, if it is not empty", async () => {
      const { wrapper, mockedStores } = doShallowMount();

      await flushPromises();
      expect(
        mockedStores.canvasStateTrackingStore.restoreCanvasState,
      ).toHaveBeenCalled();

      expect(wrapper.findComponent(WorkflowEmpty).exists()).toBe(false);
      expect(wrapper.findComponent(Workflow).exists()).toBe(true);
    });

    it("clicking on empty canvas deselects all", () => {
      const { wrapper } = doShallowMount();

      const workflowComponent = wrapper.findComponent(Workflow);

      workflowComponent.vm.applyNodeSelectionPreview = vi.fn();
      wrapper
        .findComponent(SelectionRectangle)
        .vm.$emit("node-selection-preview", "args");

      expect(
        workflowComponent.vm.applyNodeSelectionPreview,
      ).toHaveBeenCalledWith("args");
    });

    it("does not fill the screen if workflow is not empty", async () => {
      const { wrapper, mockedStores } = doShallowMount();
      await flushPromises();
      expect(mockedStores.canvasStore.fillScreen).toHaveBeenCalled();
      const kanvas = wrapper.findComponent(Kanvas);
      kanvas.vm.$emit("container-size-changed");

      await flushPromises();
      expect(mockedStores.canvasStore.fillScreen).toHaveBeenCalledTimes(1);
    });

    it("switch from empty workflow", async () => {
      const { wrapper, mockedStores } = doShallowMount();
      await nextTick();
      vi.mocked(mockedStores.canvasStore.fillScreen).mockReset();

      // workaround, instead of triggering the canvas getter to reevaluate
      vi.spyOn(wrapper.vm, "isWorkflowEmpty", "get").mockReturnValue(false);
      await nextTick();

      expect(mockedStores.canvasStore.fillScreen).not.toHaveBeenCalled();
      expect(
        mockedStores.panelStore.setCurrentProjectActiveTab,
      ).not.toHaveBeenCalledWith(expect.any(Object), TABS.NODE_REPOSITORY);
    });
  });

  describe("with empty workflow", () => {
    it("renders workflow placeholder, if workflow is empty", async () => {
      const { wrapper } = doShallowMount({ isWorkflowEmpty: true });
      await nextTick();
      expect(wrapper.findComponent(WorkflowEmpty).exists()).toBe(true);
      expect(wrapper.findComponent(Workflow).exists()).toBe(false);
    });

    it("container size update fills the screen", async () => {
      const { wrapper, mockedStores } = doShallowMount({
        isWorkflowEmpty: true,
      });

      await nextTick();

      vi.mocked(mockedStores.canvasStore.fillScreen)
        .mockImplementation(() => {})
        .mockReset();
      const kanvas = wrapper.findComponent(Kanvas);
      kanvas.vm.$emit("container-size-changed");

      await nextTick();
      expect(mockedStores.canvasStore.fillScreen).toHaveBeenCalledTimes(1);
    });

    it("switch to empty workflow", async () => {
      const { wrapper, mockedStores } = doShallowMount({
        isWorkflowEmpty: true,
      });

      // workaround, instead of triggering the canvas getter to reevaluate
      vi.spyOn(wrapper.vm, "isWorkflowEmpty", "get").mockReturnValue(false);
      await nextTick();

      expect(mockedStores.canvasStore.fillScreen).toHaveBeenCalled();
    });
  });

  it("zooms to fit after mounting", async () => {
    const { mockedStores } = doShallowMount({ isWorkflowEmpty: true });

    await nextTick();

    expect(mockedStores.canvasStore.fillScreen).toHaveBeenCalled();
  });

  it("calls 'openQuickActionMenu' with correct coordinates on double click inside <svg>", async () => {
    const screenToCanvasCoordinatesMock = vi.fn(() => [100, 200]);
    const { wrapper, mockedStores } = doShallowMount({
      isWorkflowEmpty: true,
      screenToCanvasCoordinatesMock,
    });

    // @ts-expect-error
    mockedStores.canvasStore.initScrollContainerElement({
      offsetLeft: 10,
      offsetTop: 10,
      scrollLeft: 30,
      scrollTop: 30,
      scrollTo: () => {},
    });

    // @ts-expect-error
    mockedStores.canvasStore.screenToCanvasCoordinates = () =>
      screenToCanvasCoordinatesMock;

    const kanvas = wrapper.findComponent(Kanvas);

    const svgElement = document.createElement("svg");
    kanvas.element.appendChild(svgElement);

    svgElement.dispatchEvent(
      new MouseEvent("dblclick", {
        clientX: 50,
        clientY: 75,
        bubbles: true,
        cancelable: true,
      }),
    );

    await nextTick();

    expect(screenToCanvasCoordinatesMock).toHaveBeenCalledWith([50, 75]);

    expect(
      mockedStores.canvasAnchoredComponentsStore.openQuickActionMenu,
    ).toHaveBeenCalledWith({
      props: { position: { x: 100, y: 200 } },
    });

    const nonSvgElement = document.createElement("div");
    kanvas.element.appendChild(nonSvgElement);

    vi.mocked(
      mockedStores.canvasAnchoredComponentsStore.openQuickActionMenu,
    ).mockReset();

    nonSvgElement.dispatchEvent(
      new MouseEvent("dblclick", {
        clientX: 50,
        clientY: 75,
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(
      mockedStores.canvasAnchoredComponentsStore.openQuickActionMenu,
    ).not.toHaveBeenCalled();
  });

  it("does not zoom to fit after mounting if a canvas state exists for this worflow", async () => {
    const { mockedStores } = doShallowMount({
      workflowCanvasState: {
        zoomFactor: 1,
        scrollLeft: 10,
        scrollTop: 10,
        scrollWidth: 10,
        scrollHeight: 10,
      },
    });

    await flushPromises();

    expect(mockedStores.canvasStore.fillScreen).not.toHaveBeenCalled();
  });
});
