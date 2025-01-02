import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

import { SubMenu } from "@knime/components";

import { mockStores } from "@/test/utils/mockStores";
import ZoomMenu from "../ZoomMenu.vue";

describe("ZoomMenu", () => {
  type MountOpts = {
    props?: Partial<InstanceType<typeof ZoomMenu>>["$props"];
    zoomFactor?: number;
  };

  const doMount = ({ props = {}, zoomFactor = 1 }: MountOpts = {}) => {
    const mockedStores = mockStores();

    mockedStores.canvasStore.zoomFactor = zoomFactor;

    const $shortcuts = {
      get: vi.fn().mockImplementation((shortcut) => ({ name: shortcut })),
      dispatch: vi.fn(),
    };

    const wrapper = mount(ZoomMenu, {
      props,
      global: { plugins: [mockedStores.testingPinia], mocks: { $shortcuts } },
    });

    return { wrapper, mockedStores, $shortcuts };
  };

  it("renders", () => {
    const { wrapper } = doMount();
    expect(wrapper.findComponent(SubMenu).exists()).toBe(true);
    expect(wrapper.findComponent(SubMenu).props("disabled")).toBe(false);
    expect(wrapper.find("input").exists()).toBe(true);
  });

  it("can be disabled", () => {
    const { wrapper } = doMount({ props: { disabled: true } });

    expect(wrapper.findComponent(SubMenu).props("disabled")).toBe(true);
  });

  describe("zoom value input", () => {
    it("shows current zoom level", () => {
      const { wrapper } = doMount({ zoomFactor: 0.53 });

      expect(wrapper.find(".zoom-input").element.value).toBe("53%");
    });

    it("selects all text of input on click", () => {
      const { wrapper } = doMount({ zoomFactor: 0.63 });

      const input = wrapper.find(".zoom-input");
      input.element.select = vi.fn();
      input.trigger("click");

      expect(input.element.select).toHaveBeenCalled();
    });

    it("parses input with % sign", async () => {
      const { wrapper } = doMount({ zoomFactor: 0.53 });

      const input = wrapper.find(".zoom-input");
      input.element.value = "33%";
      await input.trigger("keydown.enter");

      expect(input.element.value).toBe("33%");
    });

    it("parses input without % sign", async () => {
      const { wrapper } = doMount({ zoomFactor: 0.53 });

      const input = wrapper.find(".zoom-input");
      input.element.value = "44";
      await input.trigger("keydown.enter");

      expect(input.element.value).toBe("44%");
    });

    it("ignores invalid input", async () => {
      const { wrapper } = doMount({ zoomFactor: 0.63 });

      const input = wrapper.find(".zoom-input");
      input.element.value = "asdf";
      await input.trigger("keydown.enter");

      expect(input.element.value).toBe("63%");
    });

    it("ignores any input on focus out", () => {
      const { wrapper } = doMount({ zoomFactor: 0.63 });

      const input = wrapper.find(".zoom-input");
      input.element.value = "99";
      input.trigger("focusout");

      expect(input.element.value).toBe("63%");
    });
  });

  it("dispatches action on click of item", () => {
    const { wrapper, $shortcuts } = doMount({ zoomFactor: 0.63 });

    wrapper
      .findComponent(SubMenu)
      .vm.$emit("item-click", null, { name: "shortcut" });

    expect($shortcuts.dispatch).toHaveBeenCalledWith("shortcut");
  });

  it("zooms in and out on mousewheel", async () => {
    const { wrapper, mockedStores } = doMount({ zoomFactor: 0.63 });

    const input = wrapper.find(".zoom-input");
    await input.trigger("wheel", { deltaY: 1 });

    expect(mockedStores.canvasStore.zoomCentered).toHaveBeenCalledWith({
      delta: -1,
    });

    await input.trigger("wheel", { deltaY: -1 });

    expect(mockedStores.canvasStore.zoomCentered).toHaveBeenCalledWith({
      delta: 1,
    });
  });
});
