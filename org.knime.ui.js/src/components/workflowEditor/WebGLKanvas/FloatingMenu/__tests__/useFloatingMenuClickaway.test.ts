import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";
import { onClickOutside } from "@vueuse/core";

import { CANVAS_ANCHOR_WRAPPER_ID } from "@/components/workflowEditor/CanvasAnchoredComponents";
import { mountComposable } from "@/test/utils/mountComposable";
import { useFloatingMenuClickaway } from "../useFloatingMenuClickaway";

let triggerClickOutside: (() => void) | undefined;

vi.mock("@vueuse/core", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    // @ts-ignore
    ...actual,
    onClickOutside: vi.fn((_, cb) => {
      triggerClickOutside = cb;
    }),
  };
});

const kanvas = document.createElement("kanvas");
const mockCanvasAnchorWrapper = document.createElement("div");
mockCanvasAnchorWrapper.id = CANVAS_ANCHOR_WRAPPER_ID;
kanvas.appendChild(mockCanvasAnchorWrapper);

vi.mock("@/util/getKanvasDomElement", () => ({
  getKanvasDomElement: () => kanvas,
}));

const useFocusTrapMock = {
  activate: vi.fn(),
  deactivate: vi.fn(),
};

vi.mock("@vueuse/integrations/useFocusTrap", () => {
  return {
    useFocusTrap: () => useFocusTrapMock,
  };
});

describe("useFloatingMenuClickaway", () => {
  const doMount = ({ focusTrap }: { focusTrap?: boolean } = {}) => {
    const mockRootEl = ref(document.createElement("div"));
    const onClickaway = vi.fn();
    const result = mountComposable({
      composable: useFloatingMenuClickaway,
      composableProps: {
        focusTrap: ref(focusTrap ?? false),
        onClickaway,
        rootEl: mockRootEl,
      },
    });

    return { ...result, mockRootEl, onClickawayCallback: onClickaway };
  };

  afterEach(() => {
    triggerClickOutside = undefined;
    vi.clearAllMocks();
  });

  it("should register clickaway", async () => {
    vi.useFakeTimers();
    const { lifeCycle, mockRootEl, onClickawayCallback } = doMount();

    expect(vi.mocked(onClickOutside)).not.toHaveBeenCalled();

    vi.runAllTimers();
    await nextTick();

    expect(vi.mocked(onClickOutside)).toHaveBeenCalledWith(
      mockRootEl,
      expect.any(Function),
      { ignore: [kanvas], capture: false },
    );
    expect(onClickawayCallback).not.toHaveBeenCalled();

    triggerClickOutside?.();
    expect(onClickawayCallback).toHaveBeenCalled();

    lifeCycle.unmount();
  });

  it("should handle canvas as a special clickaway target", async () => {
    vi.useFakeTimers();
    const { onClickawayCallback } = doMount();

    vi.runAllTimers();
    await nextTick();

    const event1 = new PointerEvent("pointerdown");
    // @ts-ignore - see MockPointerEvent in test setup file
    event1.defaultPrevented = true;
    kanvas.dispatchEvent(event1);

    // ignores events that were defaultPrevented
    expect(onClickawayCallback).not.toHaveBeenCalled();

    const mockEventTarget = document.createElement("span");
    mockCanvasAnchorWrapper.appendChild(mockEventTarget);

    const event2 = new PointerEvent("pointerdown");
    // @ts-ignore - see MockPointerEvent in test setup file
    event2.overrideTarget = mockEventTarget;
    kanvas.dispatchEvent(event2);

    // ignores children of the anchored container
    expect(onClickawayCallback).not.toHaveBeenCalled();

    const event3 = new PointerEvent("pointerdown");
    kanvas.dispatchEvent(event3);

    // clickaway for anything else
    expect(onClickawayCallback).toHaveBeenCalled();
  });

  it("uses focus trap if prop is true", async () => {
    vi.useFakeTimers();
    doMount({ focusTrap: true });

    vi.runAllTimers();
    await nextTick();
    await nextTick();
    expect(useFocusTrapMock.activate).toHaveBeenCalled();
  });

  it("does not use focus trap if prop is false", async () => {
    vi.useFakeTimers();
    doMount({ focusTrap: false });

    vi.runAllTimers();
    await nextTick();
    await nextTick();
    expect(useFocusTrapMock.activate).not.toHaveBeenCalled();
  });
});
