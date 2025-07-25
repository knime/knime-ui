import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";

import { mockStores } from "@/test/utils/mockStores";
import { mountComposable } from "@/test/utils/mountComposable";
import { useCanvasFloatingContainer } from "../useCanvasFloatingContainer";

describe("useCanvasFloatingContainer", () => {
  const doMount = ({ disableInteractions = false } = {}) => {
    const mockedStores = mockStores();

    const rootEl = ref(document.createElement("div"));

    const closeMenu = vi.fn();
    const mountResult = mountComposable({
      composable: useCanvasFloatingContainer,
      composableProps: {
        closeMenu,
        rootEl,
        disableInteractions,
        canvasStore: mockedStores.canvasStore,
      },
      mockedStores,
    });

    return { closeMenu, mockedStores, ...mountResult, rootEl };
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("closes menu on escape key", () => {
    const { closeMenu, rootEl } = doMount();
    rootEl.value.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(closeMenu).toHaveBeenCalled();
  });

  it("closes menu if a node template is being dragged", async () => {
    const { mockedStores, closeMenu } = doMount();

    expect(closeMenu).not.toHaveBeenCalled();

    mockedStores.nodeTemplatesStore.isDraggingNodeTemplate = true;
    await nextTick();

    expect(closeMenu).toHaveBeenCalled();
  });

  it("closes menu when a node is dragged in the canvas", async () => {
    const { mockedStores, closeMenu } = doMount();

    expect(closeMenu).not.toHaveBeenCalled();

    mockedStores.movingStore.isDragging = true;
    await nextTick();

    expect(closeMenu).toHaveBeenCalled();
  });

  it("enables/disables interactions", () => {
    const { mockedStores, lifeCycle } = doMount({ disableInteractions: true });
    expect(
      mockedStores.canvasStore.setInteractionsEnabled,
    ).toHaveBeenCalledWith(false);
    lifeCycle.unmount();

    expect(
      mockedStores.canvasStore.setInteractionsEnabled,
    ).toHaveBeenCalledWith(true);
  });
});
