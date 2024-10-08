import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { shallowMount } from "@vue/test-utils";

import * as $shapes from "@/style/shapes";
import { mockVuexStore } from "@/test/utils";
import Tooltip from "../Tooltip.vue";
import TooltipContainer from "../TooltipContainer.vue";

describe("TooltipContainer", () => {
  let doShallowMount,
    wrapper,
    $store,
    storeConfig,
    tooltip,
    kanvasElement,
    screenFromCanvasCoordinatesMock;

  beforeEach(() => {
    wrapper = null;
    $store = null;
    screenFromCanvasCoordinatesMock = vi
      .fn()
      .mockImplementation(({ x, y }) => ({ x: x * 2, y: y * 2 }));
    storeConfig = {
      canvas: {
        getters: {
          screenFromCanvasCoordinates: () => screenFromCanvasCoordinatesMock,
        },
        state: {
          zoomFactor: 1,
        },
      },
      workflow: {
        mutations: {
          setTooltip: (state, tooltip) => {
            state.tooltip = tooltip;
          },
        },
        state: {
          tooltip,
        },
      },
    };

    kanvasElement = {
      scrollLeft: 0,
      scrollTop: 0,
      offsetLeft: 0,
      offsetTop: 0,
      scrollEventListener: null,
      addEventListener: vi.fn().mockImplementation((event, callback) => {
        kanvasElement.scrollEventListener = callback;
      }),
      removeEventListener: vi.fn(),
    };

    doShallowMount = () => {
      $store = mockVuexStore(storeConfig);
      wrapper = shallowMount(TooltipContainer, {
        global: {
          plugins: [$store],
          mocks: { $shapes },
        },
      });
      document.getElementById = (id) =>
        id === "kanvas" ? kanvasElement : null;
    };
  });

  it("no tooltip set", () => {
    doShallowMount();
    expect(wrapper.find("div.tooltip-container").exists()).toBe(true);
    expect(wrapper.findComponent(Tooltip).exists()).toBe(false);
  });

  it("closes tooltip on mouseleave", async () => {
    let tooltip = {
      anchorPoint: { x: 0, y: 0 },
      position: { x: 0, y: 0 },
    };

    doShallowMount();
    $store.commit("workflow/setTooltip", tooltip);
    await nextTick();

    wrapper.findComponent(Tooltip).trigger("mouseleave");
    expect(storeConfig.workflow.state.tooltip).toBeNull();
  });

  describe("positioning", () => {
    it("renders tooltip at position", async () => {
      let tooltip = {
        anchorPoint: { x: 10, y: 10 },
        position: { x: 10, y: 10 },
        gap: 10,
      };

      doShallowMount();
      $store.commit("workflow/setTooltip", tooltip);
      await nextTick();

      expect(wrapper.findComponent(Tooltip).props()).toMatchObject({
        x: 40,
        y: 40,
        gap: 10,
      });
    });

    it("scales gap in relation to sqrt of zoomFactor", async () => {
      storeConfig.canvas.state.zoomFactor = 9; // 900%
      let tooltip = {
        anchorPoint: { x: 0, y: 0 },
        position: { x: 0, y: 0 },
        gap: 10,
      };

      doShallowMount();
      $store.commit("workflow/setTooltip", tooltip);
      await nextTick();

      expect(wrapper.findComponent(Tooltip).props()).toMatchObject({
        gap: 30,
      });
    });

    it("passes other props", async () => {
      let tooltip = {
        position: { x: 0, y: 0 }, // necessary
        text: "text",
        title: "title",
        orientation: "top",
        type: "default",
        hoverable: true,
      };
      doShallowMount();
      $store.commit("workflow/setTooltip", tooltip);
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
      let tooltip = {
        anchorPoint: { x: 0, y: 0 },
        position: { x: 0, y: 0 },
      };

      doShallowMount();
      $store.commit("workflow/setTooltip", tooltip);
      await nextTick();

      expect(kanvasElement.addEventListener).toHaveBeenCalledWith(
        "scroll",
        wrapper.vm.onCanvasScroll,
      );

      // test that it doesn't set another scroll listener
      $store.commit("workflow/setTooltip", { ...tooltip });
      await nextTick();
      expect(kanvasElement.addEventListener).toHaveBeenCalledTimes(1);
    });

    it("closing tooltip removes scroll listener", async () => {
      let tooltip = {
        position: { x: 0, y: 0 },
      };

      doShallowMount();
      $store.commit("workflow/setTooltip", tooltip);
      await nextTick();

      $store.commit("workflow/setTooltip", null);
      await nextTick();

      expect(kanvasElement.removeEventListener).toHaveBeenCalledWith(
        "scroll",
        wrapper.vm.onCanvasScroll,
      );
    });

    it("destruction of tooltipContainer removes scroll listener", () => {
      doShallowMount();
      wrapper.unmount();

      expect(kanvasElement.removeEventListener).toHaveBeenCalledWith(
        "scroll",
        wrapper.vm.onCanvasScroll,
      );
    });

    it("tooltip moves while scrolling", async () => {
      let tooltip = {
        anchorPoint: { x: 0, y: 0 },
        position: { x: 10, y: 10 },
      };

      doShallowMount();
      $store.commit("workflow/setTooltip", tooltip);
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
