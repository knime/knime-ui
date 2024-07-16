import { SubMenu } from "@knime/components";
import { expect, describe, beforeEach, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

import OptionalSubMenuActionButton from "../OptionalSubMenuActionButton.vue";
import { nextTick } from "vue";

describe("OptionalSubMenuActionButton.vue", () => {
  const doMount = ({ props = {} } = {}) => {
    const wrapper = mount(OptionalSubMenuActionButton, {
      props,
    });

    return { wrapper };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a button if item has no children", async () => {
    const item = {
      text: "Button Text",
    };
    const { wrapper } = doMount({
      props: {
        item,
      },
    });

    // button is there
    const button = wrapper.find(".item-button");
    expect(button.exists()).toBe(true);
    expect(wrapper.text()).toMatch("Button Text");

    // click triggers event
    await wrapper.find(".item-button").trigger("click");
    expect(wrapper.emitted("click")[0][0]).toStrictEqual(item);
  });

  it("renders a SubMenu if item has children", async () => {
    const item = {
      text: "Dropdown Button",
      children: [
        {
          text: "Click Me",
        },
      ],
    };
    const { wrapper } = doMount({
      props: {
        item,
      },
    });

    expect(wrapper.findComponent(SubMenu).exists()).toBe(true);
    expect(wrapper.find("button").text()).toBe("Dropdown Button");

    // open submenu
    await wrapper.find(".submenu-toggle").trigger("click");

    // click triggers event
    wrapper
      .findComponent(SubMenu)
      .vm.$emit("item-click", null, item.children[0]);
    await nextTick();

    expect(wrapper.emitted("click")[0][0]).toStrictEqual(item.children[0]);
  });
});
