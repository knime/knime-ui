import { nextTick } from "vue";
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import SplitPanel from "../SplitPanel.vue";

import { Splitpanes } from "splitpanes";

describe("SplitPanel", () => {
  const doMount = (propsOverride = {}) => {
    const props = {
      id: "underTest",
      direction: "down",
      secondarySize: 45,
      secondaryMinSize: 15,
      showSecondaryPanel: true,
      ...propsOverride,
    };
    const wrapper = mount(SplitPanel, {
      props,
    });

    // helper to create correct events for splitpanes based on the direction
    const resizeObject = (secondarySize: number) =>
      ["down", "right"].includes(props.direction)
        ? [{ size: 100 - secondarySize }, { size: secondarySize }]
        : [{ size: secondarySize }, { size: 100 - secondarySize }];
    return { wrapper, resizeObject };
  };

  it("sets the size correctly for both panels", () => {
    const { wrapper } = doMount();

    const main = wrapper.findComponent(".main-panel");
    expect(main.props("size")).toBe(55);
    const secondary = wrapper.findComponent(".secondary-panel");
    expect(secondary.props("size")).toBe(45);
  });

  it("closes panel on click", async () => {
    const { wrapper } = doMount();

    const main = wrapper.findComponent(".main-panel");
    expect(main.props("size")).toBe(55);
    const secondary = wrapper.findComponent(".secondary-panel");
    expect(secondary.props("size")).toBe(45);

    await wrapper.find(".splitpanes__splitter").trigger("click");

    expect(main.props("size")).toBe(100);
    expect(secondary.props("size")).toBe(0);
  });

  it("opens panel on click", async () => {
    const { wrapper } = doMount();

    const main = wrapper.findComponent(".main-panel");
    const secondary = wrapper.findComponent(".secondary-panel");

    // close
    await wrapper.find(".splitpanes__splitter").trigger("click");

    expect(main.props("size")).toBe(100);
    expect(secondary.props("size")).toBe(0);

    // open
    await wrapper.find(".splitpanes__splitter").trigger("click");

    expect(main.props("size")).toBe(55);
    expect(secondary.props("size")).toBe(45);
  });

  it("snaps to close", async () => {
    const { wrapper, resizeObject } = doMount();

    const main = wrapper.findComponent(".main-panel");
    const secondary = wrapper.findComponent(".secondary-panel");

    const splitpanes = wrapper.findComponent(Splitpanes);
    splitpanes.vm.$emit("resize", resizeObject(10));
    splitpanes.vm.$emit("resized", resizeObject(10));

    await nextTick();

    expect(main.props("size")).toBe(100);
    expect(secondary.props("size")).toBe(0);
  });

  it("resizes on drag", async () => {
    const { wrapper, resizeObject } = doMount();

    const main = wrapper.findComponent(".main-panel");
    const secondary = wrapper.findComponent(".secondary-panel");

    const splitpanes = wrapper.findComponent(Splitpanes);
    splitpanes.vm.$emit("resize", resizeObject(32));
    splitpanes.vm.$emit("resized", resizeObject(32));

    await nextTick();

    expect(main.props("size")).toBe(68);
    expect(secondary.props("size")).toBe(32);
  });

  it.each(["down", "up", "left"])(
    "opens to last resized size for direction=%s",
    async (direction: string) => {
      const { wrapper, resizeObject } = doMount({ direction });

      const secondary = wrapper.findComponent(".secondary-panel");

      const splitpanes = wrapper.findComponent(Splitpanes);
      splitpanes.vm.$emit("resize", resizeObject(42));
      splitpanes.vm.$emit("resized", resizeObject(42));

      await nextTick();

      // close
      await wrapper.find(".splitpanes__splitter").trigger("click");
      expect(secondary.props("size")).toBe(0);

      // open
      await wrapper.find(".splitpanes__splitter").trigger("click");

      expect(secondary.props("size")).toBe(42);
    },
  );

  it("does not show second panel if prop is set to false", () => {
    const { wrapper } = doMount({
      showSecondaryPanel: false,
    });

    expect(wrapper.findComponent(".main-panel").exists()).toBe(true);
    expect(wrapper.findComponent(".secondary-panel").exists()).toBe(false);
  });
});
