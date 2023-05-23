import { expect, describe, it } from "vitest";
import { mount } from "@vue/test-utils";
import Page from "../Page.vue";

describe("Page.vue", () => {
  const doMount = ({ props = {}, slot = { template: "<div></div>" } } = {}) => {
    const wrapper = mount(Page, {
      propsData: props,
      slots: {
        default: slot,
      },
    });

    return { wrapper };
  };

  it("should render slots", () => {
    const { wrapper } = doMount({
      slot: { template: '<div class="child" />' },
    });

    expect(wrapper.find(".child").exists()).toBe(true);
  });

  it("should set auto scroll mode", () => {
    const { wrapper } = doMount({ props: { scrollMode: "auto" } });

    expect(wrapper.classes()).toContain("scroll-auto");
  });

  it("should set static scroll mode", () => {
    const { wrapper } = doMount({ props: { scrollMode: "scroll" } });

    expect(wrapper.classes()).toContain("scroll-static");
  });

  it("should use the background", () => {
    const { wrapper } = doMount({ props: { withBackground: true } });

    expect(wrapper.classes()).toContain("with-background");
  });
});
