import { expect, describe, beforeEach, it, vi } from "vitest";
import * as Vue from "vue";
import { mount, shallowMount } from "@vue/test-utils";
import Splitter from "../Splitter.vue";

describe("Splitter.vue", () => {
  let wrapper, startMove, localStorageGetItemSpy, localStorageSetItemSpy;

  // eslint-disable-next-line no-proto
  localStorageGetItemSpy = vi.spyOn(window.localStorage.__proto__, "getItem");
  // eslint-disable-next-line no-proto
  localStorageSetItemSpy = vi.spyOn(window.localStorage.__proto__, "setItem");

  startMove = (wrapper) => {
    const handle = wrapper.find(".handle");

    handle.element.setPointerCapture = vi.fn();
    handle.element.releasePointerCapture = vi.fn();

    handle.trigger("pointerdown", {
      clientY: 100,
      pointerId: -1,
    });
  };

  describe("direction row", () => {
    beforeEach(() => {
      wrapper = mount(Splitter, {
        props: {
          direction: "column",
          id: "test-column",
          secondarySize: "45%",
        },
      });
    });

    it("uses default size", () => {
      expect(wrapper.find(".secondary").attributes().style).toBe(
        "height: 45%;"
      );
    });

    it("doesn’t display a hover title", () => {
      expect(wrapper.find(".handle").attributes().title).toBeUndefined();
    });

    it("adds active class on move", async () => {
      startMove(wrapper);
      await Vue.nextTick();
      expect(wrapper.find(".handle").attributes().class).toContain("active");
    });

    it("move changes height", async () => {
      const handle = wrapper.find(".handle");
      const secondary = wrapper.find(".secondary");

      handle.element.setPointerCapture = vi.fn();
      handle.element.releasePointerCapture = vi.fn();

      secondary.element.getBoundingClientRect = vi.fn(() => ({
        y: 200,
        height: 150,
      }));

      handle.trigger("pointerdown", {
        clientY: 100,
        pointerId: -1,
      });
      expect(handle.element.setPointerCapture).toHaveBeenCalledWith(-1);

      handle.trigger("pointermove", {
        clientY: 120,
      });
      await Vue.nextTick();
      expect(secondary.attributes().style).toBe("height: 230px;");

      handle.trigger("pointerup", {
        pointerId: -1,
      });
      expect(handle.element.releasePointerCapture).toHaveBeenCalledWith(-1);
    });

    it("saves to localStorage", async () => {
      const handle = wrapper.find(".handle");
      const secondary = wrapper.find(".secondary");

      handle.element.setPointerCapture = vi.fn();
      handle.element.releasePointerCapture = vi.fn();

      secondary.element.getBoundingClientRect = vi.fn(() => ({
        y: 200,
        height: 150,
      }));

      handle.trigger("pointerdown", {
        clientY: 100,
        pointerId: -1,
      });

      handle.trigger("pointermove", {
        clientY: 120,
      });
      await Vue.nextTick();

      expect(localStorageSetItemSpy).toHaveBeenCalledWith(
        "ui-splitter-test-column",
        "230px"
      );

      handle.trigger("pointerup", {
        pointerId: -1,
      });
    });

    it("loads from to localStorage", () => {
      localStorageGetItemSpy.mockReturnValueOnce("444px");

      let wrapper2 = mount(Splitter, {
        props: {
          direction: "column",
          id: "test-column2",
          secondarySize: "45%",
        },
      });

      expect(localStorageGetItemSpy).toHaveBeenCalled();

      const secondary = wrapper2.find(".secondary");
      expect(secondary.attributes().style).toBe("height: 444px;");
    });
  });

  describe("direction column", () => {
    beforeEach(() => {
      wrapper = shallowMount(Splitter, {
        props: {
          direction: "row",
          id: "test-row",
        },
      });
    });

    it("uses default size", () => {
      expect(wrapper.find(".secondary").attributes().style).toBe("width: 40%;");
    });

    it("doesn’t display a hover title", () => {
      expect(wrapper.find(".handle").attributes().title).toBeUndefined();
    });

    it("adds active class on move", async () => {
      startMove(wrapper);
      await Vue.nextTick();
      expect(wrapper.find(".handle").attributes().class).toContain("active");
    });

    it("move changes width", async () => {
      const handle = wrapper.find(".handle");
      const secondary = wrapper.find(".secondary");

      handle.element.setPointerCapture = vi.fn();
      handle.element.releasePointerCapture = vi.fn();

      secondary.element.getBoundingClientRect = vi.fn(() => ({
        x: 200,
        width: 150,
      }));

      handle.trigger("pointerdown", {
        clientX: 100,
        pointerId: -1,
      });
      expect(handle.element.setPointerCapture).toHaveBeenCalledWith(-1);

      handle.trigger("pointermove", {
        clientX: 120,
      });
      await Vue.nextTick();
      expect(secondary.attributes().style).toBe("width: 230px;");

      handle.trigger("pointerup", {
        pointerId: -1,
      });
      expect(handle.element.releasePointerCapture).toHaveBeenCalledWith(-1);
    });
  });
});
