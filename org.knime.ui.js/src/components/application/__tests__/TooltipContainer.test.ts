import { type MockedFunction, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { shallowMount } from "@vue/test-utils";

import type { TooltipDefinition } from "@/components/workflowEditor/types";
import * as $shapes from "@/style/shapes";
import { mockStores } from "@/test/utils/mockStores";
import Tooltip from "../Tooltip.vue";
import TooltipContainer from "../TooltipContainer.vue";

const createTooltip = (
  tooltip: Partial<TooltipDefinition> = {},
): TooltipDefinition => ({
  anchorPoint: { x: 0, y: 0 },
  position: { x: 0, y: 0 },
  gap: 0,
  text: "",
  ...tooltip,
});

describe("TooltipContainer", () => {
  const doShallowMount = () => {
    const mockedStores = mockStores();

    const screenFromCanvasCoordinatesMock = vi
      .fn()
      .mockImplementation(({ x, y }) => ({ x: x * 2, y: y * 2 }));

    // @ts-expect-error
    mockedStores.canvasStore.screenFromCanvasCoordinates =
      screenFromCanvasCoordinatesMock;

    const kanvasElement = {
      scrollLeft: 0,
      scrollTop: 0,
      offsetLeft: 0,
      offsetTop: 0,
      scrollEventListener: null,
      addEventListener: vi.fn().mockImplementation((event, callback) => {
        kanvasElement.scrollEventListener = callback;
      }),
      removeEventListener: vi.fn(),
    } as unknown as HTMLElement & { scrollEventListener: MockedFunction<any> };

    const wrapper = shallowMount(TooltipContainer, {
      global: { plugins: [mockedStores.testingPinia], mocks: { $shapes } },
    });

    document.getElementById = (id) => (id === "kanvas" ? kanvasElement : null);

    return {
      wrapper,
      mockedStores,
      kanvasElement,
      screenFromCanvasCoordinatesMock,
    };
  };

  it("no tooltip set", () => {
    const { wrapper } = doShallowMount();
    expect(wrapper.find("div.tooltip-container").exists()).toBe(true);
    expect(wrapper.findComponent(Tooltip).exists()).toBe(false);
  });

  it("closes tooltip on mouseleave", async () => {
    const tooltip = createTooltip();

    const { wrapper, mockedStores } = doShallowMount();
    mockedStores.workflowStore.setTooltip(tooltip);
    await nextTick();

    wrapper.findComponent(Tooltip).trigger("mouseleave");
    expect(mockedStores.workflowStore.tooltip).toBeNull();
  });

  describe("positioning", () => {
    it("renders tooltip at position", async () => {
      const tooltip = createTooltip({
        anchorPoint: { x: 10, y: 10 },
        position: { x: 10, y: 10 },
        gap: 10,
      });

      const { wrapper, mockedStores } = doShallowMount();
      mockedStores.workflowStore.setTooltip(tooltip);
      await nextTick();

      expect(wrapper.findComponent(Tooltip).props()).toMatchObject({
        x: 40,
        y: 40,
        gap: 10,
      });
    });

    it("scales gap in relation to sqrt of zoomFactor", async () => {
      const tooltip = createTooltip({ gap: 10 });

      const { wrapper, mockedStores } = doShallowMount();
      mockedStores.canvasStore.zoomFactor = 9; // 900%
      mockedStores.workflowStore.setTooltip(tooltip);
      await nextTick();

      expect(wrapper.findComponent(Tooltip).props()).toMatchObject({
        gap: 30,
      });
    });

    it("passes other props", async () => {
      const tooltip = createTooltip({
        text: "text",
        title: "title",
        orientation: "top",
        type: "default",
        hoverable: true,
      });
      const { wrapper, mockedStores } = doShallowMount();
      mockedStores.workflowStore.setTooltip(tooltip);
      await nextTick();

      expect(wrapper.findComponent(Tooltip).props()).toMatchObject({
        text: "text",
        title: "title",
        orientation: "top",
        type: "default",
        hoverable: true,
      });
    });
  });

  describe("updating", () => {
    it("setting first tooltip adds scroll listener", async () => {
      const tooltip = createTooltip();

      const { wrapper, mockedStores, kanvasElement } = doShallowMount();
      mockedStores.workflowStore.setTooltip(tooltip);
      await nextTick();

      expect(kanvasElement.addEventListener).toHaveBeenCalledWith(
        "scroll",
        // @ts-expect-error
        wrapper.vm.onCanvasScroll,
      );

      // test that it doesn't set another scroll listener
      mockedStores.workflowStore.setTooltip({ ...tooltip });
      await nextTick();
      expect(kanvasElement.addEventListener).toHaveBeenCalledTimes(1);
    });

    it("closing tooltip removes scroll listener", async () => {
      const tooltip = createTooltip();

      const { wrapper, mockedStores, kanvasElement } = doShallowMount();
      mockedStores.workflowStore.setTooltip(tooltip);
      await nextTick();

      mockedStores.workflowStore.setTooltip(null);
      await nextTick();

      expect(kanvasElement.removeEventListener).toHaveBeenCalledWith(
        "scroll",
        // @ts-expect-error
        wrapper.vm.onCanvasScroll,
      );
    });

    it("destruction of tooltipContainer removes scroll listener", () => {
      const { wrapper, kanvasElement } = doShallowMount();
      wrapper.unmount();

      expect(kanvasElement.removeEventListener).toHaveBeenCalledWith(
        "scroll",
        // @ts-expect-error
        wrapper.vm.onCanvasScroll,
      );
    });

    it("tooltip moves while scrolling", async () => {
      const tooltip = createTooltip({ position: { x: 10, y: 10 } });

      const {
        wrapper,
        mockedStores,
        kanvasElement,
        screenFromCanvasCoordinatesMock,
      } = doShallowMount();
      mockedStores.workflowStore.setTooltip(tooltip);
      await nextTick();
      expect(wrapper.findComponent(Tooltip).props()).toMatchObject({
        x: 20,
        y: 20,
      });

      screenFromCanvasCoordinatesMock.mockReturnValue({ x: -50, y: -50 });
      kanvasElement.scrollEventListener({
        target: { scrollLeft: 50, scrollTop: 50 },
      });
      await nextTick();
      expect(wrapper.findComponent(Tooltip).props()).toMatchObject({
        x: -50,
        y: -50,
      });
    });
  });
});
