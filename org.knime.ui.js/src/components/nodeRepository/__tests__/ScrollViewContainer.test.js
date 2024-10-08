import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";

import ScrollViewContainer from "../ScrollViewContainer.vue";

describe("ScrollViewContainer", () => {
  const doShallowMount = (props = { initialPosition: 100 }) =>
    shallowMount(ScrollViewContainer, { props });

  it("renders initial position by default", () => {
    const wrapper = doShallowMount({ initialPosition: 0 });
    expect(wrapper.find(".scroll-container").exists()).toBe(true);
    expect(wrapper.vm.initialPosition).toBe(0);
  });

  it("renders with initial position", () => {
    const wrapper = doShallowMount();

    expect(wrapper.find(".scroll-container").exists()).toBe(true);
    expect(wrapper.vm.initialPosition).toBe(100);

    // wait to set correctly the initial scroll position
    expect(wrapper.vm.$refs.scroller.scrollTop).toBe(100);
  });

  it("emits position before destroy", () => {
    const wrapper = doShallowMount();

    wrapper.unmount();

    expect(wrapper.emitted("savePosition").length).toBe(1);
    expect(wrapper.emitted("savePosition")[0][0]).toBe(100);
  });

  describe("scroll event", () => {
    beforeEach(() => {
      // scroll container has content of 400px height
      // and is 200px high
      let getBoundingClientRectMock = vi.fn();
      getBoundingClientRectMock.mockReturnValue({
        height: 200,
      });
      HTMLElement.prototype.getBoundingClientRect = getBoundingClientRectMock;
      Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
        get() {
          return 400;
        },
        configurable: true,
      });
    });

    afterEach(() => {
      delete HTMLElement.scrollHeight;
    });

    it("scrolls, but is below threshold", () => {
      const wrapper = doShallowMount({ initialPosition: 99 });

      wrapper.find(".scroll-container").trigger("scroll");

      expect(wrapper.emitted("scrollBottom")).toBeUndefined();
    });

    it("scrolls, and is above threshold", () => {
      const wrapper = doShallowMount();

      wrapper.find(".scroll-container").trigger("scroll");

      expect(wrapper.emitted("scrollBottom").length).toBe(1);
    });

    it("emit scroll event only once per update", () => {
      const wrapper = doShallowMount();

      // scroll twice
      wrapper.find(".scroll-container").trigger("scroll");
      wrapper.find(".scroll-container").trigger("scroll");

      expect(wrapper.emitted("scrollBottom").length).toBe(1);
    });
  });
});
