import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import { $bus } from "@/plugins/event-bus";
import {
  createNativeNode,
  createWorkflow,
  createWorkflowAnnotation,
} from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import SelectionRectangle from "../SelectionRectangle.vue";

const findObjectsForSelectionMock = vi.hoisted(() => vi.fn());

vi.mock("@/components/workflowEditor/util/findObjectsForSelection", () => ({
  findObjectsForSelection: findObjectsForSelectionMock,
}));

const node1 = createNativeNode({ id: "root:1" });
const node2 = createNativeNode({ id: "root:2" });
const annotation1 = createWorkflowAnnotation({
  id: "anno1602",
  text: { value: "Annotation text" },
});
const annotation2 = createWorkflowAnnotation({
  id: "anno1603",
  text: { value: "Annotation text 2" },
});

const nodesInside = [node1.id, node2.id];
const nodesOutside = ["outside-1", "outside-2"];
const annotationsInside = [annotation1.id, annotation2.id];
const annotationsOutside = ["ann-outside-1", "ann-outside-2"];

const startPos = { x: 0, y: 0 };
const endPos = { x: 100, y: 100 };

describe("SelectionRectangle.vue", () => {
  const doMount = (
    selectedNodeIds: string[] = [],
    selectedAnnotationIds: string[] = [],
  ) => {
    findObjectsForSelectionMock.mockReturnValue({
      nodesInside,
      nodesOutside,
      annotationsInside,
      annotationsOutside,
    });

    const workflow = createWorkflow({
      nodes: { [node1.id]: node1, [node2.id]: node2 },
      connections: {},
      workflowAnnotations: [annotation1, annotation2],
    });

    const mockedStores = mockStores();
    // @ts-expect-error
    mockedStores.selectionStore.selectedNodeIds = selectedNodeIds;
    // @ts-expect-error
    mockedStores.selectionStore.selectedAnnotationIds = selectedAnnotationIds;
    // @ts-expect-error

    mockedStores.canvasStore.screenToCanvasCoordinates = vi
      .fn()
      .mockImplementation(([x, y]) => [x, y]);

    mockedStores.webglCanvasStore.canvasOffset = { x: 0, y: 0 };
    mockedStores.webglCanvasStore.zoomFactor = 1;

    mockedStores.workflowStore.setActiveWorkflow(workflow);

    const wrapper = mount(SelectionRectangle, {
      global: {
        plugins: [mockedStores.testingPinia],
      },
    });
    const startEvent = {
      offsetX: startPos.x,
      offsetY: startPos.y,
      shiftKey: false,
      pointerId: 1,
    };
    const endEvent = { offsetX: endPos.x, offsetY: endPos.y, pointerId: 1 };

    const pointerDown = async (event?: Partial<typeof startEvent>) => {
      $bus.emit("selection-pointerdown", {
        ...startEvent,
        ...event,
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
      await flushPromises();
      await nextTick();
    };

    const pointerMove = async (event?: Partial<typeof endEvent>) => {
      $bus.emit("selection-pointermove", {
        ...endEvent,
        ...event,
        currentTarget: {
          // @ts-expect-error
          getBoundingClientRect: () => ({
            left: 0,
            top: 0,
          }),
        },
      });
      await flushPromises();
      await nextTick();
    };

    const pointerUp = async (event?: Partial<typeof endEvent>) => {
      vi.useFakeTimers(); // implementation contains setTimout

      // stop also changes global dragging state
      $bus.emit("selection-pointerup", {
        ...endEvent,
        ...event,
        target: {
          // @ts-expect-error
          releasePointerCapture: vi.fn(),
          // @ts-expect-error
          hasPointerCapture: vi.fn(),
        },
      });

      vi.runAllTimers();
      await flushPromises();
      await nextTick();
    };

    return {
      wrapper,
      pointerDown,
      pointerMove,
      pointerUp,
      mockedStores,
      selectionStore: mockedStores.selectionStore,
      workflow,
    };
  };

  beforeEach(vi.clearAllMocks);

  it("appears on pointerDown, disappears on pointerUp", async () => {
    const { pointerDown, pointerUp, wrapper } = await doMount();
    expect(wrapper.isVisible()).toBe(false);

    await pointerDown();

    expect(wrapper.isVisible()).toBe(true);

    await pointerUp();
    await nextTick();

    expect(wrapper.isVisible()).toBe(false);
  });

  describe("selection", () => {
    const mountAndSelect = async () => {
      const mountResult = doMount();

      await mountResult.pointerDown();
      await mountResult.pointerMove();
      await nextTick();

      return mountResult;
    };

    it("correctly uses algorithm to find included and excluded items", async () => {
      const { workflow } = await mountAndSelect();
      expect(findObjectsForSelectionMock).toHaveBeenCalledWith({
        startPos,
        endPos,
        workflow,
      });
    });

    it("shows selection preview for included nodes and annotations", async () => {
      const { selectionStore } = await mountAndSelect();

      expect(selectionStore.preselectionMode).toBe(true);
      expect(selectionStore.isNodePreselected(nodesInside[0])).toBe(true);
      expect(selectionStore.isNodePreselected(nodesInside[1])).toBe(true);

      expect(selectionStore.isAnnotationPreselected(annotationsInside[0])).toBe(
        true,
      );
      expect(selectionStore.isAnnotationPreselected(annotationsInside[1])).toBe(
        true,
      );

      expect(selectionStore.isNodePreselected(nodesOutside[0])).toBe(false);
      expect(selectionStore.isNodePreselected(nodesOutside[1])).toBe(false);

      expect(
        selectionStore.isAnnotationPreselected(annotationsOutside[0]),
      ).toBe(false);
      expect(
        selectionStore.isAnnotationPreselected(annotationsOutside[1]),
      ).toBe(false);
    });

    it("removes selection preview of previously selected nodes", async () => {
      const { pointerMove, selectionStore } = await mountAndSelect();
      findObjectsForSelectionMock.mockReturnValue({
        nodesInside: [],
        nodesOutside: nodesInside,
        annotationsInside: [],
        annotationsOutside: annotationsInside,
      });
      await pointerMove();

      expect(selectionStore.preselectionMode).toBe(true);
      expect(selectionStore.isNodePreselected(nodesInside[0])).toBe(false);
      expect(selectionStore.isNodePreselected(nodesInside[1])).toBe(false);

      expect(selectionStore.isAnnotationPreselected(annotationsInside[0])).toBe(
        false,
      );
      expect(selectionStore.isAnnotationPreselected(annotationsInside[1])).toBe(
        false,
      );
    });

    it("selects nodes and annotations on pointer up", async () => {
      const { pointerUp, selectionStore } = await mountAndSelect();
      await pointerUp();
      await flushPromises();

      expect(selectionStore.deselectAllObjects).toHaveBeenCalledWith(
        nodesInside,
      );

      expect(selectionStore.selectAnnotations).toHaveBeenCalledWith(
        annotationsInside,
      );
    });
  });

  describe("rectangle selection inverse mode, i.e. shift/ctrl", () => {
    const mountAndSelect = async () => {
      const mountResult = doMount(nodesInside, annotationsInside);

      await mountResult.pointerDown({ shiftKey: true });
      await mountResult.pointerMove();
      await mountResult.pointerMove();
      await nextTick();

      return mountResult;
    };

    it("deselects already selected nodes and annotations with preview", async () => {
      const { selectionStore } = await mountAndSelect();

      expect(selectionStore.preselectionMode).toBe(true);
      expect(selectionStore.isNodePreselected(nodesInside[0])).toBe(false);
      expect(selectionStore.isNodePreselected(nodesInside[1])).toBe(false);

      expect(selectionStore.isAnnotationPreselected(annotationsInside[0])).toBe(
        false,
      );
      expect(selectionStore.isAnnotationPreselected(annotationsInside[1])).toBe(
        false,
      );
    });

    it("pointerup deselects nodes", async () => {
      const { selectionStore, pointerUp, pointerMove } = await mountAndSelect();

      await pointerMove();
      await pointerUp();

      expect(selectionStore.preselectionMode).toBe(false);
      expect(selectionStore.deselectAllObjects).toHaveBeenCalledWith([]);
      expect(selectionStore.selectAnnotations).toHaveBeenCalledWith([]);
    });
  });

  describe("selection with shift", () => {
    it("adds nodes to selection with shift", async () => {
      const someOtherNodeId = "some_other_node";
      const { mockedStores, pointerDown, pointerMove, pointerUp } = doMount(
        [someOtherNodeId],
        [],
      );

      await pointerDown({ shiftKey: true });
      await pointerMove();
      await pointerUp();

      expect(
        mockedStores.selectionStore.deselectAllObjects,
      ).toHaveBeenCalledWith(
        expect.arrayContaining([...nodesInside, someOtherNodeId]),
      );
    });

    it("adds annotations to selection with shift", async () => {
      const someOtherAnnotationId = "some_other_annotation";

      const { mockedStores, pointerDown, pointerMove, pointerUp } = doMount(
        [],
        [someOtherAnnotationId],
      );

      await pointerDown({ shiftKey: true });
      await pointerMove();
      await pointerUp();

      expect(
        mockedStores.selectionStore.selectAnnotations,
      ).toHaveBeenCalledWith(
        expect.arrayContaining([...annotationsInside, someOtherAnnotationId]),
      );
    });
  });

  describe("non actions", () => {
    it("unregister events on beforeUnmount", () => {
      const $bussOffSpy = vi.spyOn($bus, "off");
      const { wrapper } = doMount();
      // @ts-expect-error
      wrapper.vm.$parent.$off = vi.fn();
      wrapper.unmount();
      // pointer-down, pointer-move, pointer-up
      expect($bussOffSpy).toHaveBeenCalledTimes(3);
    });

    it("does nothing if move is called but pointerDown is missing", async () => {
      const { wrapper, pointerMove, pointerUp, mockedStores } = doMount();
      await pointerMove();
      await pointerUp();

      expect(wrapper.emitted("nodeSelectionPreview")).toBeFalsy();
      expect(wrapper.emitted("annotationSelectionPreview")).toBeFalsy();
      expect(mockedStores.selectionStore.selectNodes).toHaveBeenCalledTimes(0);
      expect(
        mockedStores.selectionStore.selectAnnotations,
      ).toHaveBeenCalledTimes(0);
    });

    it("does nothing if pointerId is different", async () => {
      const { pointerDown, pointerMove, pointerUp, mockedStores } = doMount();

      findObjectsForSelectionMock.mockClear();
      await pointerDown({ pointerId: 22 });
      expect(findObjectsForSelectionMock).toHaveBeenCalled();
      findObjectsForSelectionMock.mockClear();

      await pointerMove({ pointerId: 3 });
      expect(findObjectsForSelectionMock).not.toHaveBeenCalled();

      await pointerUp({ pointerId: 42 });

      expect(
        mockedStores.selectionStore.deselectAllObjects,
      ).not.toHaveBeenCalled();
      expect(
        mockedStores.selectionStore.selectAnnotations,
      ).not.toHaveBeenCalled();
    });
  });
});
