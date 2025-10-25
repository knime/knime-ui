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

const startPos = { x: 0, y: 0 };
const endPos = { x: 100, y: 100 };

describe("SelectionRectangle.vue", () => {
  const doMount = (
    selectedNodeIds: string[] = [],
    selectedAnnotationIds: string[] = [],
  ) => {
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
      pointerId: 0,
    };
    const endEvent = { offsetX: endPos.x, offsetY: endPos.y, pointerId: 0 };

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

  it("does nothing if move is called but pointerDown is missing", async () => {
    const { wrapper, pointerMove, pointerUp, mockedStores } = doMount();
    await pointerMove();
    await pointerUp();

    expect(wrapper.emitted("nodeSelectionPreview")).toBeFalsy();
    expect(wrapper.emitted("annotationSelectionPreview")).toBeFalsy();
    expect(mockedStores.selectionStore.selectNodes).toHaveBeenCalledTimes(0);
    expect(mockedStores.selectionStore.selectAnnotations).toHaveBeenCalledTimes(
      0,
    );
  });
});
