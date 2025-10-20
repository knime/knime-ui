import { describe, expect, it } from "vitest";
import { shallowMount } from "@vue/test-utils";

import * as $shapes from "@/style/shapes";
import Tooltip from "../Tooltip.vue";

describe("Tooltip", () => {
  type ComponentProps = InstanceType<typeof Tooltip>["$props"];

  const doShallowMount = (props?: ComponentProps) =>
    shallowMount(Tooltip, { props, global: { mocks: { $shapes } } });

  it("renders", () => {
    const wrapper = doShallowMount();
    expect(wrapper.find("div").exists()).toBeTruthy();
  });

  it("displays text", () => {
    const wrapper = doShallowMount({ text: "foo" });
    expect(wrapper.find("p").text()).toBe("foo");
    expect(wrapper.find(".title").exists()).toBe(false);
  });

  it("displays title", () => {
    const wrapper = doShallowMount({ title: "bar" });
    expect(wrapper.find(".title").text()).toBe("bar");
    expect(wrapper.find("p").exists()).toBe(false);
  });

  it("respects type", () => {
    const wrapper = doShallowMount();
    expect(wrapper.find(".tooltip").classes()).not.toContain("error");

    const errorWrapper = doShallowMount({ type: "error" });
    expect(errorWrapper.find(".tooltip").classes()).toContain("error");
  });

  it("respects orientation - default bottom", () => {
    const wrapper = doShallowMount();
    expect(wrapper.find(".tooltip").classes()).not.toContain("top");
    expect(wrapper.find(".tooltip").classes()).toContain("bottom");

    const topWrapper = doShallowMount({ orientation: "top" });
    expect(topWrapper.find(".tooltip").classes()).toContain("top");
    expect(topWrapper.find(".tooltip").classes()).not.toContain("bottom");
  });

  it("allows positioning", () => {
    const props = { x: 123, y: 345, gap: 10 };
    const wrapper = doShallowMount(props);

    let gap = props.gap + Math.SQRT1_2 * $shapes.tooltipArrowSize;
    expect(wrapper.attributes("style")).toContain("left: 123px;");
    expect(wrapper.attributes("style")).toContain("top: 345px;");
    expect(wrapper.attributes("style")).toContain(`--gap-size: ${gap}`);
    expect(wrapper.attributes("style")).toContain(
      `--arrow-size: ${$shapes.tooltipArrowSize}`,
    );
  });

  it("sets maximum size", () => {
    const wrapper = doShallowMount();
    expect(wrapper.attributes("style")).toContain(
      `max-width: ${$shapes.tooltipMaxWidth}`,
    );
    expect(wrapper.find(".scroller").attributes("style")).toContain(
      `max-height: ${$shapes.tooltipMaxHeight}`,
    );
  });

  describe("hoverable", () => {
    it("should have the `hoverable` class when the prop is set", () => {
      const wrapper = doShallowMount({ hoverable: true });
      expect(wrapper.classes()).toContain("hoverable");
    });

    it("should not have the `hoverable` class when the prop is set", () => {
      const wrapper = doShallowMount();
      expect(wrapper.classes()).not.toContain("hoverable");
    });
  });
});
