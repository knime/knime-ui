import { expect, describe, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

import ReloadIcon from "webapps-common/ui/assets/img/icons/reload.svg";

import SmartLoader from "../SmartLoader.vue";

describe("SmarLoader.vue", () => {
  const doMount = ({ props = {} } = {}) => {
    const wrapper = mount(SmartLoader, {
      props,
    });

    return { wrapper };
  };

  describe("display modes", () => {
    describe("fullscreen", () => {
      const config = {
        displayMode: "fullscreen",
        loadingMode: "normal",
      };

      it("should render correctly", async () => {
        const { wrapper } = doMount({
          props: { loading: true, config, text: "RANDOMTEXT" },
        });

        await wrapper.vm.$nextTick();

        expect(wrapper.attributes("style")).toMatch("z-index: 99");
        expect(wrapper.attributes("style")).toMatch("position: fixed");
        expect(wrapper.find(".loader").classes()).toContain("fullscreen");
        expect(wrapper.text()).toMatch("RANDOMTEXT");
        expect(wrapper.findComponent(ReloadIcon).exists()).toBe(true);
      });
    });

    describe("localized", () => {
      const config = {
        displayMode: "localized",
        loadingMode: "normal",
      };

      it("should render correctly", async () => {
        const { wrapper } = doMount({
          props: { loading: true, config, text: "RANDOMTEXT" },
        });

        await wrapper.vm.$nextTick();

        expect(wrapper.attributes("style")).toMatch("position: relative");
        expect(wrapper.find(".loader").classes()).toContain("localized");
        expect(wrapper.text()).toMatch("RANDOMTEXT");
        expect(wrapper.findComponent(ReloadIcon).exists()).toBe(true);
      });

      it("should use initialDimensions", async () => {
        const { wrapper } = doMount({
          props: {
            loading: true,
            config: {
              ...config,
              initialDimensions: { width: "300px", height: "100px" },
            },
          },
        });

        await wrapper.vm.$nextTick();
        expect(wrapper.attributes("style")).toMatch("--initial-height: 100px");
        expect(wrapper.attributes("style")).toMatch("--initial-width: 300px");
      });
    });

    describe("transparent", () => {
      const config = {
        displayMode: "transparent",
        loadingMode: "normal",
      };

      it("should render correctly", async () => {
        const { wrapper } = doMount({
          props: { loading: true, config },
        });

        await wrapper.vm.$nextTick();

        expect(wrapper.attributes("style")).toMatch("position: fixed");
        expect(wrapper.find(".loader").classes()).toContain("transparent");

        expect(wrapper.findComponent(ReloadIcon).exists()).toBe(false);
        expect(wrapper.find(".text").exists()).toBe(false);
      });
    });

    describe("toast", () => {
      const config = {
        displayMode: "toast",
        loadingMode: "normal",
      };

      it("should render correctly", async () => {
        const { wrapper } = doMount({
          props: { loading: true, config },
        });

        await wrapper.vm.$nextTick();

        expect(wrapper.find(".loader").classes()).toContain("toast");
        expect(wrapper.findComponent(ReloadIcon).exists()).toBe(true);
        expect(wrapper.find(".text").exists()).toBe(true);
      });
    });
  });

  describe("loading Modes", () => {
    describe("normal loading mode", () => {
      const config = {
        position: "fullscreen",
        loadingMode: "normal",
      };

      it("should render the loader without any delay", async () => {
        const { wrapper } = doMount({
          props: { loading: true, config, text: "RANDOMTEXT" },
        });

        await wrapper.vm.$nextTick();

        expect(wrapper.text()).toMatch("RANDOMTEXT");
        expect(wrapper.findComponent(ReloadIcon).exists()).toBe(true);
      });
    });

    describe("stagger loading mode", () => {
      const config = {
        loadingMode: "stagger",
      };

      it("should display the loader and its visual elements after a delay", async () => {
        vi.useFakeTimers();

        const { wrapper } = doMount({
          props: { loading: true, config },
        });

        const advanceTime = async (timeMs) => {
          vi.advanceTimersByTime(timeMs);
          await wrapper.vm.$nextTick();
        };

        // total time now: 0ms
        // initially loading should not be yet visible
        expect(wrapper.find(".loader").isVisible()).toBe(false);
        expect(wrapper.findComponent(ReloadIcon).exists()).toBe(false);
        expect(wrapper.find(".text").exists()).toBe(false);

        // total time now: 200ms
        // after waiting for 200ms it should still not be visible
        await advanceTime(200);
        expect(wrapper.find(".loader").isVisible()).toBe(false);
        expect(wrapper.findComponent(ReloadIcon).exists()).toBe(false);
        expect(wrapper.find(".text").exists()).toBe(false);

        // total time now: 1200ms
        // after waiting for 1200ms the first stagger stage should now be executed
        // since it crossed the default threshold (1000ms).
        // The loader and icon are displayed, but not the text
        await advanceTime(1000);
        expect(wrapper.find(".loader").isVisible()).toBe(true);
        expect(wrapper.findComponent(ReloadIcon).exists()).toBe(true);
        expect(wrapper.find(".text").exists()).toBe(false);

        // total time now: 2200ms
        // time since stagger stage 1: 1000ms
        // after waiting for 1000ms the text should still not be displayed
        await advanceTime(1000);
        expect(wrapper.find(".loader").isVisible()).toBe(true);
        expect(wrapper.findComponent(ReloadIcon).exists()).toBe(true);
        expect(wrapper.find(".text").exists()).toBe(false);

        // total time now: 3900ms
        // time since stagger stage 1: 2700ms
        // after waiting for 1700ms and crossing the final threshold the text should now be displayed
        await advanceTime(1700);
        expect(wrapper.find(".loader").isVisible()).toBe(true);
        expect(wrapper.findComponent(ReloadIcon).exists()).toBe(true);
        expect(wrapper.find(".text").exists()).toBe(true);

        vi.useRealTimers();
      });
    });
  });
});
