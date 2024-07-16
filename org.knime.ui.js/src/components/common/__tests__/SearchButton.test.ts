import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import SearchButton from "../SearchButton.vue";
import { FunctionButton, InputField } from "@knime/components";
import { nextTick } from "vue";

describe("Search Button", () => {
  const doMount = () => {
    const wrapper = mount(SearchButton, {
      props: {
        modelValue: "Query",
      },
    });

    return { wrapper };
  };

  it("renders closed", () => {
    const { wrapper } = doMount();
    expect(wrapper.findComponent(FunctionButton).exists()).toBeTruthy();
    expect(wrapper.findComponent(InputField).exists()).toBeFalsy();
  });

  it("opens on click", async () => {
    const { wrapper } = doMount();
    wrapper.findComponent(FunctionButton).vm.$emit("click");
    await nextTick();
    expect(wrapper.findComponent(InputField).exists).toBeTruthy();
    expect(wrapper.findComponent(InputField).props("modelValue")).toBe("Query");
  });

  it("clears and closes on click if open", async () => {
    const { wrapper } = doMount();
    wrapper.findComponent(FunctionButton).vm.$emit("click");
    await nextTick();
    expect(wrapper.findComponent(InputField).exists).toBeTruthy();
    expect(wrapper.findComponent(InputField).props("modelValue")).toBe("Query");
    wrapper.findComponent(FunctionButton).vm.$emit("click");
    await nextTick();
    // closed state
    expect(wrapper.findComponent(FunctionButton).exists()).toBeTruthy();
    expect(wrapper.findComponent(InputField).exists()).toBeFalsy();
    // clears search on close
    expect(wrapper.emitted("update:modelValue")?.[0]?.[0]).toBe("");
  });
});
