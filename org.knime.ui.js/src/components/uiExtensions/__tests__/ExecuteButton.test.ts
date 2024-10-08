import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import ExecuteButton from "../ExecuteButton.vue";

describe("ExecuteButton.vue", () => {
  const doMount = (props = { message: "", buttonLabel: "" }) => {
    const wrapper = mount(ExecuteButton, { props });

    return { wrapper };
  };

  it("should render correctly and emit event on click", async () => {
    const { wrapper } = doMount({
      message: "Mock message",
      buttonLabel: "Click me",
    });

    expect(wrapper.text()).toMatch("Mock message");
    expect(wrapper.find("button").text()).toMatch("Click me");
    await wrapper.find("button").trigger("click");
    expect(wrapper.emitted("click")).toBeDefined();
  });
});
