import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";

import FunctionButton from "webapps-common/ui/components/FunctionButton.vue";
import CircleHelp from "webapps-common/ui/assets/img/icons/circle-help.svg";

import NodeTemplate from "../NodeTemplate.vue";

describe("NodeTemplate.vue", () => {
  const defaultProps: {
    nodeTemplate: Object;
    isSelected: Boolean;
    isHighlighted: Boolean;
    showFloatingHelpIcon: Boolean;
  } = {
    nodeTemplate: {
      id: "node_1",
      name: "Test",
    },
    isSelected: false,
    isHighlighted: false,
    showFloatingHelpIcon: true,
  };

  const doMount = ({ props = {}, mocks = {} } = {}) => {
    const wrapper = mount(NodeTemplate, {
      props: { ...defaultProps, ...props },
      global: {
        mocks: { ...mocks },
      },
    });

    return { wrapper };
  };

  it("emits event when help icon is clicked", async () => {
    const { wrapper } = doMount();

    expect(
      wrapper.findComponent(FunctionButton).findComponent(CircleHelp).exists(),
    ).toBe(true);

    await wrapper.findComponent(FunctionButton).vm.$emit("click");

    expect(wrapper.emitted("helpIconClick")).toBeDefined();
  });

  it("does not show question mark icon for quick add node menu", () => {
    const { wrapper } = doMount({
      props: {
        showFloatingHelpIcon: false,
      },
    });

    expect(wrapper.findComponent(FunctionButton).exists()).toBe(false);
  });

  it("it adds class when node is hovered over", async () => {
    const { wrapper } = doMount();

    await wrapper.find(".node").trigger("pointerenter");
    const button = wrapper.find(".description-icon");

    expect(button.classes()).toContain("hovered-icon");

    await wrapper.find(".node").trigger("pointerleave");

    expect(button.classes()).not.toContain("hovered-icon");
  });
});
