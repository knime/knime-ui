import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import SplitPanel from "../SplitPanel.vue";
import Splitter from "../Splitter.vue";
import { nextTick } from "vue";

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

    const checkSecondarySize = (size: number) => {
      const unit = usePixel ? "px" : "%";
      const splitter = wrapper.findComponent(".vue-splitter");
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
    const dragSplitter = async (pageX: number, pageY: number) => {
      const splitter = wrapper.find(".splitter");
      await splitter.trigger("mousedown", { offsetY: 10, offsetX: 10 });

      // this mocks it for EVERY html element but that should not be a problem in this test
      Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
        configurable: true,
        value: 600,
      });
      Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
        configurable: true,
        value: 600,
      });

      const move = new MouseEvent("mousemove", {
        buttons: 1,
      });
      // @ts-ignore
      move.pageX = pageX;
      // @ts-ignore
      move.pageY = pageY;
      window.dispatchEvent(move);

      window.dispatchEvent(new MouseEvent("mouseup"));

      await nextTick();
    };

    return { wrapper, checkSecondarySize, dragSplitter };
  };

  it("sets the size correctly", () => {
    const { checkSecondarySize } = doMount();

    checkSecondarySize(45);
  });

  it("sets the size correctly in pixel mode", () => {
    const { checkSecondarySize } = doMount({
      usePixel: true,
      secondarySize: 320,
    });

    checkSecondarySize(320);
  });

  it("closes panel on click", async () => {
    const { wrapper, checkSecondarySize } = doMount();

    checkSecondarySize(45);
    await wrapper.find(".splitter").trigger("click");
    checkSecondarySize(0);
  });

  it("opens panel on click", async () => {
    const { wrapper, checkSecondarySize } = doMount();
    checkSecondarySize(45);

    await wrapper.find(".splitter").trigger("click");
    checkSecondarySize(0);

    await wrapper.find(".splitter").trigger("click");
    checkSecondarySize(45);
  });

  it("snaps to close", async () => {
    const { dragSplitter, checkSecondarySize } = doMount({
      usePixel: true,
      secondaryMinSize: 0,
      secondarySnapSize: 300,
    });

    checkSecondarySize(300);
    await dragSplitter(300, 320);
    checkSecondarySize(0);
  });

  it("honors min size", async () => {
    const { dragSplitter, checkSecondarySize } = doMount({
      usePixel: true,
      secondarySize: 300,
      secondaryMinSize: 200,
      secondarySnapSize: 0,
    });

    checkSecondarySize(300);
    await dragSplitter(300, 420); // would be 180px
    checkSecondarySize(200);
  });

  it("resizes on drag", async () => {
    const { dragSplitter, checkSecondarySize } = doMount();

    await dragSplitter(300, 400);
    checkSecondarySize(34.84);
  });

  it.each(["down", "up", "left", "right"])(
    "opens to last resized size for direction=%s",
    async (direction: string) => {
      const { wrapper, checkSecondarySize } = doMount({
        direction,
      });

      const splitter = wrapper.findComponent(Splitter);

      splitter.vm.$emit("update:percent", 42);
      splitter.vm.$emit("drag-end");

      await nextTick();

      // close
      await wrapper.find(".splitter").trigger("click");
      checkSecondarySize(0);

      // open
      await wrapper.find(".splitter").trigger("click");
      checkSecondarySize(42);
    },
  );

  it("shows or hides the secondary panel with the show prop", async () => {
    const { wrapper, checkSecondarySize } = doMount({
      secondarySize: 32,
      showSecondaryPanel: false,
    });
    const secondaryWrapper = wrapper.find(".secondary-wrapper").element;

    checkSecondarySize(0);
    expect(secondaryWrapper.childElementCount).toBe(0);

    await wrapper.setProps({ showSecondaryPanel: true });

    checkSecondarySize(32);
    expect(secondaryWrapper.childElementCount).toBe(1);
  });
});
