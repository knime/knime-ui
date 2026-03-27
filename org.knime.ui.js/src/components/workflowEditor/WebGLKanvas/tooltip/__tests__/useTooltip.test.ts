import { afterEach, describe, expect, it, vi } from "vitest";
import { computed, ref, shallowRef } from "vue";

import type { TooltipDefinition } from "@/components/workflowEditor/types";
import { mockStores } from "@/test/utils/mockStores";
import { mountComposable } from "@/test/utils/mountComposable";
import type { ContainerInst } from "@/vue3-pixi";
import { useTooltip } from "../useTooltip";

vi.useFakeTimers();

Object.defineProperty(document, "querySelectorAll", {
  writable: true,
  value: vi.fn().mockReturnValue([]),
});

const createMockElement = (): ContainerInst => {
  return {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as ContainerInst;
};

const createMockTooltip = (
  overrides: Partial<TooltipDefinition> = {},
): TooltipDefinition => ({
  position: { x: 10, y: 20 },
  gap: 5,
  text: "Test tooltip",
  hoverable: false,
  ...overrides,
});

const showSpy = vi.fn();
const hideSpy = vi.fn();

vi.mock(
  "@/components/workflowEditor/WebGLKanvas/tooltip/useTooltipState",
  () => ({
    useTooltipState: vi.fn().mockImplementation(() => ({
      show: showSpy,
      hide: hideSpy,
      isHoverableTooltipHovered: ref(false),
    })),
  }),
);

describe("useTooltip", () => {
  afterEach(() => {
    vi.clearAllTimers();
    vi.clearAllMocks();
  });

  const mountTooltipComposable = (
    mockConfig: TooltipDefinition | null = createMockTooltip(),
    mockElement: ContainerInst | null = createMockElement(),
  ) => {
    // const tooltipState = useTooltipState();
    // const hideSpy = vi.spyOn(tooltipState, "hide");
    // const showSpy = vi.spyOn(tooltipState, "show");
    // const hideSpy = useTooltipState().hide;
    // const showSpy = useTooltipState().show;

    const mockedStores = mockStores();
    const config = computed(() => mockConfig);
    const element = shallowRef(mockElement as ContainerInst);

    const result = mountComposable({
      composable: useTooltip,
      composableProps: { config, element },
      mockedStores,
    });

    return {
      ...result,
      mockTooltip: mockConfig,
      mockElement,
    };
  };

  describe("showTooltip", () => {
    it("should call canvasStore.showTooltip after entry delay", () => {
      const { getComposableResult, mockElement, mockTooltip } =
        mountTooltipComposable();
      const { showTooltip } = getComposableResult();

      showTooltip();

      expect(showSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(750);

      expect(showSpy).toHaveBeenCalledTimes(1);
      expect(showSpy).toHaveBeenCalledWith(
        expect.objectContaining({ value: mockElement }),
        expect.objectContaining({ value: mockTooltip }),
      );
    });

    it("should show tooltip correctly when called multiple times quickly", () => {
      const { getComposableResult } = mountTooltipComposable();
      const { showTooltip } = getComposableResult();

      showTooltip();
      showTooltip();
      showTooltip();

      vi.advanceTimersByTime(750);

      // Should only be called once due to timeout clearing
      expect(showSpy).toHaveBeenCalledTimes(1);
    });

    it("should not show tooltip if element is null", () => {
      const { getComposableResult, mockTooltip } = mountTooltipComposable(
        createMockTooltip(),
        null,
      );
      const { showTooltip } = getComposableResult();

      showTooltip();
      vi.advanceTimersByTime(750);

      expect(showSpy).toHaveBeenCalledTimes(1);
      expect(showSpy).toHaveBeenCalledWith(
        expect.objectContaining({ value: null }),
        expect.objectContaining({ value: mockTooltip }),
      );
    });

    it("should not show tooltip if tooltip definition is null", () => {
      const { getComposableResult, mockElement } = mountTooltipComposable(
        null,
        createMockElement(),
      );
      const { showTooltip } = getComposableResult();

      showTooltip();
      vi.advanceTimersByTime(750);

      expect(showSpy).toHaveBeenCalledTimes(1);
      expect(showSpy).toHaveBeenCalledWith(
        expect.objectContaining({ value: mockElement }),
        expect.objectContaining({ value: null }),
      );
    });
  });

  describe("hideTooltip", () => {
    it("should clear show timeout when hiding tooltip", () => {
      const { getComposableResult } = mountTooltipComposable();
      const { showTooltip, hideTooltip } = getComposableResult();

      showTooltip();
      hideTooltip();

      vi.advanceTimersByTime(750);

      expect(showSpy).not.toHaveBeenCalled();
    });

    it("should immediately hide non-hoverable tooltips", () => {
      const nonHoverableTooltip = createMockTooltip({ hoverable: false });
      const { getComposableResult } =
        mountTooltipComposable(nonHoverableTooltip);
      const { hideTooltip } = getComposableResult();

      hideTooltip();

      expect(hideSpy).toHaveBeenCalledTimes(1);
    });

    it("should immediately hide tooltip when hoverable is undefined", () => {
      const tooltipWithoutHoverable = createMockTooltip();
      delete tooltipWithoutHoverable.hoverable;

      const { getComposableResult } = mountTooltipComposable(
        tooltipWithoutHoverable,
      );
      const { hideTooltip } = getComposableResult();

      hideTooltip();

      expect(hideSpy).toHaveBeenCalledTimes(1);
    });

    it("should delay hiding hoverable tooltips", () => {
      const hoverableTooltip = createMockTooltip({ hoverable: true });
      const { getComposableResult } = mountTooltipComposable(hoverableTooltip);
      const { hideTooltip } = getComposableResult();

      hideTooltip();

      expect(hideSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(550);

      expect(hideSpy).toHaveBeenCalledTimes(1);
    });

    it("should not hide hoverable tooltip if user hovers over tooltip element", () => {
      const hoverableTooltip = createMockTooltip({ hoverable: true });
      const { getComposableResult } = mountTooltipComposable(hoverableTooltip);
      const { hideTooltip } = getComposableResult();

      const tooltipElement = document.createElement("div");
      tooltipElement.dataset.isTooltip = "true";

      // @ts-expect-error tests
      vi.mocked(document.querySelectorAll).mockReturnValueOnce([
        tooltipElement,
      ]);

      hideTooltip();
      vi.advanceTimersByTime(550);

      expect(hideSpy).not.toHaveBeenCalled();
    });

    it("should hide hoverable tooltip if no tooltip element is being hovered", () => {
      const hoverableTooltip = createMockTooltip({ hoverable: true });
      const { getComposableResult } = mountTooltipComposable(hoverableTooltip);
      const { hideTooltip } = getComposableResult();

      // Mock no elements being hovered or non-tooltip elements
      const regularElement = document.createElement("div");
      // @ts-expect-error tests
      vi.mocked(document.querySelectorAll).mockReturnValue([regularElement]);

      hideTooltip();
      vi.advanceTimersByTime(550);

      expect(hideSpy).toHaveBeenCalledTimes(1);
    });

    it("should clear hoverable tooltip hide timeout on subsequent calls", () => {
      const hoverableTooltip = createMockTooltip({ hoverable: true });
      const { getComposableResult } = mountTooltipComposable(hoverableTooltip);
      const { hideTooltip } = getComposableResult();

      hideTooltip();
      hideTooltip(); // Second call should clear the first timeout

      vi.advanceTimersByTime(550);

      // Should only be called once despite multiple hideTooltip calls
      expect(hideSpy).toHaveBeenCalledTimes(1);
    });
  });

  it("should handle show then hide sequence correctly", () => {
    const { getComposableResult } = mountTooltipComposable();
    const { showTooltip, hideTooltip } = getComposableResult();

    showTooltip();
    vi.advanceTimersByTime(750);
    expect(showSpy).toHaveBeenCalledTimes(1);

    hideTooltip();
    expect(hideSpy).toHaveBeenCalledTimes(1);
  });

  it("should handle rapid show/hide cycles", () => {
    const { getComposableResult } = mountTooltipComposable();
    const { showTooltip, hideTooltip } = getComposableResult();

    showTooltip();
    hideTooltip();
    showTooltip();
    hideTooltip();
    showTooltip();

    vi.advanceTimersByTime(750);

    // Only the last showTooltip should have executed
    expect(showSpy).toHaveBeenCalledTimes(1);
    expect(hideSpy).toHaveBeenCalledTimes(3);
  });
});
