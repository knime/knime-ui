import { describe, expect, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";

import * as $shapes from "@/style/shapes";
import ActionBar from "../ActionBar.vue";
import ActionButton from "../ActionButton.vue";

describe("ActionBar.vue", () => {
  const doShallowMount = ({ props = {} } = {}) => {
    const defaultActions = [
      {
        name: "save",
        title: "save",
        onClick: vi.fn(),
        primary: true,
      },
      {
        name: "cancel",
        title: "cancel",
        onClick: vi.fn(),
      },
    ];

    const wrapper = shallowMount(ActionBar, {
      props: { actions: defaultActions, ...props },
      global: { mocks: { $shapes } },
    });

    return { wrapper, actions: props.actions || defaultActions };
  };

  it("renders", () => {
    const { wrapper } = doShallowMount();
    let buttons = wrapper.findAllComponents(ActionButton);

    expect(buttons.at(0).props()).toStrictEqual(
      expect.objectContaining({ x: -12.5, disabled: false, primary: true }),
    );
    expect(buttons.at(1).props()).toStrictEqual(
      expect.objectContaining({ x: 12.5, disabled: false, primary: false }),
    );
  });

  it("should call action onClick handler", () => {
    const { wrapper, actions } = doShallowMount();
    let buttons = wrapper.findAllComponents(ActionButton);

    expect(actions[0].onClick).not.toHaveBeenCalled();
    buttons.at(0).vm.$emit("click");
    expect(actions[0].onClick).toHaveBeenCalled();
    expect(actions[1].onClick).not.toHaveBeenCalled();
  });

  it("should render the correct title", () => {
    const actions = [
      {
        name: "mock",
        title: () => "this is my dynamic title",
        onClick: () => {},
      },
    ];
    const { wrapper } = doShallowMount({ props: { actions } });
    const button = wrapper.findComponent(ActionButton);

    expect(button.attributes("title")).toMatch("this is my dynamic title");
  });
});
