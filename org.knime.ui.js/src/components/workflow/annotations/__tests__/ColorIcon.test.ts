import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import CircleStopIcon from "@knime/styles/img/icons/circle-stop.svg";
import { annotationColorPresets } from "@/style/colors.mjs";

import ColorIcon from "../ColorIcon.vue";

describe("ColorIcon.vue", () => {
  const defaultProps = {
    color: annotationColorPresets.Avocado,
  };

  const doMount = ({ props = {} } = {}) => {
    const wrapper = mount(ColorIcon, {
      props: { ...defaultProps, ...props },
    });

    return { wrapper };
  };

  it("should render correct color", () => {
    const { wrapper } = doMount();

    expect(wrapper.findComponent(CircleStopIcon).exists()).toBe(false);
    expect(wrapper.find("circle").attributes("stroke")).toBe(
      annotationColorPresets.Avocado,
    );
    expect(wrapper.find("circle").attributes("fill")).toBe("white");
  });

  it('should show an icon when the color is "none"', () => {
    const { wrapper } = doMount({
      props: { color: annotationColorPresets.None },
    });

    expect(wrapper.findComponent(CircleStopIcon).exists()).toBe(true);
  });

  it("should render filled icon", () => {
    const { wrapper } = doMount({ props: { filled: true } });
    expect(wrapper.find("circle").attributes("stroke")).toBe(
      annotationColorPresets.Avocado,
    );
    expect(wrapper.find("circle").attributes("fill")).toBe(
      annotationColorPresets.Avocado,
    );
  });
});
