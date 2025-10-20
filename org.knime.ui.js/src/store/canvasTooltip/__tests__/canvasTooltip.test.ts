import { describe, expect, it } from "vitest";
import { computed, ref } from "vue";

import type { TooltipDefinition } from "@/components/workflowEditor/types";
import { mockStores } from "@/test/utils/mockStores";

// Mock TooltipDefinition for testing
const createMockTooltipConfig = (
  overrides: Partial<TooltipDefinition> = {},
): TooltipDefinition => ({
  position: { x: 50, y: 60 },
  gap: 10,
  text: "Test tooltip",
  type: "default",
  orientation: "top",
  hoverable: false,
  ...overrides,
});

describe("canvasTooltip", () => {
  describe("initial state", () => {
    it("should initialize with null", () => {
      const { canvasTooltipStore } = mockStores();

      expect(canvasTooltipStore.tooltip).toBeNull();
    });

    it("should initialize with isHoverableTooltipHovered as false", () => {
      const { canvasTooltipStore } = mockStores();

      expect(canvasTooltipStore.isHoverableTooltipHovered).toBe(false);
    });
  });

  describe("showTooltip", () => {
    it("should show tooltip with valid element and config", () => {
      const { canvasTooltipStore } = mockStores();
      const mockElement = { x: 100, y: 100 } as any;
      const mockConfig = createMockTooltipConfig();

      const elementRef = ref(mockElement);
      const configRef = computed(() => mockConfig);

      canvasTooltipStore.showTooltip(elementRef, configRef);

      expect(canvasTooltipStore.tooltip).toStrictEqual({
        element: mockElement,
        config: mockConfig,
      });
    });

    it("should not show tooltip when element is null", () => {
      const { canvasTooltipStore } = mockStores();
      const mockConfig = createMockTooltipConfig();

      const elementRef = ref(null);
      const configRef = computed(() => mockConfig);

      canvasTooltipStore.showTooltip(elementRef, configRef);

      expect(canvasTooltipStore.tooltip).toBeNull();
    });

    it("should not show tooltip when config is null", () => {
      const { canvasTooltipStore } = mockStores();
      const mockElement = { x: 100, y: 100 } as any;

      const elementRef = ref(mockElement);
      const configRef = computed(() => null);

      canvasTooltipStore.showTooltip(elementRef, configRef);

      expect(canvasTooltipStore.tooltip).toBeNull();
    });

    it("should update tooltip when called multiple times with different values", () => {
      const { canvasTooltipStore } = mockStores();
      const firstElement = { x: 100, y: 100 } as any;
      const secondElement = { x: 200, y: 200 } as any;
      const firstConfig = createMockTooltipConfig({ text: "First tooltip" });
      const secondConfig = createMockTooltipConfig({ text: "Second tooltip" });

      // Show first tooltip
      const firstElementRef = ref(firstElement);
      const firstConfigRef = computed(() => firstConfig);
      canvasTooltipStore.showTooltip(firstElementRef, firstConfigRef);

      expect(canvasTooltipStore.tooltip).toStrictEqual({
        element: firstElement,
        config: firstConfig,
      });

      // Show second tooltip
      const secondElementRef = ref(secondElement);
      const secondConfigRef = computed(() => secondConfig);
      canvasTooltipStore.showTooltip(secondElementRef, secondConfigRef);

      expect(canvasTooltipStore.tooltip).toStrictEqual({
        element: secondElement,
        config: secondConfig,
      });
    });
  });

  describe("hideTooltip", () => {
    it("should hide tooltip", () => {
      const { canvasTooltipStore } = mockStores();
      const mockElement = { x: 100, y: 100 } as any;
      const mockConfig = createMockTooltipConfig();

      // First show a tooltip
      const elementRef = ref(mockElement);
      const configRef = computed(() => mockConfig);
      canvasTooltipStore.showTooltip(elementRef, configRef);

      expect(canvasTooltipStore.tooltip).not.toBeNull();

      // Then hide it
      canvasTooltipStore.hideTooltip();

      expect(canvasTooltipStore.tooltip).toBeNull();
    });

    it("should handle multiple hide calls gracefully", () => {
      const { canvasTooltipStore } = mockStores();

      // Hide when already null
      canvasTooltipStore.hideTooltip();
      expect(canvasTooltipStore.tooltip).toBeNull();

      // Hide again
      canvasTooltipStore.hideTooltip();
      expect(canvasTooltipStore.tooltip).toBeNull();
    });
  });
});
