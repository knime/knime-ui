import { beforeEach, describe, expect, it } from "vitest";
import { shallowMount } from "@vue/test-utils";

import * as $shapes from "@/style/shapes";
import Tooltip from "../Tooltip.vue";

describe("Tooltip", () => {
  let mocks, doShallowMount, props, wrapper;

  beforeEach(() => {
    wrapper = null;
    props = {};
    mocks = { $shapes };
    doShallowMount = () => {
      wrapper = shallowMount(Tooltip, { props, global: { mocks } });
    };
  });

  it("renders", () => {
    doShallowMount();
    expect(wrapper.find("div").exists()).toBeTruthy();
  });

  it("displays text", () => {
    props = {
      text: "foo",
    };
    doShallowMount();
    expect(wrapper.find("p").text()).toBe("foo");
    expect(wrapper.find(".title").exists()).toBe(false);
  });

  it("displays title", () => {
    props = {
      title: "bar",
    };
    doShallowMount();
    expect(wrapper.find(".title").text()).toBe("bar");
    expect(wrapper.find("p").exists()).toBe(false);
  });

  it("respects type", () => {
    doShallowMount();
    expect(wrapper.find(".tooltip").classes()).not.toContain("error");

    props.type = "error";
    doShallowMount();
    expect(wrapper.find(".tooltip").classes()).toContain("error");
  });

  it("respects orientation - default bottom", () => {
    doShallowMount();
    expect(wrapper.find(".tooltip").classes()).not.toContain("top");
    expect(wrapper.find(".tooltip").classes()).toContain("bottom");

    props.orientation = "top";
    doShallowMount();
    expect(wrapper.find(".tooltip").classes()).toContain("top");
    expect(wrapper.find(".tooltip").classes()).not.toContain("bottom");
  });

  it("allows positioning", () => {
    props.x = 123;
    props.y = 345;
    props.gap = 10;
    doShallowMount();

    let gap = props.gap + Math.SQRT1_2 * $shapes.tooltipArrowSize;
    expect(wrapper.attributes("style")).toContain("left: 123px;");
    expect(wrapper.attributes("style")).toContain("top: 345px;");
    expect(wrapper.attributes("style")).toContain(`--gap-size: ${gap}`);
    expect(wrapper.attributes("style")).toContain(
      `--arrow-size: ${$shapes.tooltipArrowSize}`,
    );
  });

  it("sets maximum size", () => {
    doShallowMount();
    expect(wrapper.attributes("style")).toContain(
      `max-width: ${$shapes.tooltipMaxWidth}`,
    );
    expect(wrapper.find(".scroller").attributes("style")).toContain(
      `max-height: ${$shapes.tooltipMaxHeight}`,
    );
  });

  describe("hoverable", () => {
    it("should have the `hoverable` class when the prop is set", () => {
      props.hoverable = true;
      doShallowMount();

      expect(wrapper.classes()).toContain("hoverable");
    });

    it("should not have the `hoverable` class when the prop is set", () => {
      doShallowMount();

      expect(wrapper.classes()).not.toContain("hoverable");
    });
  });
});
