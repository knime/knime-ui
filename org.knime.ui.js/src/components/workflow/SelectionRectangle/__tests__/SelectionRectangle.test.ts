/* eslint-disable max-lines */
import { expect, describe, afterEach, it, vi, type Mock } from "vitest";
import * as Vue from "vue";
import { shallowMount } from "@vue/test-utils";
import { mockVuexStore } from "@/test/utils/mockVuexStore";

import { $bus } from "@/plugins/event-bus";
import * as $shapes from "@/style/shapes";
import * as $colors from "@/style/colors";

import { findObjectsForSelection } from "../findObjectsForSelection";
import SelectionRectangle from "../SelectionRectangle.vue";

vi.mock("../findObjectsForSelection", () => ({
  findObjectsForSelection: vi.fn(),
}));

const findObjectsForSelectionMock = findObjectsForSelection as Mock<
  Parameters<typeof findObjectsForSelection>,
  ReturnType<typeof findObjectsForSelection>
>;

describe("SelectionRectangle", () => {
  const doMount = ({
    props = {},
    selectedNodeIds = vi.fn(() => []),
    selectedAnnotationIds = vi.fn(() => []),
    selectedBendpointIds = vi.fn(() => []),
  } = {}) => {
    findObjectsForSelectionMock.mockReturnValue({
      nodesInside: ["inside-1", "inside-2"],
      nodesOutside: ["outside-1", "outside-2"],
      annotationsInside: ["ann-inside-1", "ann-inside-2"],
      annotationsOutside: ["ann-outside-1", "ann-outside-2"],
      bendpointsInside: ["connection1__0"],
      bendpointsOutside: [],
    });

    const workflow = { nodes: {} };

    const storeConfig = {
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
          selectedNodeIds,
          selectedAnnotationIds,
          selectedBendpointIds,
        },
        actions: {
          selectNodes: vi.fn(),
          deselectNodes: vi.fn(),
          deselectAllObjects: vi.fn(),
          selectAnnotations: vi.fn(),
          deselectAnnotations: vi.fn(),
          selectBendpoints: vi.fn(),
          deselectBendpoints: vi.fn(),
        },
        mutations: {
          setDidStartRectangleSelection: vi.fn(),
        },
      },
    };

    const $store = mockVuexStore(storeConfig);
    const wrapper = shallowMount(SelectionRectangle, {
      props,
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

    const pointerDown = ({
      clientX,
      clientY,
      shiftKey = false,
      pointerId = null,
    }) => {
      $bus.emit("selection-pointerdown", {
        pointerId: pointerId || 1,
        clientX,
        clientY,
        shiftKey,
        currentTarget: {
          // @ts-expect-error
          getBoundingClientRect: () => ({
            left: 0,
            top: 0,
          }),
        },
        target: {
          // @ts-expect-error
          setPointerCapture: () => null,
        },
      });
    };

    const pointerMove = ({ clientX, clientY, pointerId = null }) => {
      $bus.emit("selection-pointermove", {
        pointerId: pointerId || 1,
        clientX,
        clientY,
        currentTarget: {
          // @ts-expect-error
          getBoundingClientRect: () => ({
            left: 0,
            top: 0,
          }),
        },
      });
    };

    const pointerUp = ({ pointerId = null } = {}) => {
      vi.useFakeTimers(); // implementation contains setTimout

      // stop also changes global dragging state
      $bus.emit("selection-pointerup", {
        pointerId: pointerId || 1,
        target: {
          // @ts-expect-error
          releasePointerCapture: vi.fn(),
        },
      });

      vi.runAllTimers();
    };

    return {
      wrapper,
      pointerDown,
      pointerMove,
      pointerUp,
      $store,
      storeConfig,
      workflow,
    };
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("all object are deselected on start", async () => {
    const { pointerDown, storeConfig } = doMount();

    pointerDown({ clientX: 0, clientY: 0 });
    await Vue.nextTick();

    expect(storeConfig.selection.actions.deselectAllObjects).toBeCalled();
  });

  it("appears on pointerDown, disappears on pointerUp", async () => {
    const { pointerDown, pointerUp, wrapper } = doMount();
    expect(wrapper.isVisible()).toBe(false);

    pointerDown({ clientX: 0, clientY: 0 });
    await Vue.nextTick();

    expect(wrapper.isVisible()).toBe(true);

    pointerUp();
    await Vue.nextTick();

    expect(wrapper.isVisible()).toBe(false);
  });

  describe("selection", () => {
    const mountAndSelect = async () => {
      const mountResult = doMount();

      mountResult.pointerDown({ clientX: 10, clientY: 10 });
      mountResult.pointerMove({ clientX: 300, clientY: 300 });
      await Vue.nextTick();

      return mountResult;
    };

    it("correctly uses algorithm to find included and excluded items", async () => {
      const { workflow } = await mountAndSelect();
      expect(findObjectsForSelectionMock).toHaveBeenCalledWith({
        startPos: { x: 10, y: 10 },
        endPos: { x: 300, y: 300 },
        workflow,
      });
    });

    it("shows selection preview for included nodes", async () => {
      const { wrapper } = await mountAndSelect();
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
      const { wrapper, pointerMove } = await mountAndSelect();
      // move those nodes out of selection
      findObjectsForSelectionMock.mockReturnValue({
        nodesInside: [],
        nodesOutside: ["inside-1", "inside-2"],
        annotationsInside: [],
        annotationsOutside: [],
        bendpointsInside: [],
        bendpointsOutside: [],
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

    it("selects nodes on pointer up", async () => {
      const { pointerUp, storeConfig } = await mountAndSelect();
      pointerUp();

      expect(storeConfig.selection.actions.selectNodes).toHaveBeenCalledWith(
        expect.anything(),
        ["inside-1", "inside-2"],
      );
    });

    it("shows selection preview for included annotations", async () => {
      const { wrapper } = await mountAndSelect();
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
      const { wrapper, pointerMove } = await mountAndSelect();
      findObjectsForSelectionMock.mockReturnValue({
        nodesInside: [],
        nodesOutside: [],
        annotationsInside: [],
        annotationsOutside: ["ann-inside-1", "ann-inside-2"],
        bendpointsInside: [],
        bendpointsOutside: [],
      });
      pointerMove({ clientX: 0, clientY: 0 });
      await Vue.nextTick();

      const selectionPreviewEvents = wrapper.emitted(
        "annotationSelectionPreview",
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

    it("selects annotations on pointer up", async () => {
      const { pointerUp, storeConfig } = await mountAndSelect();
      pointerUp();

      expect(
        storeConfig.selection.actions.selectAnnotations,
      ).toHaveBeenCalledWith(expect.anything(), [
        "ann-inside-1",
        "ann-inside-2",
      ]);
    });

    it("sets didStartRectangleSelection to true when rectangle selection updates", async () => {
      const { pointerDown, pointerMove, storeConfig } = await mountAndSelect();
      pointerDown({ clientX: 10, clientY: 10 });
      pointerMove({ clientX: 300, clientY: 300 });
      await Vue.nextTick();

      expect(
        storeConfig.selection.mutations.setDidStartRectangleSelection,
      ).toHaveBeenCalledWith(expect.anything(), true);
    });

    it("sets didStartRectangleSelection to false when rectangle selection ends", async () => {
      const { pointerDown, pointerMove, pointerUp, storeConfig } =
        await mountAndSelect();
      pointerDown({ clientX: 10, clientY: 10 });
      pointerMove({ clientX: 300, clientY: 300 });
      await Vue.nextTick();
      pointerUp();

      expect(
        storeConfig.selection.mutations.setDidStartRectangleSelection,
      ).toHaveBeenCalledWith(expect.anything(), false);
    });
  });

  describe("de-Selection with Shift", () => {
    const mountAndSelect = async () => {
      const mountResult = doMount({
        selectedNodeIds: vi.fn(() => ["inside-1", "inside-2"]),
        selectedAnnotationIds: vi.fn(() => ["ann-inside-1", "ann-inside-2"]),
        selectedBendpointIds: vi.fn(() => ["connection1__0"]),
      });

      mountResult.pointerDown({ clientX: 0, clientY: 0, shiftKey: true });
      mountResult.pointerMove({ clientX: 0, clientY: 0 });

      await Vue.nextTick();

      return mountResult;
    };

    it("no global deselection", async () => {
      const { storeConfig } = await mountAndSelect();
      expect(
        storeConfig.selection.actions.deselectAllObjects,
      ).not.toHaveBeenCalled();
    });

    describe("nodes", () => {
      it("deselects already selected nodes with preview", async () => {
        const { wrapper } = await mountAndSelect();

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

      it("pointerup clears selection preview for nodes", async () => {
        const { wrapper, pointerUp } = await mountAndSelect();
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

      it("pointerup deselects nodes", async () => {
        const { pointerUp, storeConfig } = await mountAndSelect();
        pointerUp();

        expect(
          storeConfig.selection.actions.selectNodes,
        ).not.toHaveBeenCalled();
        expect(
          storeConfig.selection.actions.deselectNodes,
        ).toHaveBeenCalledWith(expect.anything(), ["inside-1", "inside-2"]);
      });
    });

    describe("annotations", () => {
      it("deselects already selected annotations with preview", async () => {
        const { wrapper } = await mountAndSelect();
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

      it("pointerup clears selection preview for annotations", async () => {
        const { wrapper, pointerUp } = await mountAndSelect();
        pointerUp();

        expect(
          wrapper.emitted("annotationSelectionPreview").slice(2),
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

      it("pointerup deselects annotations", async () => {
        const { pointerUp, storeConfig } = await mountAndSelect();
        pointerUp();

        expect(
          storeConfig.selection.actions.selectAnnotations,
        ).not.toHaveBeenCalled();
        expect(
          storeConfig.selection.actions.deselectAnnotations,
        ).toHaveBeenCalledWith(expect.anything(), [
          "ann-inside-1",
          "ann-inside-2",
        ]);
      });
    });
  });

  describe("selection with shift", () => {
    it("adds nodes to selection with shift", async () => {
      const { storeConfig, pointerDown, pointerMove, pointerUp, wrapper } =
        doMount({
          selectedNodeIds: vi.fn(() => ["root:1"]),
        });

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
        ["inside-1", "inside-2"],
      );
    });

    it("adds annotations to selection with shift", async () => {
      const { storeConfig, pointerDown, pointerMove, pointerUp, wrapper } =
        doMount({
          selectedAnnotationIds: vi.fn(() => ["root:1"]),
        });

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
        storeConfig.selection.actions.selectAnnotations,
      ).toHaveBeenCalledWith(expect.anything(), [
        "ann-inside-1",
        "ann-inside-2",
      ]);
    });
  });

  describe("non actions", () => {
    it("unregister events on beforeUnmount", () => {
      const $bussOffSpy = vi.spyOn($bus, "off");
      const { wrapper } = doMount();
      // @ts-ignore
      wrapper.vm.$parent.$off = vi.fn();
      wrapper.unmount();
      expect($bussOffSpy).toHaveBeenCalledTimes(4);
    });

    it("does nothing if move is called but selection is not active", async () => {
      const { wrapper, pointerMove, pointerUp, storeConfig } = doMount();
      // pointerDown is missing
      pointerMove({ clientX: 300, clientY: 300 });
      await Vue.nextTick();
      pointerUp();
      expect(wrapper.emitted("nodeSelectionPreview")).toBeFalsy();
      expect(wrapper.emitted("annotationSelectionPreview")).toBeFalsy();
      expect(storeConfig.selection.actions.selectNodes).toHaveBeenCalledTimes(
        0,
      );
      expect(
        storeConfig.selection.actions.selectAnnotations,
      ).toHaveBeenCalledTimes(0);
    });

    it("does nothing if pointerId is different", async () => {
      const { wrapper, pointerDown, pointerMove, pointerUp, storeConfig } =
        doMount();

      pointerDown({ clientX: 300, clientY: 300, pointerId: 22 });
      pointerMove({ clientX: 300, clientY: 300, pointerId: 3 });
      await Vue.nextTick();
      pointerUp();
      expect(wrapper.emitted("nodeSelectionPreview")).toBeFalsy();
      expect(wrapper.emitted("annotationSelectionPreview")).toBeFalsy();
      expect(storeConfig.selection.actions.selectNodes).toHaveBeenCalledTimes(
        0,
      );
      expect(
        storeConfig.selection.actions.selectAnnotations,
      ).toHaveBeenCalledTimes(0);
    });
  });
});
