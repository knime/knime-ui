import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import SplitPanel from "../SplitPanel.vue";
import Splitter from "../Splitter.vue";

describe("SplitPanel", () => {
  const doMount = (propsOverride = {}) => {
    const props = {
      direction: "down",
      secondarySize: 45,
      secondaryMinSize: 15,
      showSecondaryPanel: true,
      ...propsOverride,
    };
    const wrapper = mount(SplitPanel, {
      // @ts-expect-error
      props,
      slots: {
        default: "<p>main content</p>",
        secondary: "<p>secondary content</p>",
      },
    });

    const direction = wrapper.props("direction");
    const usePixel = wrapper.props("usePixel");

    const isHorizontal = ["up", "down"].includes(direction!);
    const isReverse = ["left", "up"].includes(direction!);

    const expectSecondarySize = (size: number) => {
      const unit = usePixel ? "px" : "%";
      const splitter = wrapper.findComponent(".base-splitter");
      const styles = splitter.attributes("style")!;

      const sizeLine = isReverse
        ? `${size}${unit} auto 1fr`
        : `1fr auto ${size}${unit}`;
      const gridTemplate = isHorizontal
        ? `grid-template: ${sizeLine} / none;`
        : `grid-template: none / ${sizeLine};`;

      expect(styles).toContain(gridTemplate);

      return { styles, gridTemplate };
    };
    const dragSplitter = async (x: number, y: number) => {
      const pointerId = -1;
      const splitter = wrapper.find(".splitter");
      await splitter.trigger("pointerdown", {
        offsetY: 10,
        offsetX: 10,
        pointerId,
      });

      // this mocks it for EVERY html element but that should not be a problem in this test
      Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
        configurable: true,
        value: 600,
      });
      Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
        configurable: true,
        value: 600,
      });

      const move = new PointerEvent("pointermove", {
        buttons: 1,
        pointerId,
      });

      // @ts-expect-error
      move.pageX = x;
      // @ts-expect-error
      move.pageY = y;

      window.dispatchEvent(move);

      window.dispatchEvent(new PointerEvent("pointerup", { pointerId }));

      await nextTick();
    };

    return { wrapper, expectSecondarySize, dragSplitter };
  };

  it("sets the size correctly", () => {
    const { expectSecondarySize } = doMount();

    expectSecondarySize(45);
  });

  it("sets the size correctly in pixel mode", () => {
    const { expectSecondarySize } = doMount({
      usePixel: true,
      secondarySize: 320,
    });

    expectSecondarySize(320);
  });

  it("closes panel on click", async () => {
    const { wrapper, expectSecondarySize } = doMount();

    expectSecondarySize(45);
    await wrapper.find(".splitter").trigger("click");
    expectSecondarySize(0);
  });

  it("opens panel on click", async () => {
    const { wrapper, expectSecondarySize } = doMount();
    expectSecondarySize(45);

    await wrapper.find(".splitter").trigger("click");
    expectSecondarySize(0);

    await wrapper.find(".splitter").trigger("click");
    expectSecondarySize(45);
  });

  it("snaps to close", async () => {
    const { dragSplitter, expectSecondarySize } = doMount({
      usePixel: true,
      secondaryMinSize: 0,
      secondarySnapSize: 300,
    });

    expectSecondarySize(300);
    await dragSplitter(300, 320);
    expectSecondarySize(0);
  });

  it("honors min size", async () => {
    const { dragSplitter, expectSecondarySize } = doMount({
      usePixel: true,
      secondarySize: 300,
      secondaryMinSize: 200,
      secondarySnapSize: 0,
    });

    expectSecondarySize(300);
    await dragSplitter(300, 420); // would be 180px
    expectSecondarySize(200);
  });

  it("resizes on drag", async () => {
    const { dragSplitter, expectSecondarySize } = doMount();

    await dragSplitter(300, 400);
    expectSecondarySize(34.84);
  });

  it.each(["down", "up", "left", "right"])(
    "opens to last resized size for direction=%s",
    async (direction: string) => {
      const { wrapper, expectSecondarySize } = doMount({
        direction,
      });

      const splitter = wrapper.findComponent(Splitter);

      splitter.vm.$emit("update:percent", 42);
      splitter.vm.$emit("drag-end");

      await nextTick();

      // close
      await wrapper.find(".splitter").trigger("click");
      expectSecondarySize(0);

      // open
      await wrapper.find(".splitter").trigger("click");
      expectSecondarySize(42);
    },
  );

  it("shows or hides the secondary panel with the show prop", async () => {
    const { wrapper, expectSecondarySize } = doMount({
      secondarySize: 32,
      showSecondaryPanel: false,
    });
    const secondaryWrapper = wrapper.find(".secondary-wrapper").element;

    expectSecondarySize(0);
    expect(secondaryWrapper.childElementCount).toBe(0);

    await wrapper.setProps({ showSecondaryPanel: true });

    expectSecondarySize(32);
    expect(secondaryWrapper.childElementCount).toBe(1);
  });
});
