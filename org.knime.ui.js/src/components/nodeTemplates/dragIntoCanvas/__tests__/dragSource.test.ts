import { afterEach, describe, expect, it, vi } from "vitest";

import { createNodeTemplateWithExtendedPorts } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import { useDragSource } from "../dragSource";
import { useSharedState } from "../state";

describe("dragSource", () => {
  afterEach(() => {
    vi.resetModules();
  });

  const setup = () => {
    const mockedStores = mockStores();

    const mockNodeTemplate = createNodeTemplateWithExtendedPorts();
    const dragSource = useDragSource();

    return { mockedStores, dragSource, mockNodeTemplate };
  };

  const createMockDragEvent = () => {
    return {
      target: {
        style: {},
      },
      dataTransfer: {
        setDragImage: vi.fn(),
        setData: vi.fn(),
      },
    } as unknown as DragEvent;
  };

  it("handles dragStart and dragEnd", () => {
    // DRAG START
    const { dragSource, mockNodeTemplate, mockedStores } = setup();
    const { draggedTemplateData, callbacks, dragTime } = useSharedState();

    const dragTimeResetSpy = vi.spyOn(dragTime, "reset");

    const mockEvent = createMockDragEvent();
    const fakeElement = document.createElement("div");
    const createDragGhost = vi.fn(() => ({
      element: fakeElement,
      size: { width: 30, height: 30 },
    }));

    const onNodeAdded = vi.fn();
    dragSource.onDragStart(mockEvent, mockNodeTemplate, {
      createDragGhost,
      onNodeAdded,
    });

    expect(createDragGhost).toHaveBeenCalled();
    expect(mockEvent.dataTransfer?.setDragImage).toHaveBeenCalledWith(
      fakeElement,
      15,
      15,
    );
    expect(draggedTemplateData.value).toEqual(mockNodeTemplate);
    expect(
      mockedStores.canvasAnchoredComponentsStore.closeAllAnchoredMenus,
    ).toHaveBeenCalled();

    expect(onNodeAdded).not.toHaveBeenCalled();
    callbacks.trigger("onNodeAdded", { type: "node", newNodeId: "root:1" });
    expect(onNodeAdded).toHaveBeenCalled();
    expect(dragTimeResetSpy).not.toHaveBeenCalled();

    // DRAG END

    dragSource.onDragEnd(mockEvent);

    expect(dragTimeResetSpy).toHaveBeenCalled();
  });
});
