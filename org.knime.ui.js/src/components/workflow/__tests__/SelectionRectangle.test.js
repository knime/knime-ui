import { expect, describe, beforeEach, afterEach, it, vi } from "vitest";
import * as Vue from "vue";
import { shallowMount } from "@vue/test-utils";
import { mockVuexStore } from "@/test/utils/mockVuexStore";

import { $bus } from "@/plugins/event-bus";
import * as $shapes from "@/style/shapes.mjs";
import * as $colors from "@/style/colors.mjs";

import { findItemsInsideOfRectangle as findItemsInsideOfRectangleMock } from "@/util/rectangleSelection";
import SelectionRectangle from "../SelectionRectangle.vue";

vi.mock("@/util/rectangleSelection", () => ({
  findItemsInsideOfRectangle: vi.fn(),
}));

describe("SelectionRectangle", () => {
  let wrapper,
    props,
    doShallowMount,
    $store,
    workflow,
    storeConfig,
    pointerDown,
    pointerUp,
    pointerMove,
    pointerId;

  beforeEach(() => {
    props = {};
    workflow = {
      nodes: {},
    };

    findItemsInsideOfRectangleMock.mockReturnValue({
      nodesInside: ["inside-1", "inside-2"],
      nodesOutside: ["outside-1", "outside-2"],
      annotationsInside: ["ann-inside-1", "ann-inside-2"],
      annotationsOutside: ["ann-outside-1", "ann-outside-2"],
    });

    storeConfig = {
      workflow: {
        state: {
          activeWorkflow: workflow,
        },
      },
      canvas: {
        getters: {
          screenToCanvasCoordinates: () =>
            vi.fn().mockImplementation(([x, y]) => [x, y]),
        },
      },
      selection: {
        getters: {
          selectedNodeIds: vi.fn().mockReturnValue([]),
          selectedAnnotationIds: vi.fn().mockReturnValue([]),
        },
        actions: {
          selectNodes: vi.fn(),
          deselectNodes: vi.fn(),
          deselectAllObjects: vi.fn(),
          selectAnnotations: vi.fn(),
          deselectAnnotations: vi.fn(),
        },
        mutations: {
          setDidStartRectangleSelection: vi.fn(),
        },
      },
    };

    doShallowMount = () => {
      $store = mockVuexStore(storeConfig);
      wrapper = shallowMount(SelectionRectangle, {
        props,
        // parentComponent,
        global: {
          plugins: [$store],
          mocks: {
            $shapes,
            $colors,
            $bus,
          },
        },
      });

      const kanvasMock = document.createElement("div");
      kanvasMock.id = "kanvas";
      document.body.appendChild(kanvasMock);
    };

    pointerDown = ({ clientX, clientY, shiftKey }) => {
      $bus.emit("selection-pointerdown", {
        pointerId: pointerId || 1,
        clientX,
        clientY,
        shiftKey: shiftKey || false,
        currentTarget: {
          getBoundingClientRect: () => ({
            left: 0,
            top: 0,
          }),
        },
        target: {
          setPointerCapture: () => null,
        },
      });
    };

    pointerMove = ({ clientX, clientY }) => {
      $bus.emit("selection-pointermove", {
        pointerId: pointerId || 1,
        clientX,
        clientY,
        currentTarget: {
          getBoundingClientRect: () => ({
            left: 0,
            top: 0,
          }),
        },
      });
    };

    pointerUp = () => {
      vi.useFakeTimers(); // implementation contains setTimout

      // stop also changes global dragging state
      $bus.emit("selection-pointerup", {
        pointerId: pointerId || 1,
        target: {
          releasePointerCapture: vi.fn(),
        },
      });

      vi.runAllTimers();
    };
  });

  afterEach(() => {
    storeConfig.selection.actions.selectNodes.mockClear();
    storeConfig.selection.actions.deselectNodes.mockClear();
    storeConfig.selection.actions.deselectAllObjects.mockClear();
    storeConfig.selection.actions.selectAnnotations.mockClear();
    storeConfig.selection.actions.deselectAnnotations.mockClear();
  });

  it("all object are deselected on start", async () => {
    doShallowMount();

    pointerDown({ clientX: 0, clientY: 0 });
    await Vue.nextTick();

    expect(storeConfig.selection.actions.deselectAllObjects).toBeCalled();
  });

  it("appears on pointerDown, disappears on pointerUp", async () => {
    doShallowMount();
    expect(wrapper.isVisible()).toBe(false);

    pointerDown({ clientX: 0, clientY: 0 });
    await Vue.nextTick();

    expect(wrapper.isVisible()).toBe(true);

    pointerUp();
    await Vue.nextTick();

    expect(wrapper.isVisible()).toBe(false);
  });

  describe("selection", () => {
    beforeEach(async () => {
      doShallowMount();

      pointerDown({ clientX: 10, clientY: 10 });
      pointerMove({ clientX: 300, clientY: 300 });
      await Vue.nextTick();
    });

    it("correctly uses algorithm to find included and excluded items", () => {
      expect(findItemsInsideOfRectangleMock).toHaveBeenCalledWith({
        startPos: { x: 10, y: 10 },
        endPos: { x: 300, y: 300 },
        workflow,
      });
    });

    it("shows selection preview for included nodes", () => {
      expect(wrapper.emitted("nodeSelectionPreview")).toStrictEqual([
        [
          {
            nodeId: "inside-1",
            type: "show",
          },
        ],
        [
          {
            nodeId: "inside-2",
            type: "show",
          },
        ],
      ]);
    });

    it("removes selection preview of previously selected nodes", async () => {
      // move those nodes out of selection
      findItemsInsideOfRectangleMock.mockReturnValue({
        nodesInside: [],
        nodesOutside: ["inside-1", "inside-2"],
        annotationsInside: [],
        annotationsOutside: [],
      });
      pointerMove({ clientX: 0, clientY: 0 });
      await Vue.nextTick();

      const selectionPreviewEvents = wrapper.emitted("nodeSelectionPreview");
      // skip first two events that select those nodes
      expect(selectionPreviewEvents.slice(2)).toStrictEqual([
        [
          {
            nodeId: "inside-1",
            type: "clear",
          },
        ],
        [
          {
            nodeId: "inside-2",
            type: "clear",
          },
        ],
      ]);
    });

    it("selects nodes on pointer up", () => {
      pointerUp();

      expect(storeConfig.selection.actions.selectNodes).toHaveBeenCalledWith(
        expect.anything(),
        ["inside-1", "inside-2"]
      );
    });

    it("shows selection preview for included annotations", () => {
      expect(wrapper.emitted("annotationSelectionPreview")).toStrictEqual([
        [
          {
            annotationId: "ann-inside-1",
            type: "show",
          },
        ],
        [
          {
            annotationId: "ann-inside-2",
            type: "show",
          },
        ],
      ]);
    });

    it("removes selection preview of previously selected annotations", async () => {
      findItemsInsideOfRectangleMock.mockReturnValue({
        nodesInside: [],
        nodesOutside: [],
        annotationsInside: [],
        annotationsOutside: ["ann-inside-1", "ann-inside-2"],
      });
      pointerMove({ clientX: 0, clientY: 0 });
      await Vue.nextTick();

      const selectionPreviewEvents = wrapper.emitted(
        "annotationSelectionPreview"
      );

      expect(selectionPreviewEvents.slice(2)).toStrictEqual([
        [
          {
            annotationId: "ann-inside-1",
            type: null,
          },
        ],
        [
          {
            annotationId: "ann-inside-2",
            type: null,
          },
        ],
      ]);
    });

    it("selects annotations on pointer up", () => {
      pointerUp();

      expect(
        storeConfig.selection.actions.selectAnnotations
      ).toHaveBeenCalledWith(expect.anything(), [
        "ann-inside-1",
        "ann-inside-2",
      ]);
    });

    it("sets didStartRectangleSelection to true when rectangle selection updates", async () => {
      pointerDown({ clientX: 10, clientY: 10 });
      pointerMove({ clientX: 300, clientY: 300 });
      await Vue.nextTick();

      expect(
        storeConfig.selection.mutations.setDidStartRectangleSelection
      ).toHaveBeenCalledWith(expect.anything(), true);
    });

    it("sets didStartRectangleSelection to false when rectangle selection ends", async () => {
      pointerDown({ clientX: 10, clientY: 10 });
      pointerMove({ clientX: 300, clientY: 300 });
      await Vue.nextTick();
      pointerUp();

      expect(
        storeConfig.selection.mutations.setDidStartRectangleSelection
      ).toHaveBeenCalledWith(expect.anything(), false);
    });
  });

  describe("de-Selection with Shift", () => {
    beforeEach(async () => {
      storeConfig.selection.getters.selectedNodeIds = vi
        .fn()
        .mockReturnValue(["inside-1", "inside-2"]);
      storeConfig.selection.getters.selectedAnnotationIds = vi
        .fn()
        .mockReturnValue(["ann-inside-1", "ann-inside-2"]);
      doShallowMount();

      pointerDown({ clientX: 0, clientY: 0, shiftKey: true });
      pointerMove({ clientX: 0, clientY: 0 });
      await Vue.nextTick();
    });

    it("no global deselection", () => {
      expect(
        storeConfig.selection.actions.deselectAllObjects
      ).not.toHaveBeenCalled();
    });

    it("deselects already selected nodes with preview", () => {
      expect(wrapper.emitted("nodeSelectionPreview")).toStrictEqual([
        [
          {
            nodeId: "inside-1",
            type: "hide",
          },
        ],
        [
          {
            nodeId: "inside-2",
            type: "hide",
          },
        ],
      ]);
    });

    it("pointerup clears selection preview for nodes", () => {
      pointerUp();

      expect(wrapper.emitted("nodeSelectionPreview").slice(2)).toStrictEqual([
        [
          {
            nodeId: "inside-1",
            type: "clear",
          },
        ],
        [
          {
            nodeId: "inside-2",
            type: "clear",
          },
        ],
      ]);
    });

    it("pointerup deselects nodes", () => {
      pointerUp();

      expect(storeConfig.selection.actions.selectNodes).not.toHaveBeenCalled();
      expect(storeConfig.selection.actions.deselectNodes).toHaveBeenCalledWith(
        expect.anything(),
        ["inside-1", "inside-2"]
      );
    });

    it("deselects already selected annotations with preview", () => {
      expect(wrapper.emitted("annotationSelectionPreview")).toStrictEqual([
        [
          {
            annotationId: "ann-inside-1",
            type: "hide",
          },
        ],
        [
          {
            annotationId: "ann-inside-2",
            type: "hide",
          },
        ],
      ]);
    });

    it("pointerup clears selection preview for annotations", () => {
      pointerUp();

      expect(
        wrapper.emitted("annotationSelectionPreview").slice(2)
      ).toStrictEqual([
        [
          {
            annotationId: "ann-inside-1",
            type: null,
          },
        ],
        [
          {
            annotationId: "ann-inside-2",
            type: null,
          },
        ],
      ]);
    });

    it("pointerup deselects annotations", () => {
      pointerUp();

      expect(
        storeConfig.selection.actions.selectAnnotations
      ).not.toHaveBeenCalled();
      expect(
        storeConfig.selection.actions.deselectAnnotations
      ).toHaveBeenCalledWith(expect.anything(), [
        "ann-inside-1",
        "ann-inside-2",
      ]);
    });
  });

  describe("selection with shift", () => {
    it("adds nodes to selection with shift", async () => {
      storeConfig.selection.getters.selectedNodeIds = vi
        .fn()
        .mockReturnValue(["root:1"]);
      doShallowMount();

      pointerDown({ clientX: 0, clientY: 0, shiftKey: true });
      pointerMove({ clientX: 36, clientY: 36 });
      await Vue.nextTick();

      expect(wrapper.emitted("nodeSelectionPreview")).toStrictEqual([
        [
          {
            nodeId: "inside-1",
            type: "show",
          },
        ],
        [
          {
            nodeId: "inside-2",
            type: "show",
          },
        ],
      ]);

      pointerUp();
      expect(storeConfig.selection.actions.selectNodes).toHaveBeenCalledWith(
        expect.anything(),
        ["inside-1", "inside-2"]
      );
    });

    it("adds annotations to selection with shift", async () => {
      storeConfig.selection.getters.selectedAnnotationIds = vi
        .fn()
        .mockReturnValue(["root:1"]);
      doShallowMount();

      pointerDown({ clientX: 0, clientY: 0, shiftKey: true });
      pointerMove({ clientX: 36, clientY: 36 });
      await Vue.nextTick();

      expect(wrapper.emitted("annotationSelectionPreview")).toStrictEqual([
        [
          {
            annotationId: "ann-inside-1",
            type: "show",
          },
        ],
        [
          {
            annotationId: "ann-inside-2",
            type: "show",
          },
        ],
      ]);

      pointerUp();
      expect(
        storeConfig.selection.actions.selectAnnotations
      ).toHaveBeenCalledWith(expect.anything(), [
        "ann-inside-1",
        "ann-inside-2",
      ]);
    });
  });

  describe("non actions", () => {
    it("unregister events on beforeUnmount", () => {
      vi.spyOn($bus, "off");
      doShallowMount();
      wrapper.vm.$parent.$off = vi.fn();
      wrapper.unmount();
      expect($bus.off).toHaveBeenCalledTimes(4);
    });

    it("does nothing if move is called but selection is not active", async () => {
      doShallowMount();
      // pointerDown is missing
      pointerMove({ clientX: 300, clientY: 300 });
      await Vue.nextTick();
      pointerUp();
      expect(wrapper.emitted("nodeSelectionPreview")).toBeFalsy();
      expect(wrapper.emitted("annotationSelectionPreview")).toBeFalsy();
      expect(storeConfig.selection.actions.selectNodes).toHaveBeenCalledTimes(
        0
      );
      expect(
        storeConfig.selection.actions.selectAnnotations
      ).toHaveBeenCalledTimes(0);
    });

    it("does nothing if pointerId is different", async () => {
      doShallowMount();
      pointerId = 22;
      pointerDown({ clientX: 300, clientY: 300 });
      pointerId = 3;
      pointerMove({ clientX: 300, clientY: 300 });
      await Vue.nextTick();
      pointerUp();
      expect(wrapper.emitted("nodeSelectionPreview")).toBeFalsy();
      expect(wrapper.emitted("annotationSelectionPreview")).toBeFalsy();
      expect(storeConfig.selection.actions.selectNodes).toHaveBeenCalledTimes(
        0
      );
      expect(
        storeConfig.selection.actions.selectAnnotations
      ).toHaveBeenCalledTimes(0);
    });
  });
});
