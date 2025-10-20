import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { mount } from "@vue/test-utils";

import type { TooltipDefinition } from "@/components/workflowEditor/types";
import { mockStores } from "@/test/utils/mockStores";
import Tooltip from "../Tooltip.vue";

// Mock floating-ui/vue
const mockFloatingStyles = ref({});
const mockMiddlewareData = ref({});
const mockPlacement = ref("bottom");

vi.mock("@floating-ui/vue", () => ({
  useFloating: vi.fn(() => ({
    floatingStyles: mockFloatingStyles,
    middlewareData: mockMiddlewareData,
    placement: mockPlacement,
  })),
  offset: vi.fn((fn) => ({ name: "offset", fn })),
  arrow: vi.fn((options) => ({ name: "arrow", options })),
  autoUpdate: vi.fn(),
}));

describe("Tooltip", () => {
  const createMockElement = () => ({
    getBounds: vi.fn().mockReturnValue({
      x: 100,
      y: 50,
      width: 80,
      height: 40,
    }),
  });

  const createTooltipConfig = (
    overrides: Partial<TooltipDefinition> = {},
  ): TooltipDefinition => ({
    position: { x: 10, y: 20 },
    gap: 8,
    text: "Test tooltip text",
    orientation: "bottom" as const,
    type: "default" as const,
    hoverable: false,
    ...overrides,
  });

  const doMount = ({
    tooltipConfig = null,
    mockOptions = {},
  }: {
    tooltipConfig?: TooltipDefinition | null;
    mockOptions?: {
      floatingStyles?: Record<string, any>;
      middlewareData?: Record<string, any>;
      placement?: string;
      zoomFactor?: number;
    };
  } = {}) => {
    // Reset mocks with defaults or provided values
    mockFloatingStyles.value = {
      position: "absolute",
      top: "100px",
      left: "150px",
      ...mockOptions.floatingStyles,
    };

    if (mockOptions.middlewareData) {
      mockMiddlewareData.value = mockOptions.middlewareData;
    } else {
      mockMiddlewareData.value = {
        arrow: { x: 10, y: 0 },
      };
    }
    mockPlacement.value = mockOptions.placement ?? "bottom";

    const mockedStores = mockStores();
    const element = createMockElement();

    if (tooltipConfig) {
      mockedStores.canvasTooltipStore.tooltip = {
        element: element as any,
        config: tooltipConfig,
      };
    } else {
      mockedStores.canvasTooltipStore.tooltip = null;
    }

    mockedStores.webglCanvasStore.zoomFactor = mockOptions.zoomFactor ?? 1;
    mockedStores.canvasTooltipStore.hideTooltip = vi.fn();
    mockedStores.webglCanvasStore.canvasOffset = { x: 0, y: 0 };
    mockedStores.webglCanvasStore.containerSize = { width: 800, height: 600 };

    const wrapper = mount(Tooltip, {
      global: { plugins: [mockedStores.testingPinia] },
    });

    return { wrapper, mockedStores, element };
  };

  describe("rendering", () => {
    it("does not render when tooltip is null", () => {
      const { wrapper } = doMount({ tooltipConfig: null });
      expect(wrapper.find(".tooltip-container").exists()).toBe(false);
    });

    it("renders tooltip with basic configuration", () => {
      const config = createTooltipConfig();
      const { wrapper } = doMount({ tooltipConfig: config });

      expect(wrapper.find(".tooltip-container").exists()).toBe(true);
      expect(wrapper.find(".text").text()).toBe("Test tooltip text");
    });

    it("renders tooltip with title and text", () => {
      const config = createTooltipConfig({
        title: "Tooltip Title",
        text: "Tooltip description",
      });
      const { wrapper } = doMount({ tooltipConfig: config });

      expect(wrapper.find(".title").text()).toBe("Tooltip Title");
      expect(wrapper.find(".text").text()).toBe("Tooltip description");
    });

    it("renders tooltip without title when not provided", () => {
      const config = createTooltipConfig({ title: undefined });
      const { wrapper } = doMount({ tooltipConfig: config });

      expect(wrapper.find(".title").exists()).toBe(false);
      expect(wrapper.find(".text").exists()).toBe(true);
    });

    it("renders tooltip without text when not provided", () => {
      const config = createTooltipConfig({ text: undefined as any });
      const { wrapper } = doMount({ tooltipConfig: config });

      expect(wrapper.find(".text").exists()).toBe(false);
    });
  });

  describe("tooltip types and styles", () => {
    it("respects type", () => {
      const config = createTooltipConfig({ type: "error" });
      const { wrapper } = doMount({ tooltipConfig: config });

      const container = wrapper.find(".tooltip-container");
      expect(container.classes()).toContain("error");
    });

    it("applies hoverable class when tooltip is hoverable", () => {
      const config = createTooltipConfig({ hoverable: true });
      const { wrapper } = doMount({ tooltipConfig: config });

      const container = wrapper.find(".tooltip-container");
      expect(container.classes()).toContain("hoverable");
    });

    it("does not apply hoverable class when tooltip is not hoverable", () => {
      const config = createTooltipConfig({ hoverable: false });
      const { wrapper } = doMount({ tooltipConfig: config });

      const container = wrapper.find(".tooltip-container");
      expect(container.classes()).not.toContain("hoverable");
    });
  });

  describe("arrow placement", () => {
    it("applies bottom placement class to arrow", () => {
      const config = createTooltipConfig();
      const { wrapper } = doMount({
        tooltipConfig: config,
        mockOptions: { placement: "bottom" },
      });

      const arrow = wrapper.find(".tooltip-arrow");
      expect(arrow.classes()).toContain("bottom");
    });

    it("applies top placement class to arrow", () => {
      const config = createTooltipConfig();
      const { wrapper } = doMount({
        tooltipConfig: config,
        mockOptions: { placement: "top" },
      });

      const arrow = wrapper.find(".tooltip-arrow");
      expect(arrow.classes()).toContain("top");
    });
  });

  it("sets isHoverableTooltipHovered flag to true on pointer enter when hoverable", () => {
    const config = createTooltipConfig({ hoverable: true });
    const { wrapper, mockedStores } = doMount({ tooltipConfig: config });

    const container = wrapper.find(".tooltip-container");
    container.trigger("pointerenter");

    expect(mockedStores.canvasTooltipStore.isHoverableTooltipHovered).toBe(
      true,
    );
  });

  it("calls hideTooltip and sets isHoverableTooltipHovered flag on pointer leave when hoverable", () => {
    const config = createTooltipConfig({ hoverable: true });
    const { wrapper, mockedStores } = doMount({ tooltipConfig: config });

    const container = wrapper.find(".tooltip-container");
    container.trigger("pointerleave");

    expect(mockedStores.canvasTooltipStore.hideTooltip).toHaveBeenCalled();
    expect(mockedStores.canvasTooltipStore.isHoverableTooltipHovered).toBe(
      false,
    );
  });

  it("sets correct data attributes", () => {
    const config = createTooltipConfig();
    const { wrapper } = doMount({ tooltipConfig: config });

    const container = wrapper.find(".tooltip-container");
    expect(container.attributes("data-is-tooltip")).toBe("true");
    expect(container.attributes("data-test-id")).toBe("tooltip");
  });
});
