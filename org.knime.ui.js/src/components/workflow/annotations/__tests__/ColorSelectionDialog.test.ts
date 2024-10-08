import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

import { FunctionButton } from "@knime/components";

import { annotationColorPresets } from "@/style/colors";
import ColorSelectionDialog from "../ColorSelectionDialog.vue";

describe("ColorSelectionDialog.vue", () => {
  const defaultProps = {
    activeColor: null,
  };

  const doMount = ({ props = {} } = {}) => {
    const wrapper = mount(ColorSelectionDialog, {
      props: { ...defaultProps, ...props },
    });

    return { wrapper };
  };

  it("should render all the colors", () => {
    const { wrapper } = doMount();

    expect(wrapper.findAllComponents(FunctionButton).length).toBe(15);
  });

  it("should emit an event when a color is hovered", async () => {
    const { wrapper } = doMount();

    const stopPropagation = vi.fn();
    await wrapper
      .findAllComponents(FunctionButton)
      .at(1)
      .find("button")
      .trigger("mouseenter", { stopPropagation });
    expect(wrapper.emitted("hoverColor")[0][0]).toBe(
      annotationColorPresets.SilverSand,
    );
    expect(stopPropagation).toHaveBeenCalled();

    await wrapper
      .findAllComponents(FunctionButton)
      .at(1)
      .find("button")
      .trigger("mouseleave", { stopPropagation });
    expect(wrapper.emitted("hoverColor")[1][0]).toBeNull();
    expect(stopPropagation).toHaveBeenCalledTimes(2);
  });

  it("should emit an event when a color is selected", async () => {
    const { wrapper } = doMount();

    const stopPropagation = vi.fn();
    await wrapper
      .findAllComponents(FunctionButton)
      .at(1)
      .find("button")
      .trigger("click", { stopPropagation });
    expect(wrapper.emitted("selectColor")[0][0]).toBe(
      annotationColorPresets.SilverSand,
    );
    expect(stopPropagation).toHaveBeenCalled();

    // also handles 'none' (aka: 'white') option
    await wrapper
      .findAllComponents(FunctionButton)
      .at(0)
      .find("button")
      .trigger("click", { stopPropagation });
    expect(wrapper.emitted("selectColor")[1][0]).toBe(
      annotationColorPresets.None,
    );
  });

  it("should set the active color", async () => {
    const { wrapper } = doMount();

    expect(
      wrapper.findAllComponents(FunctionButton).at(1).props("active"),
    ).toBe(false);

    await wrapper.setProps({ activeColor: annotationColorPresets.SilverSand });
    expect(
      wrapper.findAllComponents(FunctionButton).at(1).props("active"),
    ).toBe(true);
  });

  it("should handle the white color", async () => {
    const { wrapper } = doMount();

    expect(
      wrapper.findAllComponents(FunctionButton).at(0).props("active"),
    ).toBe(false);

    await wrapper.setProps({ activeColor: annotationColorPresets.None });

    expect(
      wrapper.findAllComponents(FunctionButton).at(0).props("active"),
    ).toBe(true);
    const colorButton = wrapper
      .findAllComponents(FunctionButton)
      .at(0)
      .find("button");
    expect(colorButton.attributes("title")).toBe("None");
    expect(colorButton.classes()).toContain("none");
  });
});
