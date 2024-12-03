import { beforeEach, describe, expect, it } from "vitest";
import { shallowMount } from "@vue/test-utils";

import ResizableComponentWrapper, {
  type Props,
} from "../ResizableComponentWrapper.vue";
import type { BoundingBox } from "../useDataValueView";

const props: Props = {
  minSize: { width: 100, height: 100 },
  rectState: {
    width: 200,
    height: 200,
    left: 0,
    top: 0,
  },
};

describe("ResizableComponentWrapper", () => {
  const doShallowMount = (customProps: Partial<Props> = {}) => {
    const wrapper = shallowMount(ResizableComponentWrapper, {
      props: { ...props, ...customProps },
      slots: {
        default: "<div>Content</div>",
      },
    });
    return { wrapper };
  };

  const triggerPointer = async (
    eventName: "down" | "move" | "up",
    wrapper,
    selector,
    { clientX, clientY },
  ) => {
    await wrapper
      .find(`.resize-bar${selector}`)
      .trigger(`pointer${eventName}`, { clientX, clientY, pointerId: 1 });
  };

  it("renders eight resize bars", () => {
    const { wrapper } = doShallowMount();
    expect(wrapper.findAll(".resize-bar")).toHaveLength(8);
  });

  it("does not emit a custom resize on pointer move after pointer up", async () => {
    const { wrapper } = doShallowMount();
    await triggerPointer("down", wrapper, ".north.west", {
      clientX: 0,
      clientY: 0,
    });
    await triggerPointer("move", wrapper, ".north.west", {
      clientX: 50,
      clientY: 50,
    });
    expect(wrapper.emitted("custom-resize")).toHaveLength(1);

    await triggerPointer("up", wrapper, ".north.west", {
      clientX: 0,
      clientY: 0,
    });
    await triggerPointer("move", wrapper, ".north.west", {
      clientX: 50,
      clientY: 50,
    });
    expect(wrapper.emitted("custom-resize")).toHaveLength(1);
  });

  describe("resizing each bar in each direction", () => {
    it.each([
      [".vertical.north", [50, 40], { height: 160, top: 40 }],
      [".vertical.north", [-50, -40], { height: 240, top: -40 }],
      [".horizontal.east", [50, 40], { width: 250 }],
      [".horizontal.east", [-50, -40], { width: 150 }],
      [".vertical.south", [50, 40], { height: 240 }],
      [".vertical.south", [-50, -40], { height: 160 }],
      [".horizontal.west", [50, 40], { width: 150, left: 50 }],
      [".horizontal.west", [-50, -40], { width: 250, left: -50 }],
      [".north.east", [50, 40], { height: 160, top: 40, width: 250 }],
      [".north.east", [-50, -40], { height: 240, top: -40, width: 150 }],
      [".south.east", [50, 40], { height: 240, width: 250 }],
      [".south.east", [-50, -40], { height: 160, width: 150 }],
      [".south.west", [50, 40], { height: 240, width: 150, left: 50 }],
      [".south.west", [-50, -40], { height: 160, width: 250, left: -50 }],
      [".north.west", [50, 40], { width: 150, left: 50, height: 160, top: 40 }],
      [
        ".north.west",
        [-50, -40],
        { width: 250, left: -50, height: 240, top: -40 },
      ],
    ])(
      "emits the correct final rect of the %s handle in direction (x, y) %s",
      async (
        selector,
        [clientX, clientY],
        expectedRect: Partial<BoundingBox>,
      ) => {
        const { wrapper } = doShallowMount();
        await triggerPointer("down", wrapper, selector, {
          clientX: 0,
          clientY: 0,
        });
        await triggerPointer("move", wrapper, selector, {
          clientX,
          clientY,
        });
        expect(wrapper.emitted("custom-resize")?.[0][0]).toEqual({
          height: expectedRect.height,
          width: expectedRect.width,
          top: expectedRect.top,
          left: expectedRect.left,
        });
      },
    );
  });

  describe("resizing to minimum", () => {
    it.each([
      [".vertical.north", [1000, 1000], { height: 100, top: 100 }],
      [".horizontal.east", [-1000, -1000], { width: 100 }],
      [".vertical.south", [-1000, -1000], { height: 100 }],
      [".horizontal.west", [1000, 1000], { width: 100, left: 100 }],
      [".north.east", [-1000, 1000], { height: 100, width: 100, top: 100 }],
      [".south.east", [-1000, -1000], { height: 100, width: 100 }],
      [".south.west", [1000, -1000], { height: 100, width: 100, left: 100 }],
      [
        ".north.west",
        [1000, 1000],
        { height: 100, width: 100, top: 100, left: 100 },
      ],
    ])(
      "emits the min size if the %s handle is dragged across the minimum",
      async (
        selector,
        [clientX, clientY],
        expectedRect: Partial<BoundingBox>,
      ) => {
        const { wrapper } = doShallowMount();
        await triggerPointer("down", wrapper, selector, {
          clientX: 0,
          clientY: 0,
        });
        await triggerPointer("move", wrapper, selector, {
          clientX,
          clientY,
        });
        expect(wrapper.emitted("custom-resize")?.[0][0]).toEqual({
          height: expectedRect.height,
          width: expectedRect.width,
          top: expectedRect.top,
          left: expectedRect.left,
        });
      },
    );

    it.each([
      [".vertical.north"],
      [".horizontal.east"],
      [".vertical.south"],
      [".horizontal.west"],
      [".north.east"],
      [".south.east"],
      [".south.west"],
      [".north.west"],
    ])(
      "sets the min-size class if the %s handle cursor is shown and the view size is minimal",
      async (selector) => {
        const { wrapper } = doShallowMount();
        await wrapper.setProps({
          rectState: { width: 100, height: 100, left: 0, top: 0 },
        });
        expect(wrapper.find(selector).classes()).toContain("has-min-size");
      },
    );

    it("uses the start inset as min inset when the size on pointerdown is the min size", async () => {
      const { wrapper } = doShallowMount();
      await wrapper.setProps({
        rectState: {
          width: 100,
          height: 100,
          left: 0,
          top: 0,
        },
      });
      await triggerPointer("down", wrapper, ".north.west", {
        clientX: 0,
        clientY: 0,
      });
      await triggerPointer("move", wrapper, ".north.west", {
        clientX: 50,
        clientY: 50,
      });
      expect(wrapper.emitted("custom-resize")?.[0][0]).toStrictEqual({
        height: 100,
        left: 0,
        top: 0,
        width: 100,
      });
    });
  });

  describe("resizing to maximum", () => {
    beforeEach(() => {
      window.innerHeight = 500;
      window.innerWidth = 500;
      window.dispatchEvent(new Event("resize"));
    });

    it.each([
      [".vertical.north", [-2000, -2000], { height: 500, top: -300 }],
      [".horizontal.east", [2000, 2000], { width: 500 }],
      [".vertical.south", [2000, 2000], { height: 500 }],
      [".horizontal.west", [-2000, -2000], { width: 500, left: -300 }],
      [".north.east", [2000, -2000], { height: 500, width: 500, top: -300 }],
      [".south.east", [2000, 2000], { height: 500, width: 500 }],
      [".south.west", [-2000, 2000], { height: 500, width: 500, left: -300 }],
      [
        ".north.west",
        [-2000, -2000],
        { height: 500, width: 500, top: -300, left: -300 },
      ],
    ])(
      "emits the window size if the %s handle is dragged across the window size and no max size is given",
      async (
        selector,
        [clientX, clientY],
        expectedRect: Partial<BoundingBox>,
      ) => {
        const { wrapper } = doShallowMount();
        await triggerPointer("down", wrapper, selector, {
          clientX: 0,
          clientY: 0,
        });
        await triggerPointer("move", wrapper, selector, {
          clientX,
          clientY,
        });
        expect(wrapper.emitted("custom-resize")?.[0][0]).toEqual({
          height: expectedRect.height,
          width: expectedRect.width,
          top: expectedRect.top,
          left: expectedRect.left,
        });
      },
    );

    it.each([
      [".vertical.north"],
      [".horizontal.east"],
      [".vertical.south"],
      [".horizontal.west"],
      [".north.east"],
      [".south.east"],
      [".south.west"],
      [".north.west"],
    ])(
      "sets the max-size class if the %s handle cursor is shown and the view size is maximal",
      async (selector) => {
        const { wrapper } = doShallowMount();
        await wrapper.setProps({
          rectState: { width: 1000, height: 1000, left: 0, top: 0 },
        });
        expect(wrapper.find(selector).classes()).toContain("has-max-size");
      },
    );

    it("uses the start inset as max inset when the size on pointerdown is the max size", async () => {
      const { wrapper } = doShallowMount();
      await wrapper.setProps({
        rectState: {
          width: 500,
          height: 500,
          left: 0,
          top: 0,
        },
      });
      await triggerPointer("down", wrapper, ".north.west", {
        clientX: 0,
        clientY: 0,
      });
      await triggerPointer("move", wrapper, ".north.west", {
        clientX: -50,
        clientY: -50,
      });
      expect(wrapper.emitted("custom-resize")?.[0][0]).toStrictEqual({
        height: 500,
        left: 0,
        top: 0,
        width: 500,
      });
    });

    it("respects a given max size", async () => {
      const { wrapper } = doShallowMount();
      await wrapper.setProps({
        maxSize: { width: 300, height: 250 },
      });
      await triggerPointer("down", wrapper, ".north.east", {
        clientX: 0,
        clientY: 0,
      });
      await triggerPointer("move", wrapper, ".north.east", {
        clientX: 2000,
        clientY: -2000,
      });
      expect(wrapper.emitted("custom-resize")?.[0][0]).toEqual({
        height: 250,
        width: 300,
        top: -50,
      });
    });
  });
});
