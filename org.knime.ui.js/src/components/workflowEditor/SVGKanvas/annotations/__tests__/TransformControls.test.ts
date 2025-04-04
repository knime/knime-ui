import { type Mock, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { VueWrapper, mount } from "@vue/test-utils";

import * as $colors from "@/style/colors";
import * as $shapes from "@/style/shapes";
import { mockStores } from "@/test/utils/mockStores";
import { createSlottedChildComponent } from "@/test/utils/slottedChildComponent";
import {
  DIRECTIONS,
  type Directions,
  getGridAdjustedBounds,
  getTransformControlPosition,
  transformBounds,
} from "../../../common/annotations/transform-control-utils";
import TransformControls from "../TransformControls.vue";

vi.mock("../../../common/annotations/transform-control-utils", async () => {
  const actual: any = await vi.importActual(
    "../../../common/annotations/transform-control-utils",
  );
  return {
    ...actual,
    transformBounds: vi.fn(),
    getGridAdjustedBounds: vi.fn(),
    getTransformControlPosition: vi.fn(),
  };
});

describe("TransformControls.vue", () => {
  type ComponentProps = InstanceType<typeof TransformControls>["$props"];

  type MountOpts = {
    props?: Partial<ComponentProps>;
    screenToCanvasCoordinatesMock?: Mock;
  };

  const defaultProps = {
    initialValue: {
      x: 10,
      y: 10,
      width: 100,
      height: 100,
    },
    showTransformControls: false,
    showSelection: false,
    isAnnotationSelected: false,
  } satisfies ComponentProps;

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
    screenToCanvasCoordinatesMock = vi.fn(() => [5, 5]),
  }: MountOpts = {}) => {
    const { renderSlot, getSlottedChildComponent } =
      createSlottedChildComponent({
        slottedComponentTemplate: `<foreignObject
          id="slotted-component"
          v-bind="scope.transformedBounds">
        </foreignObject>`,
      });

    const mockedStores = mockStores();
    mockedStores.movingStore.movePreviewDelta = { x: 0, y: 0 };
    // @ts-expect-error
    mockedStores.canvasStore.screenToCanvasCoordinates =
      screenToCanvasCoordinatesMock;

    const wrapper = mount(TransformControls, {
      props: { ...defaultProps, ...props },
      slots: {
        default: renderSlot,
      },
      global: {
        plugins: [mockedStores.testingPinia],
        mocks: { $shapes, $colors },
      },
    });

    return { wrapper, getSlottedChildComponent, mockedStores };
  };

  const startDraggingControl = (
    wrapper: VueWrapper<any>,
    controlDirection: Directions,
  ) => {
    const control = wrapper.find(`.transform-control-${controlDirection}`);
    control.element.setPointerCapture = vi.fn();
    control.trigger("pointerdown");
  };

  it("should render the transform box", () => {
    const { wrapper } = doMount({ props: { showSelection: true } });

    const transformBox = wrapper.find("rect.transform-box");
    expect(transformBox.attributes("x")).toBe("9");
    expect(transformBox.attributes("y")).toBe("9");
    expect(transformBox.attributes("width")).toBe("102");
    expect(transformBox.attributes("height")).toBe("102");
  });

  it("should render the transform controls correctly", () => {
    const { wrapper } = doMount({ props: { showTransformControls: true } });

    const { initialValue: bounds } = defaultProps;
    expect(wrapper.findAll(".transform-control").length).toBe(
      DIRECTIONS.length,
    );

    const TRANSFORM_RECT_OFFSET = 1;

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
        screenToCanvasCoordinatesMock: vi.fn(() => [20, 20]),
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

    startDraggingControl(wrapper, "n");
    const mouseUp = new Event("mouseup");
    window.dispatchEvent(mouseUp);

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
    const { wrapper, mockedStores } = doMount({
      props: { showSelection: true, isAnnotationSelected: true },
    });

    expect(wrapper.find("rect").attributes("x")).toBe("9");
    expect(wrapper.find("rect").attributes("y")).toBe("9");

    mockedStores.movingStore.movePreviewDelta = { x: 100, y: 100 };

    await nextTick();

    expect(wrapper.find("rect").attributes("x")).toBe("109");
    expect(wrapper.find("rect").attributes("y")).toBe("109");
  });

  it("should add offset to the focus plane if the selection plane is visible", async () => {
    const { wrapper, mockedStores } = doMount({
      props: {
        showFocus: true,
        showSelection: true,
        isAnnotationSelected: true,
      },
    });

    expect(wrapper.find("rect").attributes("x")).toBe("6");
    expect(wrapper.find("rect").attributes("y")).toBe("6");
    expect(wrapper.find("rect").attributes("width")).toBe("108");
    expect(wrapper.find("rect").attributes("height")).toBe("108");

    mockedStores.movingStore.movePreviewDelta = { x: 100, y: 100 };

    await nextTick();

    expect(wrapper.find("rect").attributes("x")).toBe("106");
    expect(wrapper.find("rect").attributes("y")).toBe("106");
  });
});
