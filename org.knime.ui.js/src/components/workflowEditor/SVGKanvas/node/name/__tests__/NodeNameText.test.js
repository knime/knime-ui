import { beforeAll, describe, expect, it } from "vitest";
import { shallowMount } from "@vue/test-utils";

import AutoSizeForeignObject from "@/components/common/AutoSizeForeignObject.vue";
import * as $shapes from "@/style/shapes";
import NodeNameText from "../NodeNameText.vue";

describe("NodeNameText.vue", () => {
  const doShallowMount = (props = {}, opts = {}) =>
    shallowMount(NodeNameText, {
      props,
      global: {
        mocks: { $shapes },
        stubs: {
          AutoSizeForeignObject: {
            template: '<div><slot :on="{}" /></div>',
          },
        },
      },
      ...opts,
    });

  beforeAll(() => {
    Object.defineProperty(document, "fonts", {
      value: { ready: Promise.resolve() },
    });
  });

  it("should emit a request edit event when component is editable", () => {
    const wrapper = doShallowMount({ editable: true });

    wrapper.find(".node-name").trigger("dblclick");

    expect(wrapper.emitted("requestEdit")).toBeDefined();
  });

  it("should ignore double click if name is not editable", () => {
    const wrapper = doShallowMount();

    wrapper.find(".node-name").trigger("dblclick");

    expect(wrapper.emitted("request-edit")).toBeUndefined();
  });

  it.each(["click", "mouseenter", "mouseleave"])(
    "should emit a (%s) event",
    (eventName) => {
      const wrapper = doShallowMount();

      expect(wrapper.emitted(eventName)).toBeUndefined();

      wrapper.find(".node-name").trigger(eventName);

      expect(wrapper.emitted(eventName)).toBeDefined();
    },
  );

  it("should add the full name as a title when overflow is not shown", async () => {
    const value = "this is the whole name of the node";
    const wrapper = doShallowMount({ value, showOverflow: true });

    expect(wrapper.find(".text").attributes("title")).toBeUndefined();

    await wrapper.setProps({ showOverflow: false });

    expect(wrapper.find(".text").attributes("title")).toBe(value);
  });

  it("should render content in the slot", () => {
    const wrapper = doShallowMount(
      { showOverflow: false },
      {
        slots: {
          default: '<span class="slot-content"></span>',
        },
      },
    );

    expect(wrapper.find(".slot-content").exists()).toBe(true);
  });

  it("should add a text-ellipsis class when showOverflow is false", () => {
    const wrapper = doShallowMount({ showOverflow: false });
    expect(wrapper.classes()).toContain("text-ellipsis");
  });

  it.each(["widthChange", "heightChange"])(
    "should emit a (%) event",
    (eventName) => {
      const wrapper = doShallowMount();

      const emittedValue = 200;
      wrapper
        .findComponent(AutoSizeForeignObject)
        .vm.$emit(eventName, emittedValue);
      expect(wrapper.emitted(eventName)[0][0]).toBe(emittedValue);
    },
  );
});
