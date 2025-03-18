import { describe, expect, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";

import * as $shapes from "@/style/shapes";
import { mockBoundingRect } from "@/test/utils";
import AutoSizeForeignObject from "../AutoSizeForeignObject.vue";

describe("AutoSizeForeignObject.vue", () => {
  const mockRectWidth = 232;
  const mockRectHeight = 129;
  const mockRectX = 42;
  const mockRectY = 31;

  // Wait for task queue to run until after next task in order to let
  // the component render the template otherwise we'd have to call nextTick twice
  // for this component, which is not very clean
  const flushTaskQueue = () => new Promise((r) => setTimeout(r, 10));

  const defaultProps = {
    parentWidth: $shapes.nodeSize,
    resizeKey: "",
    yOffset: 0,
  };

  const doShallowMount = ({ props = {} } = {}) => {
    // Mock ResizeObserver Class
    // eslint-disable-next-line func-style
    function ResizeObserverMock(callback) {
      this.callbackRef = callback;
      this.element = null;

      const disconnect = vi.fn();
      ResizeObserverMock.__trigger__ = (
        mockContentRect = { width: mockRectWidth, height: mockRectHeight },
      ) => {
        this.callbackRef([{ contentRect: mockContentRect }]);
      };

      ResizeObserverMock.disconnect = disconnect;

      this.observe = function (element) {
        this.element = element;
      };

      this.disconnect = disconnect;
    }

    window.ResizeObserver = ResizeObserverMock;

    mockBoundingRect({
      x: mockRectX,
      y: mockRectY,
      width: mockRectWidth,
      height: mockRectHeight,
    });

    const wrapper = shallowMount(AutoSizeForeignObject, {
      props: {
        ...defaultProps,
        ...props,
      },
      global: {
        mocks: { $shapes },
      },
    });

    return { wrapper, ResizeObserverMock };
  };

  it("should respect yOffset", async () => {
    const { wrapper } = doShallowMount();

    expect(wrapper.attributes()).toEqual(
      expect.objectContaining({
        y: "0",
      }),
    );

    await wrapper.setProps({ yOffset: 12 });

    expect(wrapper.attributes()).toEqual(
      expect.objectContaining({
        y: "12",
      }),
    );
  });

  it("should emit the proper width and height", async () => {
    const { wrapper, ResizeObserverMock } = doShallowMount();

    await flushTaskQueue();
    ResizeObserverMock.__trigger__({
      width: mockRectWidth,
      height: mockRectHeight,
    });

    expect(wrapper.emitted("widthChange")[0][0]).toBe(mockRectWidth);
    expect(wrapper.emitted("heightChange")[0][0]).toBe(mockRectHeight);
  });

  it("should adjust dimensions on mount", async () => {
    const { wrapper, ResizeObserverMock } = doShallowMount();

    await flushTaskQueue();
    ResizeObserverMock.__trigger__({
      width: mockRectWidth,
      height: mockRectHeight,
    });
    await flushTaskQueue();

    expect(wrapper.attributes()).toEqual(
      expect.objectContaining({
        height: mockRectHeight.toString(),
        width: mockRectWidth.toString(),
        x: ((defaultProps.parentWidth - mockRectWidth) / 2).toString(),
      }),
    );
  });

  it("should respect offsetByHeight", async () => {
    const yOffset = 10;
    const expectedY = -mockRectHeight + yOffset;

    const { wrapper, ResizeObserverMock } = doShallowMount({
      props: { yOffset, offsetByHeight: true },
    });

    await flushTaskQueue();
    ResizeObserverMock.__trigger__();
    await flushTaskQueue();

    expect(wrapper.attributes()).toEqual(
      expect.objectContaining({
        y: expectedY.toString(),
      }),
    );
  });
});
