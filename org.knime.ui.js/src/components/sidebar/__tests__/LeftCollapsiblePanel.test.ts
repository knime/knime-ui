import { describe, expect, it } from "vitest";
import { shallowMount } from "@vue/test-utils";

import SwitchIcon from "@knime/styles/img/icons/arrow-prev.svg";

import { mockStores } from "@/test/utils/mockStores";
import LeftCollapsiblePanel from "../LeftCollapsiblePanel.vue";

describe("LeftCollapsiblePanel.vue", () => {
  const doShallowMount = (customProps = {}) => {
    const { testingPinia } = mockStores();

    return shallowMount(LeftCollapsiblePanel, {
      props: {
        title: "hover-title",
        width: "200px",
        ...customProps,
      },
      global: {
        plugins: [testingPinia],
      },
    });
  };

  it("is initially closed", () => {
    const wrapper = doShallowMount();

    expect(wrapper.find(".container").attributes("style")).toBe("width: 0px;");
  });

  it("is opened via props", async () => {
    const wrapper = doShallowMount();

    expect(wrapper.find(".container").attributes("style")).toMatch(
      "width: 0px",
    );

    await wrapper.setProps({ expanded: true });
    expect(wrapper.find(".container").attributes("style")).toMatch(
      "width: 200px",
    );
  });

  it("width matches prop", () => {
    const wrapper = doShallowMount({ width: "400px", expanded: true });

    expect(wrapper.find(".container").attributes("style")).toMatch(
      "width: 400px",
    );
  });

  it('emits "toggle-expand" event when clicking on button', () => {
    const wrapper = doShallowMount();

    wrapper.find("button").trigger("click");
    expect(wrapper.emitted("toggleExpand")).toBeDefined();
  });

  it('disables button if "disabled" prop is true', () => {
    const wrapper = doShallowMount({ disabled: true });

    const button = wrapper.find("button");
    expect(button.element.disabled).toBe(true);
  });

  describe("open panel", () => {
    it("doesn’t display a hover title", () => {
      const wrapper = doShallowMount({ expanded: true });
      expect(wrapper.find("button").attributes().title).toBeUndefined();
    });

    it("icon is not flipped", () => {
      const wrapper = doShallowMount({ expanded: true });
      expect(wrapper.findComponent(SwitchIcon).props().style).toBeUndefined();
    });
  });

  describe("closed panel", () => {
    it("collapses panel", () => {
      const wrapper = doShallowMount();
      expect(wrapper.find(".container").attributes().style).toBe("width: 0px;");
    });

    it("shows hover title", () => {
      const wrapper = doShallowMount();
      expect(wrapper.find("button").attributes().title).toBe("hover-title");
    });

    it("flips icon", () => {
      const wrapper = doShallowMount();
      expect(wrapper.findComponent(SwitchIcon).attributes().style).toBe(
        "transform: scaleX(-1);",
      );
    });
  });
});
