import { describe, expect, it } from "vitest";
import { mount, shallowMount } from "@vue/test-utils";

import ActionButton from "../ActionButton.vue";

describe("ActionButton", () => {
  it("renders action button with slot icon", () => {
    let wrapper = mount(ActionButton, {
      slots: { default: [{ template: "<svg />" }] },
    });
    expect(wrapper.find("g").classes().includes("disabled")).toBe(false);
    expect(wrapper.find("circle").classes().includes("primary")).toBe(false);
    expect(wrapper.find("svg").exists()).toBe(true);
  });

  it("renders disabled button with specified location", () => {
    let wrapper = shallowMount(ActionButton, {
      props: {
        disabled: true,
        x: 50,
      },
    });
    expect(wrapper.find("g").classes().includes("disabled")).toBe(true);
    expect(wrapper.find("circle").attributes().cx).toBe("50");
  });

  it("renders primary button", () => {
    let wrapper = shallowMount(ActionButton, {
      props: {
        primary: true,
      },
    });
    expect(wrapper.find("circle").classes().includes("primary")).toBe(true);
  });

  it("fires event on click", () => {
    let wrapper = shallowMount(ActionButton);
    wrapper.find("g").trigger("click");
    expect(wrapper.emitted().click).toBeTruthy();
  });

  it("ignores non left-clicks", () => {
    let wrapper = shallowMount(ActionButton);
    for (let i = 1; i < 5; i++) {
      wrapper.find("g").trigger("click", { button: i });
      expect(wrapper.emitted("click")).toBeFalsy();
    }
  });

  it("blocks pointer down", () => {
    let wrapper = shallowMount(ActionButton);
    wrapper.find("g").trigger("pointerdown");
    expect(wrapper.emitted().click).toBeFalsy();
  });

  it("doesnt fire event when disabled", () => {
    let wrapper = shallowMount(ActionButton, {
      props: {
        disabled: true,
      },
    });
    wrapper.find("g").trigger("pointerdown");
    expect(wrapper.emitted().click).toBeFalsy();
  });
});
