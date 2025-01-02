import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import { FunctionButton } from "@knime/components";
import CircleHelp from "@knime/styles/img/icons/circle-help.svg";

import { createNodeTemplateWithExtendedPorts } from "@/test/factories";
import NodeTemplate, { type Props } from "../NodeTemplate.vue";
import NodeTemplateIconMode from "../NodeTemplateIconMode.vue";
import NodeTemplateListMode from "../NodeTemplateListMode.vue";

describe("NodeTemplate.vue", () => {
  const defaultProps: Props = {
    nodeTemplate: createNodeTemplateWithExtendedPorts({
      id: "node_1",
      name: "Test",
    }),
    isSelected: false,
    isHighlighted: false,
    showFloatingHelpIcon: true,
    isDescriptionActive: false,
  };

  type MountOpts = { props?: Partial<Props>; mocks?: Record<string, unknown> };

  const doMount = ({ props = {}, mocks = {} }: MountOpts = {}) => {
    const wrapper = mount(NodeTemplate, {
      props: { ...defaultProps, ...props },
      global: {
        mocks: { ...mocks },
      },
    });

    return { wrapper };
  };

  it("emits event when help icon is clicked", () => {
    const { wrapper } = doMount();

    expect(
      wrapper.findComponent(FunctionButton).findComponent(CircleHelp).exists(),
    ).toBe(true);

    wrapper.findComponent(FunctionButton).vm.$emit("click");

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

  it.each([
    ["icon" as const, NodeTemplateIconMode],
    ["list" as const, NodeTemplateListMode],
  ])(
    "renders the proper component for displayMode: %s",
    (displayMode, component) => {
      const { wrapper } = doMount({ props: { displayMode } });

      expect(wrapper.findComponent(component).exists()).toBe(true);
    },
  );
});
