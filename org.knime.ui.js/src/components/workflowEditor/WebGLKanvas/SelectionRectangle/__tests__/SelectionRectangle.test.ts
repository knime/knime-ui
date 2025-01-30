import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

import { findObjectsForSelection } from "@/components/workflowEditor/util/findObjectsForSelection";
import { $bus } from "@/plugins/event-bus";
import { createWorkflow } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import SelectionRectangle from "../SelectionRectangle.vue";

vi.mock("@/components/workflowEditor/util/findObjectsForSelection", () => ({
  findObjectsForSelection: vi.fn(),
}));

const findObjectsForSelectionMock = vi.mocked(findObjectsForSelection);
findObjectsForSelectionMock.mockReturnValue({
  nodesInside: ["root:1"],
  nodesOutside: ["root:2"],
  annotationsInside: [],
  annotationsOutside: [],
  bendpointsInside: [],
  bendpointsOutside: [],
});

describe("SelectionRectangle.vue", () => {
  const doMount = () => {
    const mockedStores = mockStores();
    const wrapper = mount(SelectionRectangle, {
      global: {
        plugins: [mockedStores.testingPinia],
      },
    });

    const busEmitSpy = vi.spyOn($bus, "emit");

    mockedStores.workflowStore.setActiveWorkflow(createWorkflow());

    return { wrapper, mockedStores, busEmitSpy };
  };

  const triggerSelection = (
    mockedStores: ReturnType<typeof mockStores>,
    endSelection = true,
  ) => {
    mockedStores.webglCanvasStore.canvasOffset = { x: 10, y: 10 };
    mockedStores.webglCanvasStore.zoomFactor = 1;

    const ptrDown = new PointerEvent("pointerdown");
    // @ts-ignore
    ptrDown.offsetX = 20;
    // @ts-ignore
    ptrDown.offsetY = 20;

    $bus.emit("selection-pointerdown", ptrDown);

    const ptrMove = new PointerEvent("pointermove");
    // @ts-ignore
    ptrMove.offsetX = 80;
    // @ts-ignore
    ptrMove.offsetY = 80;

    $bus.emit("selection-pointermove", ptrMove);

    if (endSelection) {
      $bus.emit("selection-pointerup", ptrMove);
    }
  };

  it("should not get called if use is dragging", () => {
    const { mockedStores, busEmitSpy } = doMount();

    mockedStores.movingStore.isDragging = true;

    triggerSelection(mockedStores);
    expect(
      mockedStores.selectionStore.deselectAllObjects,
    ).not.toHaveBeenCalled();

    expect(findObjectsForSelectionMock).not.toHaveBeenCalled();

    expect(busEmitSpy).not.toHaveBeenCalledWith(
      "node-selection-preview-root:1",
      {
        id: "root:1",
        preview: "show",
      },
    );
    expect(busEmitSpy).not.toHaveBeenCalledWith(
      "node-selection-preview-root:2",
      {
        id: "root:2",
        preview: "hide",
      },
    );

    expect(mockedStores.selectionStore.selectNodes).not.toHaveBeenCalled();
  });

  it("should search for objects inside selection and update selection preview", () => {
    const { mockedStores, busEmitSpy } = doMount();

    mockedStores.webglCanvasStore.canvasOffset = { x: 10, y: 10 };
    mockedStores.webglCanvasStore.zoomFactor = 1;

    triggerSelection(mockedStores);
    expect(mockedStores.selectionStore.deselectAllObjects).toHaveBeenCalled();

    expect(findObjectsForSelectionMock).toHaveBeenCalledWith({
      startPos: { x: 10, y: 10 },
      endPos: { x: 70, y: 70 },
      workflow: mockedStores.workflowStore.activeWorkflow,
    });

    expect(busEmitSpy).toHaveBeenCalledWith("node-selection-preview-root:1", {
      id: "root:1",
      preview: "show",
    });
    expect(busEmitSpy).toHaveBeenCalledWith("node-selection-preview-root:2", {
      id: "root:2",
      preview: "hide",
    });
  });

  it("should select the found objects inside the selection", () => {
    const { mockedStores, busEmitSpy } = doMount();

    mockedStores.webglCanvasStore.canvasOffset = { x: 10, y: 10 };
    mockedStores.webglCanvasStore.zoomFactor = 1;

    triggerSelection(mockedStores);

    expect(mockedStores.selectionStore.selectNodes).toHaveBeenCalledWith([
      "root:1",
    ]);

    expect(busEmitSpy).toHaveBeenCalledWith("node-selection-preview-root:1", {
      id: "root:1",
      preview: null,
    });

    expect(mockedStores.selectionStore.deselectNodes).toHaveBeenCalledWith([
      "root:2",
    ]);

    expect(busEmitSpy).toHaveBeenCalledWith("node-selection-preview-root:2", {
      id: "root:2",
      preview: null,
    });
  });
});
