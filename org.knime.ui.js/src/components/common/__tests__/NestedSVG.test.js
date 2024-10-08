import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import NestedSVG from "../NestedSVG";

describe("NestedSVG", () => {
  it("renders svg and passes attributes", () => {
    let wrapper = mount(NestedSVG, {
      slots: {
        default: () => ({ children: [{ template: "<svg />" }] }),
      },
      attrs: {
        width: "200",
        x: "-10",
      },
    });
    expect(wrapper.html()).toBe('<svg width="200" x="-10"></svg>');
  });
});
