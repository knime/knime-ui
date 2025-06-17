import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import CardHeader from "../CardHeader.vue";

describe("CardHeader.vue", () => {
  const doMount = ({ props = {} } = {}) => {
    const wrapper = mount(CardHeader, {
      propsData: props,
    });

    return { wrapper };
  };

  it.each([["default"], ["primary"], ["light"]])(
    'should set the proper color for "%s" mode',
    (color) => {
      const { wrapper } = doMount({ props: { color } });

      expect(wrapper.classes()).toContain(color);
    },
  );
});
