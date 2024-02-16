import { describe, it, expect, vi } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import type { Bounds } from "@/api/gateway-api/generated-api";

import * as $shapes from "@/style/shapes.mjs";
import * as $colors from "@/style/colors.mjs";

import TransformControls, {
  TRANSFORM_RECT_OFFSET,
} from "../TransformControls.vue";
import {
  transformBounds,
  DIRECTIONS,
  getTransformControlPosition,
  getGridAdjustedBounds,
  type Directions,
} from "../transform-control-utils";
import { mockVuexStore } from "@/test/utils";
import { createSlottedChildComponent } from "@/test/utils/slottedChildComponent";

vi.mock("../transform-control-utils", async () => {
  const actual: any = await vi.importActual("../transform-control-utils");
  return {
    ...actual,
    transformBounds: vi.fn(),
    getGridAdjustedBounds: vi.fn(),
    getTransformControlPosition: vi.fn(),
  };
});

describe("TransformControls.vue", () => {
  const defaultProps: {
    initialValue: Bounds;
    showTransformControls: boolean;
    showSelection: boolean;
  } = {
    initialValue: {
      x: 10,
      y: 10,
      width: 100,
      height: 100,
    },
    showTransformControls: false,
    showSelection: false,
  };

  const mockedTransformBounds = vi.mocked(transformBounds).mockReturnValue({
    x: 40,
    y: 40,
    height: 100,
    width: 200,
  });

  const mockGetTransformControlPosition = vi
    .mocked(getTransformControlPosition)
    .mockReturnValue({
      x: 10,
      y: 10,
    });

  vi.mocked(getGridAdjustedBounds).mockReturnValue({
    ...defaultProps.initialValue,
  });

  const doMount = ({
    props = {},
    screenToCanvasCoordinatesMock = vi.fn().mockReturnValue(() => [5, 5]),
  } = {}) => {
    const { renderSlot, getSlottedChildComponent } =
      createSlottedChildComponent({
        slottedComponentTemplate: `<foreignObject
          id="slotted-component"
          v-bind="scope.transformedBounds">
        </foreignObject>`,
      });

    const $store = mockVuexStore({
      workflow: {
        state: {
          movePreviewDelta: { x: 0, y: 0 },
        },
      },
      canvas: {
        getters: {
          screenToCanvasCoordinates: screenToCanvasCoordinatesMock,
        },
        state: {
          zoomFactor: 1,
        },
      },
    });

    const wrapper = mount(TransformControls, {
      props: { ...defaultProps, ...props },
      slots: {
        default: renderSlot,
      },
      global: { plugins: [$store], mocks: { $shapes, $colors } },
    });

    return { wrapper, getSlottedChildComponent, $store };
  };

  const startDraggingControl = (
    wrapper: VueWrapper<any>,
    controlDirection: Directions,
  ) => {
    const control = wrapper.find(`.transform-control-${controlDirection}`);
    control.element.setPointerCapture = vi.fn();
    control.trigger("pointerdown");
  };

  const stopDraggingControl = (
    wrapper: VueWrapper<any>,
    controlDirection: Directions,
  ) => {
    const control = wrapper.find(`.transform-control-${controlDirection}`);
    control.element.releasePointerCapture = vi.fn();
    return control.trigger("pointerup");
  };

  it("should render the transform box", () => {
    const { wrapper } = doMount({ props: { showSelection: true } });

    const offsetBounds = {
      x: defaultProps.initialValue.x - TRANSFORM_RECT_OFFSET,
      y: defaultProps.initialValue.y - TRANSFORM_RECT_OFFSET,
      width: defaultProps.initialValue.width + TRANSFORM_RECT_OFFSET * 2,
      height: defaultProps.initialValue.height + TRANSFORM_RECT_OFFSET * 2,
    };

    const transformBox = wrapper.find("rect.transform-box");
    expect(transformBox.attributes("x")).toBe(offsetBounds.x.toString());
    expect(transformBox.attributes("y")).toBe(offsetBounds.y.toString());
    expect(transformBox.attributes("width")).toBe(
      offsetBounds.width.toString(),
    );
    expect(transformBox.attributes("height")).toBe(
      offsetBounds.height.toString(),
    );
  });

  it("should render the transform controls correctly", () => {
    const { wrapper } = doMount({ props: { showTransformControls: true } });

    const { initialValue: bounds } = defaultProps;
    expect(wrapper.findAll(".transform-control").length).toBe(
      DIRECTIONS.length,
    );

    DIRECTIONS.forEach((direction) => {
      const transformControl = wrapper.find(`.transform-control-${direction}`);
      expect(transformControl.exists()).toBe(true);

      expect(mockGetTransformControlPosition).toHaveBeenCalledWith({
        bounds: {
          x: bounds.x - TRANSFORM_RECT_OFFSET,
          y: bounds.y - TRANSFORM_RECT_OFFSET,
          width: bounds.width + TRANSFORM_RECT_OFFSET * 2,
          height: bounds.height + TRANSFORM_RECT_OFFSET * 2,
        },
        direction,
        controlSize: 6,
      });

      // output of the mock function
      expect(transformControl.attributes("x")).toBe("10");
      expect(transformControl.attributes("y")).toBe("10");
    });
  });

  it("should expose the transformed bounds on the default slot props", () => {
    const { wrapper, getSlottedChildComponent } = doMount();

    const { initialValue: bounds } = defaultProps;
    const slottedChild = getSlottedChildComponent(wrapper);
    expect(slottedChild.attributes("x")).toBe(bounds.x.toString());
    expect(slottedChild.attributes("y")).toBe(bounds.y.toString());
    expect(slottedChild.attributes("width")).toBe(bounds.width.toString());
    expect(slottedChild.attributes("height")).toBe(bounds.height.toString());
  });

  it.each(DIRECTIONS)(
    'should transform direction "%s" correctly',
    (direction) => {
      const { wrapper } = doMount({
        screenToCanvasCoordinatesMock: vi.fn(() => () => [20, 20]),
        props: { showTransformControls: true },
      });
      const { initialValue: bounds } = defaultProps;

      startDraggingControl(wrapper, direction);
      const mouseMove = new Event("mousemove");
      window.dispatchEvent(mouseMove);

      expect(mockedTransformBounds).toHaveBeenCalledWith(bounds, {
        direction,
        moveX: 20,
        moveY: 20,
        startX: bounds.x,
        startY: bounds.y,
        origHeight: bounds.height,
        origWidth: bounds.width,
      });
    },
  );

  it("should emit a transformEnd event", () => {
    const { wrapper } = doMount({ props: { showTransformControls: true } });

    const { initialValue: bounds } = defaultProps;

    stopDraggingControl(wrapper, "n");

    expect(wrapper.emitted("transformEnd")![0][0]).toEqual({ bounds });
    expect(
      wrapper.find(".transform-control-n").element.releasePointerCapture,
    ).toHaveBeenCalled();
  });

  it("should clean up event listeners", () => {
    const { wrapper } = doMount({ props: { showTransformControls: true } });

    startDraggingControl(wrapper, "n");

    const windowSpy = vi.spyOn(window, "removeEventListener");

    const mouseUp = new Event("mouseup");
    window.dispatchEvent(mouseUp);

    expect(windowSpy).toHaveBeenCalledWith("mouseup", expect.any(Function));
    expect(windowSpy).toHaveBeenCalledWith("mousemove", expect.any(Function));
  });

  it("should hide the controls if the disabled prop is true", () => {
    const { wrapper } = doMount({ props: { showTransformControls: false } });

    expect(wrapper.find(".transform-box").exists()).toBe(false);
    wrapper.findAll(".transform-control").forEach((_wrapper) => {
      expect(_wrapper.exists()).toBe(false);
    });
  });

  it("should render the focus and selection planes", async () => {
    const { wrapper } = doMount();

    expect(wrapper.findAll("rect").length).toBe(0);

    await wrapper.setProps({ showFocus: true });
    expect(wrapper.findAll("rect").length).toBe(1);

    await wrapper.setProps({ showSelection: true });
    expect(wrapper.findAll("rect").length).toBe(2);
  });

  it("should add move deltas to the selection plane", async () => {
    const { wrapper, $store } = doMount({ props: { showSelection: true } });

    expect(wrapper.find("rect").attributes("x")).toBe("9");
    expect(wrapper.find("rect").attributes("y")).toBe("9");

    $store.state.workflow.movePreviewDelta = { x: 100, y: 100 };

    await nextTick();

    expect(wrapper.find("rect").attributes("x")).toBe("109");
    expect(wrapper.find("rect").attributes("y")).toBe("109");
  });

  it("should add offset to the focus plane if the selection plane is visible", async () => {
    const { wrapper, $store } = doMount({
      props: { showFocus: true, showSelection: true },
    });

    expect(wrapper.find("rect").attributes("x")).toBe("5");
    expect(wrapper.find("rect").attributes("y")).toBe("5");
    expect(wrapper.find("rect").attributes("width")).toBe("110");
    expect(wrapper.find("rect").attributes("height")).toBe("110");

    $store.state.workflow.movePreviewDelta = { x: 100, y: 100 };

    await nextTick();

    expect(wrapper.find("rect").attributes("x")).toBe("105");
    expect(wrapper.find("rect").attributes("y")).toBe("105");
  });
});
