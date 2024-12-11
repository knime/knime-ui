/* eslint-disable func-style */
import { type Mock, afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { shallowMount } from "@vue/test-utils";

import type { XY } from "@/api/gateway-api/generated-api";
import { useEscapeStack } from "@/composables/useEscapeStack";
import { mockStores } from "@/test/utils/mockStores";
import FloatingMenu from "../FloatingMenu.vue";

const useFocusTrapMock = {
  activate: vi.fn(),
  deactivate: vi.fn(),
};

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

vi.mock("@vueuse/integrations/useFocusTrap", () => {
  return {
    useFocusTrap: () => useFocusTrapMock,
  };
});

describe("FloatingMenu.vue", () => {
  type MountOpts = {
    props?: any;
    contentHeight?: number;
    contentWidth?: number;
    isDraggingNodeInCanvas?: false;
    isDraggingNodeTemplate?: false;
    screenFromCanvasCoordinatesMock?: Mock<() => XY>;
  };

  const doMount = ({
    props = {},
    // Mock menu content bounds
    contentHeight = 10,
    contentWidth = 10,
    isDraggingNodeInCanvas = false,
    isDraggingNodeTemplate = false,
    screenFromCanvasCoordinatesMock,
  }: MountOpts = {}) => {
    const defaultProps = {
      canvasPosition: {
        x: 20,
        y: 20,
      },
    };

    // Mock 'kanvas' element
    const mockKanvas = document.createElement("div");
    mockKanvas.setAttribute("id", "kanvas");
    const getBoundingClientRect = vi.fn(() => ({
      x: 20,
      y: 20,
      width: 80,
      height: 80,
    }));
    mockKanvas.getBoundingClientRect = getBoundingClientRect;
    document.body.appendChild(mockKanvas);

    // Mock window bounds
    window.innerWidth = 100;
    window.innerHeight = 100;

    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      get: () => contentHeight,
    });
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      get: () => contentWidth,
    });
    const removeEventListener = HTMLElement.prototype.removeEventListener;
    HTMLElement.prototype.removeEventListener = vi.fn((...args) => {
      removeEventListener(...args);
    });

    const mockedStores = mockStores();
    mockedStores.nodeTemplatesStore.isDraggingNodeTemplate =
      isDraggingNodeTemplate;
    mockedStores.movingStore.isDragging = isDraggingNodeInCanvas;

    // Mock screenFromCanvasCoordinates
    const defaultScreenFromCanvasCoordinatesMock = vi.fn(({ x, y }) => ({
      x: x * mockedStores.canvasStore.zoomFactor,
      y: y * mockedStores.canvasStore.zoomFactor,
    }));

    // @ts-ignore
    mockedStores.canvasStore.screenFromCanvasCoordinates =
      screenFromCanvasCoordinatesMock ?? defaultScreenFromCanvasCoordinatesMock;

    const wrapper = shallowMount(FloatingMenu, {
      props: { ...defaultProps, ...props },
      global: { plugins: [mockedStores.testingPinia] },
    });

    return {
      wrapper,
      mockedStores,
      mockKanvas,
      getBoundingClientRect,
      screenFromCanvasCoordinatesMock,
    };
  };

  afterEach(() => {
    const kanvas = document.getElementById("kanvas")!;
    kanvas?.remove(); // clean-up attached event listeners
    vi.clearAllMocks();
  });

  describe("close menu", () => {
    it("closes menu on escape key", () => {
      const { wrapper } = doMount();
      useEscapeStack.onEscape();
      expect(wrapper.emitted("menuClose")).toBeDefined();
    });

    it("uses focus trap if prop is true", async () => {
      doMount({
        props: {
          focusTrap: true,
        },
      });
      await new Promise((r) => setTimeout(r, 0));
      expect(useFocusTrapMock.activate).toHaveBeenCalled();
    });

    it("does not use focus trap if prop is false", async () => {
      doMount({
        props: {
          focusTrap: false,
        },
      });
      await nextTick();
      expect(useFocusTrapMock.activate).not.toHaveBeenCalled();
    });

    it("closes menu if a node template is being dragged", async () => {
      const { wrapper } = doMount({ isDraggingNodeTemplate: true });
      await nextTick();

      expect(wrapper.emitted("menuClose")).toBeDefined();
    });

    it("closes menu when a node is dragged in the canvas", async () => {
      const { wrapper, mockedStores } = doMount();
      mockedStores.movingStore.isDragging = true;

      await nextTick();
      expect(wrapper.emitted("menuClose")).toBeDefined();
    });
  });

  describe("menu position and effects", () => {
    it("position inside canvas; top-left", async () => {
      const { wrapper } = doMount();
      await nextTick();

      expect(wrapper.attributes("style")).toMatch("left: 20px;");
      expect(wrapper.attributes("style")).toMatch("top: 20px;");
      expect(wrapper.attributes("style")).toMatch("opacity: 1;");
    });

    it("position inside canvas; top-right", async () => {
      const { wrapper } = doMount({ props: { anchor: "top-right" } });

      await nextTick();

      expect(wrapper.attributes("style")).toMatch("left: 10px;");
      expect(wrapper.attributes("style")).toMatch("top: 20px;");
      expect(wrapper.attributes("style")).toMatch("opacity: 1;");
    });

    it("position inside canvas: bottom-left", async () => {
      const { wrapper } = doMount({ props: { anchor: "bottom-left" } });

      await nextTick();

      expect(wrapper.attributes("style")).toMatch("left: 20px;");
      expect(wrapper.attributes("style")).toMatch("top: 10px");
      expect(wrapper.attributes("style")).toMatch("opacity: 1;");
    });

    it("position outside left border, half threshold", async () => {
      const { wrapper } = doMount({
        props: { canvasPosition: { x: -5, y: 20 } },
      });

      await nextTick();
      expect(wrapper.attributes("style")).toMatch("opacity: 0.5;");
    });

    it.each([
      ["left border", { x: -31, y: 20 }],
      ["top border", { x: 20, y: -31 }],
      ["right border", { x: 151, y: 20 }],
      ["bottom border", { x: 20, y: 151 }],
    ])("position outside %s, exceeding threshold", async (_, position) => {
      const { wrapper } = doMount({ props: { canvasPosition: position } });

      await nextTick();
      expect(wrapper.attributes("style")).toMatch("opacity: 0;");
      expect(wrapper.emitted("menuClose")).toBeTruthy();
    });

    it("prevent window overflow top-left", async () => {
      const { wrapper } = doMount({
        props: { canvasPosition: { x: -20, y: -20 }, preventOverflow: true },
      });
      await nextTick();

      expect(wrapper.attributes("style")).toMatch("left: 0px;");
      expect(wrapper.attributes("style")).toMatch("top: 0px;");
    });

    it("prevent window overflow bottom-right", async () => {
      const { wrapper } = doMount({
        props: { canvasPosition: { x: 150, y: 150 }, preventOverflow: true },
      });
      await nextTick();

      expect(wrapper.attributes("style")).toMatch("left: 90px;");
      expect(wrapper.attributes("style")).toMatch("top: 90px;");
    });

    it("re-position on position update", async () => {
      const { wrapper } = doMount();
      await nextTick();

      wrapper.setProps({ canvasPosition: { x: 0, y: 0 } });
      await nextTick();

      expect(wrapper.attributes("style")).toMatch("left: 0px;");
      expect(wrapper.attributes("style")).toMatch("top: 0px;");
    });

    it("re-position on zoom factor update", async () => {
      const { wrapper, mockedStores } = doMount();
      await nextTick();

      mockedStores.canvasStore.zoomFactor = 2;
      await nextTick();

      expect(wrapper.attributes("style")).toMatch("left: 40px;");
      expect(wrapper.attributes("style")).toMatch("top: 40px;");
    });

    it("re-position on canvas scroll", async () => {
      let screenCoordinates = { x: 20, y: 20 };
      const screenFromCanvasCoordinatesMock = vi.fn(() => screenCoordinates);

      const { wrapper } = doMount({ screenFromCanvasCoordinatesMock });
      await nextTick();

      expect(wrapper.attributes("style")).toContain("left: 20px");
      expect(wrapper.attributes("style")).toContain("top: 20px");

      // Update the coordinates for the scroll event.
      screenCoordinates = { x: 50, y: 50 };

      const kanvas = document.getElementById("kanvas")!;
      kanvas.dispatchEvent(new CustomEvent("scroll"));
      await nextTick();

      expect(wrapper.attributes("style")).toContain("left: 50px");
      expect(wrapper.attributes("style")).toContain("top: 50px");
    });

    it("disable interactions when the prop is set", () => {
      const { mockedStores } = doMount({
        props: { disableInteractions: true },
      });

      expect(mockedStores.canvasStore.setInteractionsEnabled).toBeCalledWith(
        false,
      );
    });
  });

  describe("clean up", () => {
    it("removes scroll listener", async () => {
      const { wrapper } = doMount({
        screenFromCanvasCoordinatesMock: vi.fn(() => ({ x: 0, y: 0 })),
      });
      await nextTick();

      wrapper.unmount();
      await nextTick();

      const kanvas = document.getElementById("kanvas")!;

      kanvas.dispatchEvent(new CustomEvent("scroll"));

      expect(HTMLElement.prototype.removeEventListener).toHaveBeenCalledWith(
        "scroll",
        expect.anything(),
      );
    });

    it("enables interactions", () => {
      const { wrapper, mockedStores } = doMount();
      wrapper.unmount();

      expect(mockedStores.canvasStore.setInteractionsEnabled).toBeCalledWith(
        true,
      );
    });
  });
});
