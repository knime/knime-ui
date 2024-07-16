import { expect, describe, it } from "vitest";
import { shallowMount } from "@vue/test-utils";
import { mockUserAgent } from "jest-useragent-mock";

import * as $shapes from "@/style/shapes";

import NodeLabelTextArea from "../NodeLabelTextArea.vue";

describe("NodeLabelTextArea", () => {
  const doShallowMount = (opts = { props: { modelValue: "" } }) => {
    const wrapper = shallowMount(NodeLabelTextArea, {
      ...opts,
      global: {
        mocks: { $shapes },
        stubs: {
          NodeLabelText: {
            template: '<div id="node-label-stub"><slot></slot></div>',
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

  it('should emit "save" on control and enter', () => {
    const wrapper = doShallowMount();
    mockUserAgent("windows");

    wrapper.find("textarea").trigger("keydown.enter", { ctrlKey: true });

    expect(wrapper.emitted("save")).toBeDefined();
  });

  it('should emit "save" on command and enter on mac', () => {
    const wrapper = doShallowMount();
    mockUserAgent("mac");

    wrapper.find("textarea").trigger("keydown.enter", { metaKey: true });

    expect(wrapper.emitted("save")).toBeDefined();
  });

  it('should emit "cancel" on escape', () => {
    const wrapper = doShallowMount();

    wrapper.find("textarea").trigger("keydown.esc");

    expect(wrapper.emitted("cancel")).toBeDefined();
  });

  it("should emit an input event when text changes", () => {
    const wrapper = doShallowMount();

    const emittedValue = "mock text";

    wrapper.find("textarea").setValue(emittedValue);
    wrapper.find("textarea").trigger("input");

    expect(wrapper.emitted("update:modelValue")[0][0]).toBe(emittedValue);
  });

  it("should focus textarea on mount", async () => {
    const wrapper = doShallowMount({ attachTo: document.body });
    const textareaElement = wrapper.find("textarea");

    await wrapper.vm.$nextTick();

    expect(document.activeElement).toBe(textareaElement.element);
  });

  it("should set the textarea height based on its scrollHeight as text changes", async () => {
    const getHeight = (textareaElement) =>
      window.getComputedStyle(textareaElement).height;

    const wrapper = doShallowMount();

    await wrapper.vm.$nextTick();
    expect(getHeight(wrapper.find("textarea").element)).toBe("0px");

    const mockHeight = 200;
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      value: mockHeight,
    });

    wrapper.find("textarea").setValue("MOCK TEXT");
    wrapper.find("textarea").trigger("input");

    await wrapper.vm.$nextTick();
    expect(getHeight(wrapper.find("textarea").element)).toBe(`${mockHeight}px`);
  });
});
