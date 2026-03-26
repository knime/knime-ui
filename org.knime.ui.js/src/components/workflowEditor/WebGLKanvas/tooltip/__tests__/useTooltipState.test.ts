import { beforeEach, describe, expect, it, vi } from "vitest";
import { computed, shallowRef } from "vue";

import type { TooltipDefinition } from "@/components/workflowEditor/types";
import type { ContainerInst } from "@/vue3-pixi";

// dynamic import to ensure fresh module state isn't shared between tests
// we reset modules before each test
const getComposable = async () => {
  const { useTooltipState } = await import("../useTooltipState");
  return useTooltipState();
};

describe("useTooltipState", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("initial state", () => {
    it("should have isShown as false initially", async () => {
      const { isShown } = await getComposable();
      expect(isShown.value).toBe(false);
    });

    it("should have config as undefined initially", async () => {
      const { config } = await getComposable();
      expect(config.value).toBeUndefined();
    });

    it("should have element as undefined initially", async () => {
      const { element } = await getComposable();
      expect(element.value).toBeUndefined();
    });

    it("should have isHoverableTooltipHovered as false initially", async () => {
      const { isHoverableTooltipHovered } = await getComposable();
      expect(isHoverableTooltipHovered.value).toBe(false);
    });
  });

  describe("show", () => {
    it("should set isShown to true when called with valid params", async () => {
      const { show, isShown } = await getComposable();

      const mockElement = shallowRef<ContainerInst | null>({} as ContainerInst);
      const mockConfig = computed<TooltipDefinition | null>(() => ({
        text: "Tooltip text",
        position: { x: 3, y: 4 },
        gap: 2,
      }));

      show(mockElement, mockConfig);

      expect(isShown.value).toBe(true);
    });

    it("should set config when called with valid params", async () => {
      const { show, config } = await getComposable();

      const mockElement = shallowRef<ContainerInst | null>({} as ContainerInst);
      const tooltipDef: TooltipDefinition = {
        text: "Tooltip text",
        position: { x: 3, y: 4 },
        gap: 2,
      };
      const mockConfig = computed<TooltipDefinition | null>(() => tooltipDef);

      show(mockElement, mockConfig);

      expect(config.value).toEqual(tooltipDef);
    });

    it("should set element when called with valid params", async () => {
      const { show, element } = await getComposable();

      const mockContainerInst = {} as ContainerInst;
      const mockElement = shallowRef<ContainerInst | null>(mockContainerInst);
      const mockConfig = computed<TooltipDefinition | null>(() => ({
        text: "Tooltip text",
        position: { x: 3, y: 4 },
        gap: 2,
      }));

      show(mockElement, mockConfig);

      expect(element.value).toBe(mockContainerInst);
    });

    it("should not show tooltip when config value is null", async () => {
      const { show, isShown } = await getComposable();

      const mockElement = shallowRef<ContainerInst | null>({} as ContainerInst);
      const mockConfig = computed<TooltipDefinition | null>(() => null);

      show(mockElement, mockConfig);

      expect(isShown.value).toBe(false);
    });

    it("should not show tooltip when element value is null", async () => {
      const { show, isShown } = await getComposable();

      const mockElement = shallowRef<ContainerInst | null>(null);
      const mockConfig = computed<TooltipDefinition | null>(() => ({
        text: "Tooltip text",
        position: { x: 3, y: 4 },
        gap: 2,
      }));

      show(mockElement, mockConfig);

      expect(isShown.value).toBe(false);
    });

    it("should not show tooltip when called with nullish params", async () => {
      const { show, isShown } = await getComposable();

      const mockElement = shallowRef<ContainerInst | null>(null);
      const mockConfig = computed<TooltipDefinition | null>(() => null);

      show(mockElement, mockConfig);

      expect(isShown.value).toBe(false);
    });
  });

  describe("hide", () => {
    it("should set isShown to false", async () => {
      const { show, hide, isShown } = await getComposable();

      const mockElement = shallowRef<ContainerInst | null>({} as ContainerInst);
      const mockConfig = computed<TooltipDefinition | null>(() => ({
        text: "Tooltip text",
        position: { x: 3, y: 4 },
        gap: 2,
      }));

      show(mockElement, mockConfig);
      expect(isShown.value).toBe(true);

      hide();
      expect(isShown.value).toBe(false);
    });

    it("should clear config", async () => {
      const { show, hide, config } = await getComposable();

      const mockElement = shallowRef<ContainerInst | null>({} as ContainerInst);
      const mockConfig = computed<TooltipDefinition | null>(() => ({
        text: "Tooltip text",
        position: { x: 3, y: 4 },
        gap: 2,
      }));

      show(mockElement, mockConfig);
      expect(config.value).not.toBeNull();

      hide();
      expect(config.value).toBeUndefined();
    });

    it("should clear element", async () => {
      const { show, hide, element } = await getComposable();

      const mockElement = shallowRef<ContainerInst | null>({} as ContainerInst);
      const mockConfig = computed<TooltipDefinition | null>(() => ({
        text: "Tooltip text",
        position: { x: 3, y: 4 },
        gap: 2,
      }));

      show(mockElement, mockConfig);
      expect(element.value).not.toBeNull();

      hide();
      expect(element.value).toBeUndefined();
    });

    it("should reset isHoverableTooltipHovered to false", async () => {
      const { hide, isHoverableTooltipHovered } = await getComposable();

      isHoverableTooltipHovered.value = true;

      hide();

      expect(isHoverableTooltipHovered.value).toBe(false);
    });
  });

  describe("isShown readonly", () => {
    it("should expose isShown as readonly", async () => {
      const { isShown } = await getComposable();

      // @ts-expect-error - testing readonly enforcement at runtime
      isShown.value = true;

      expect(isShown.value).toBe(false);
    });
  });

  describe("shared state", () => {
    it("should share state between multiple instances of the composable", async () => {
      const { useTooltipState } = await import("../useTooltipState");

      const instance1 = useTooltipState();
      const instance2 = useTooltipState();

      const config = {
        text: "Tooltip text",
        position: { x: 3, y: 4 },
        gap: 2,
      };

      const mockElement = shallowRef<ContainerInst | null>({} as ContainerInst);
      const mockConfig = computed<TooltipDefinition | null>(() => config);

      instance1.show(mockElement, mockConfig);

      expect(instance2.isShown.value).toBe(true);
      expect(instance2.config.value).toEqual(config);
    });
  });
});
