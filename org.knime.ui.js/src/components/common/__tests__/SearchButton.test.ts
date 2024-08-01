import { describe, expect, it, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";

import SearchButton from "../SearchButton.vue";
import { FunctionButton, InputField } from "@knime/components";
import { nextTick } from "vue";

const addEventListenerSpy = vi.spyOn(document, "addEventListener");
const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

afterEach(() => {
  vi.clearAllMocks();
});

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

  it("toggles input field on Ctrl+F keydown event", async () => {
    const { wrapper } = doMount();
    const event = new KeyboardEvent("keydown", {
      key: "f",
      ctrlKey: true,
      shiftKey: true,
    });
    document.dispatchEvent(event);
    await nextTick();
    expect(wrapper.findComponent(InputField).exists()).toBeTruthy();
    expect(wrapper.findComponent(InputField).props("modelValue")).toBe("Query");

    document.dispatchEvent(event);
    await nextTick();
    expect(wrapper.findComponent(InputField).exists()).toBeFalsy();
  });

  it("adds and removes event listeners on mount and unmount", () => {
    const { wrapper } = doMount();
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function),
    );
    wrapper.unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function),
    );
  });
});
