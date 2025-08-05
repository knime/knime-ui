import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";
import { onClickOutside } from "@vueuse/core";

import { CANVAS_ANCHOR_WRAPPER_ID } from "@/components/workflowEditor/CanvasAnchoredComponents";
import { mountComposable } from "@/test/utils/mountComposable";
import { useCanvasClickOutside } from "../useCanvasClickOutside";

let triggerClickOutside: (() => void) | undefined;

vi.mock("@vueuse/core", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    // @ts-expect-error
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

describe("useCanvasClickOutside", () => {
  const doMount = ({
    focusTrap,
    ignoreCssSelectors,
    ignoreCanvasEvents,
  }: {
    focusTrap?: boolean;
    ignoreCssSelectors?: Array<string>;
    ignoreCanvasEvents?: (event: PointerEvent) => boolean;
  } = {}) => {
    const mockRootEl = ref(document.createElement("div"));
    const onClickOutside = vi.fn();
    const result = mountComposable({
      composable: useCanvasClickOutside,
      composableProps: {
        rootEl: mockRootEl,
        focusTrap: ref(focusTrap ?? false),
        ignoreCssSelectors,
        ignoreCanvasEvents,
        onClickOutside,
      },
    });

    return { ...result, mockRootEl, onClickOutsideCallback: onClickOutside };
  };

  afterEach(() => {
    triggerClickOutside = undefined;
    vi.clearAllMocks();
  });

  it("should register a click outside", async () => {
    vi.useFakeTimers();
    const { lifeCycle, mockRootEl, onClickOutsideCallback } = doMount();

    expect(vi.mocked(onClickOutside)).not.toHaveBeenCalled();

    vi.runAllTimers();
    await nextTick();

    expect(vi.mocked(onClickOutside)).toHaveBeenCalledWith(
      mockRootEl,
      expect.any(Function),
      { ignore: [kanvas], capture: true },
    );
    expect(onClickOutsideCallback).not.toHaveBeenCalled();

    triggerClickOutside?.();
    expect(onClickOutsideCallback).toHaveBeenCalled();

    lifeCycle.unmount();
  });

  it("should handle canvas as a special click outside target", async () => {
    vi.useFakeTimers();
    const { onClickOutsideCallback } = doMount();

    vi.runAllTimers();
    await nextTick();

    const mockEventTarget = document.createElement("span");
    mockCanvasAnchorWrapper.appendChild(mockEventTarget);

    const event1 = new PointerEvent("pointerdown");
    // @ts-expect-error see MockPointerEvent in test setup file
    event1.overrideTarget = mockEventTarget;
    kanvas.dispatchEvent(event1);

    // ignores children of the anchored container
    expect(onClickOutsideCallback).not.toHaveBeenCalled();

    const event2 = new PointerEvent("pointerdown");
    kanvas.dispatchEvent(event2);

    // click outside for anything else
    expect(onClickOutsideCallback).toHaveBeenCalled();
  });

  it("should pass the list of ignored elements to onClickOutside", async () => {
    vi.useFakeTimers();
    const { lifeCycle, mockRootEl } = doMount({
      ignoreCssSelectors: [".ignored-element"],
    });

    expect(vi.mocked(onClickOutside)).not.toHaveBeenCalled();

    vi.runAllTimers();
    await nextTick();

    expect(vi.mocked(onClickOutside)).toHaveBeenCalledWith(
      mockRootEl,
      expect.any(Function),
      { ignore: [kanvas, ".ignored-element"], capture: true },
    );

    lifeCycle.unmount();
  });

  it("should ignore canvas events based on initiator", async () => {
    vi.useFakeTimers();
    const { onClickOutsideCallback } = doMount({
      ignoreCanvasEvents: (event) =>
        event.dataset?.initiator === "ignored-initiator",
    });

    vi.runAllTimers();
    await nextTick();

    const mockEventTarget = document.createElement("span");
    mockCanvasAnchorWrapper.appendChild(mockEventTarget);

    const event = new PointerEvent("pointerdown");
    event.dataset = { initiator: "ignored-initiator" };
    kanvas.dispatchEvent(event);

    expect(onClickOutsideCallback).not.toHaveBeenCalled();
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
