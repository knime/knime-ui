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

    return {
      wrapper,
      pointerDown,
      mockedStores,
      selectionStore: mockedStores.selectionStore,
      workflow,
    };
  };

  beforeEach(vi.clearAllMocks);

  describe("selection discard", () => {
    it("deselects everything if selection discard attempt IS NOT aborted", async () => {
      const { pointerDown, mockedStores } = doMount();
      vi.mocked(
        mockedStores.selectionStore.canClearCurrentSelection,
      ).mockReturnValue(false);
      vi.mocked(
        mockedStores.selectionStore.tryClearSelection,
      ).mockResolvedValue({ wasAborted: false, didPrompt: true });
      await pointerDown();
      await flushPromises();

      expect(mockedStores.selectionStore.deselectAllObjects).toHaveBeenCalled();
    });

    it("doesn't deselect everything if selection discard attempt IS aborted", async () => {
      const { pointerDown, mockedStores } = doMount();
      vi.mocked(
        mockedStores.selectionStore.canClearCurrentSelection,
      ).mockReturnValue(false);
      vi.mocked(
        mockedStores.selectionStore.tryClearSelection,
      ).mockResolvedValue({ wasAborted: true, didPrompt: true });
      await pointerDown();
      await flushPromises();

      expect(
        mockedStores.selectionStore.deselectAllObjects,
      ).not.toHaveBeenCalled();
    });
  });
});
