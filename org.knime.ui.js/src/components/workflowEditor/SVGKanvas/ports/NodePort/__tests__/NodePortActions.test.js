/* eslint-disable func-style */
import { describe, expect, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";

import Port from "@/components/common/Port.vue";
import ActionButton from "@/components/workflowEditor/SVGKanvas/common/ActionButton.vue";
import { useEscapeStack } from "@/composables/useEscapeStack";
import * as $shapes from "@/style/shapes";
import NodePortActions from "../NodePortActions.vue";

vi.mock("@/composables/useEscapeStack", () => {
  function useEscapeStack({ onEscape }) {
    // @ts-expect-error
    useEscapeStack.onEscape = onEscape;
    return {
      /* empty mixin */
    };
  }

  return { useEscapeStack };
});

describe("NodePortActions.vue", () => {
  const defaultProps = {
    direction: "in",
    relativePosition: [16, 32],
    anchorPoint: { x: 1600, y: 1600 },
    port: {
      canRemove: true,
      connectedVia: [],
      typeId: "table",
      inactive: false,
      index: 0,
    },
  };

  const doShallowMount = (customProps = {}) =>
    shallowMount(NodePortActions, {
      props: { ...defaultProps, ...customProps },
      global: {
        mocks: { $shapes },
      },
    });

  it("should render properly", () => {
    const wrapper = doShallowMount();

    expect(wrapper.findComponent(ActionButton).exists()).toBe(true);
    expect(wrapper.findComponent(Port).exists()).toBe(true);

    // class is used in a css selector to target the animation of the element
    // as it shows up in a portal
    expect(wrapper.findComponent(Port).classes()).toContain("selected-port");
  });

  it("should emit the action event", () => {
    const wrapper = doShallowMount();

    wrapper.findComponent(ActionButton).vm.$emit("click");
    expect(wrapper.emitted("action:remove")).toBeDefined();
  });

  it("should position the wrapper and actions properly", () => {
    const wrapper = doShallowMount();

    const { anchorPoint, relativePosition } = defaultProps;

    const expectedWrapperTranslate = [
      anchorPoint.x + relativePosition[0],
      anchorPoint.y + relativePosition[1],
    ];

    const expectedActionButtonXOffset =
      25 * (defaultProps.direction === "in" ? -1 : 1);

    expect(wrapper.attributes("transform")).toBe(
      `translate(${expectedWrapperTranslate})`,
    );
    expect(wrapper.findComponent(ActionButton).props("x")).toBe(
      expectedActionButtonXOffset,
    );
  });

  it.each([
    ["in", $shapes.portActionButtonSize],
    ["out", 0],
  ])(
    "should set the proper hover area dimensions for %sPorts",
    async (direction, xOffset) => {
      const wrapper = doShallowMount();
      await wrapper.setProps({ direction });

      const objPropertiesToString = (obj) =>
        Object.entries(obj)
          .map(([key, value]) => [key, value.toString()])
          .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

      const hoverAreaDimensions = {
        x: -($shapes.portActionButtonSize / 2) - xOffset,
        y: -($shapes.portActionButtonSize / 2),
        width: $shapes.portActionButtonSize * 2,
        height: $shapes.portActionButtonSize,
      };

      expect(wrapper.find("rect").attributes()).toEqual(
        expect.objectContaining(objPropertiesToString(hoverAreaDimensions)),
      );
    },
  );

  it("should capture events on the area between actions", () => {
    const mockStopPropagation = vi.fn();

    MouseEvent.prototype.stopPropagation = mockStopPropagation;

    const wrapper = doShallowMount();

    wrapper.find("rect").trigger("click");
    wrapper.find("rect").trigger("mouseenter");
    wrapper.find("rect").trigger("mouseleave");

    expect(mockStopPropagation).toHaveBeenCalledTimes(3);
  });

  it("should disable the delete action button if the port cannot be removed", async () => {
    const wrapper = doShallowMount();

    await wrapper.setProps({
      port: { ...defaultProps.port, canRemove: false },
    });

    const actionButton = wrapper.findComponent(ActionButton);

    expect(actionButton.props("disabled")).toBe(true);
  });

  it("should close on escape", () => {
    const wrapper = doShallowMount();
    expect(wrapper.emitted("close")).toBeFalsy();
    useEscapeStack.onEscape();
    expect(wrapper.emitted("close")).toBeTruthy();
  });
});
