/* eslint-disable func-style */
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";

import { useEscapeStack } from "@/composables/useEscapeStack";
import { mockStores } from "@/test/utils/mockStores";
import { mountComposable } from "@/test/utils/mountComposable";
import { useCanvasFloatingContainer } from "../useCanvasFloatingContainer";

vi.mock("@/composables/useEscapeStack", () => {
  function useEscapeStack({ onEscape }) {
    // @ts-ignore
    useEscapeStack.onEscape = onEscape;
    return {
      /* empty mixin */
    };
  }

  return { useEscapeStack };
});

const useFocusTrapMock = {
  activate: vi.fn(),
  deactivate: vi.fn(),
};

vi.mock("@vueuse/integrations/useFocusTrap", () => {
  return {
    useFocusTrap: () => useFocusTrapMock,
  };
});

describe("useCanvasFloatingContainer", () => {
  const doMount = ({ focusTrap = false, disableInteractions = false } = {}) => {
    const mockedStores = mockStores();

    const closeMenu = vi.fn();
    const mountResult = mountComposable({
      composable: useCanvasFloatingContainer,
      composableProps: {
        closeMenu,
        rootEl: ref(document.createElement("div")),
        focusTrap: ref(focusTrap),
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
    // @ts-ignore
    useEscapeStack.onEscape();
    expect(closeMenu).toHaveBeenCalled();
  });

  it("uses focus trap if prop is true", async () => {
    doMount({ focusTrap: true });
    await new Promise((r) => setTimeout(r, 0));
    expect(useFocusTrapMock.activate).toHaveBeenCalled();
  });

  it("does not use focus trap if prop is false", async () => {
    doMount({ focusTrap: false });
    await new Promise((r) => setTimeout(r, 0));
    expect(useFocusTrapMock.activate).not.toHaveBeenCalled();
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
