import { expect, describe, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";
import { nextTick } from "vue";

import * as $shapes from "@/style/shapes";

import NodeNameTextarea from "../NodeNameTextarea.vue";

describe("NodeNameTextarea", () => {
  const doShallowMount = (opts = { props: { value: "" } }) => {
    const wrapper = shallowMount(NodeNameTextarea, {
      ...opts,
      global: {
        mocks: { $shapes },
        stubs: {
          NodeNameText: {
            template: '<div id="node-name-stub"><slot></slot></div>',
          },
        },
      },
      attachTo: document.body,
    });

    return wrapper;
  };

  it("render with given value as text", () => {
    const modelValue = "test";
    const wrapper = doShallowMount({ props: { modelValue } });
    expect(wrapper.find("textarea").element.value).toBe(modelValue);
  });

  it('should emit "save" on enter', () => {
    const wrapper = doShallowMount();

    wrapper.find("textarea").trigger("keydown.enter");

    expect(wrapper.emitted("save")).toBeDefined();
  });

  it('should emit "cancel" on escape', () => {
    const wrapper = doShallowMount();

    wrapper.find("textarea").trigger("keydown.esc");

    expect(wrapper.emitted("cancel")).toBeDefined();
  });

  it.each(["widthChange", "heightChange"])(
    "should emit a (%s) event",
    (eventName) => {
      const wrapper = doShallowMount();

      const emittedValue = 100;
      wrapper
        .findComponent("#node-name-stub")
        .vm.$emit(eventName, emittedValue);

      expect(wrapper.emitted(eventName)[0][0]).toBe(emittedValue);
    },
  );

  it("should emit an update:modelValue event when text changes", () => {
    const wrapper = doShallowMount();

    const emittedValue = "mock text";

    wrapper.find("textarea").setValue(emittedValue);
    wrapper.find("textarea").trigger("input");

    expect(wrapper.emitted("update:modelValue")[0][0]).toBe(emittedValue);
  });

  it("should focus textarea on mount", async () => {
    const wrapper = doShallowMount({ attachTo: document.body });
    const textareaElement = wrapper.find("textarea");

    await nextTick();

    expect(document.activeElement).toBe(textareaElement.element);
  });

  it("should set the textarea height based on its scrollHeight as text changes", async () => {
    const getHeight = (textareaElement) =>
      window.getComputedStyle(textareaElement).height;

    const wrapper = doShallowMount();

    await nextTick();
    expect(getHeight(wrapper.find("textarea").element)).toBe("0px");

    const mockHeight = 200;
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      value: mockHeight,
    });

    wrapper.find("textarea").setValue("MOCK TEXT");
    wrapper.find("textarea").trigger("input");

    await nextTick();
    expect(getHeight(wrapper.find("textarea").element)).toBe(`${mockHeight}px`);
  });

  it("should not allow illegal characters", () => {
    const wrapper = doShallowMount({
      props: { value: "", invalidCharacters: /[*?#:"<>%~|/\\]/g },
    });

    const emittedValue = "*New name!*?-test_12(#)";

    wrapper.find("textarea").setValue(emittedValue);
    wrapper.find("textarea").trigger("input");

    expect(wrapper.emitted("invalidInput")).toBeDefined();
    expect(wrapper.emitted("update:modelValue")[0][0]).toBe(
      "New name!-test_12()",
    );
  });

  it("should not allow illegal character on keydown", () => {
    const wrapper = doShallowMount({
      props: { value: "", invalidCharacters: /[*?#:"<>%~|/\\]/g },
    });

    const event = {
      key: "#",
      preventDefault: vi.fn(),
    };
    wrapper.find("textarea").trigger("keydown", event);

    expect(wrapper.emitted("invalidInput")).toBeDefined();
    expect(event.preventDefault).toBeCalled();
  });
});
