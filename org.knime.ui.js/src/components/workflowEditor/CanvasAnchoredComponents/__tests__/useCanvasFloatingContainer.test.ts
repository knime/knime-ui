/* eslint-disable func-style */
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";

import { useEscapeStack } from "@/composables/useEscapeStack";
import { mockStores } from "@/test/utils/mockStores";
import { mountComposable } from "@/test/utils/mountComposable";
import { useCanvasFloatingContainer } from "../useCanvasFloatingContainer";

vi.mock("@/composables/useEscapeStack", () => {
  function useEscapeStack({ onEscape }) {
    // @ts-expect-error
    useEscapeStack.onEscape = onEscape;
    return {
      /* empty mixin */
    };
  }

  return { useEscapeStack };
});

describe("useCanvasFloatingContainer", () => {
  const doMount = ({ disableInteractions = false } = {}) => {
    const mockedStores = mockStores();

    const closeMenu = vi.fn();
    const mountResult = mountComposable({
      composable: useCanvasFloatingContainer,
      composableProps: {
        closeMenu,
        rootEl: ref(document.createElement("div")),
        disableInteractions,
        canvasStore: mockedStores.canvasStore,
      },
      mockedStores,
    });

    return { closeMenu, mockedStores, ...mountResult };
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("closes menu on escape key", () => {
    const { closeMenu } = doMount();
    // @ts-expect-error
    useEscapeStack.onEscape();
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
