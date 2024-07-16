import { expect, describe, it, vi, beforeAll } from "vitest";
import * as Vue from "vue";

import { shallowMount, mount, flushPromises } from "@vue/test-utils";
import { Button, FunctionButton } from "@knime/components";

import Error from "../Error.vue";

const clipboardSpy = vi.fn();

describe("Error.vue", () => {
  beforeAll(() => {
    Object.assign(navigator, { clipboard: { writeText: clipboardSpy } });
  });

  it("renders default", () => {
    const wrapper = shallowMount(Error, {
      props: {
        message: "one-liner",
        stack: "stacky",
        vueInfo: "error in watcher",
      },
    });
    expect(wrapper.find(".stack").text()).toBe(
      "one-liner\n\nerror in watcher\n\nstacky",
    );
  });

  it("no vueInfo props", () => {
    const wrapper = shallowMount(Error, {
      props: {
        message: "one-liner",
        stack: "stacky",
      },
    });
    expect(wrapper.find(".stack").text()).toBe("one-liner\n\nstacky");
  });

  it("copy to clipboard", async () => {
    const wrapper = mount(Error, {
      props: {
        message: "one-liner",
        stack: "stacky",
        vueInfo: "error in watcher",
      },
    });

    let copyButton = wrapper.findAllComponents(Button)[1];
    copyButton.vm.$emit("click");

    await Vue.nextTick();

    expect(clipboardSpy).toHaveBeenCalledWith(
      JSON.stringify(
        {
          app: "KnimeUI",
          // version: 'version' // TODO:NXT-595
          message: "one-liner",
          vueInfo: "error in watcher",
          stack: "stacky",
        },
        null,
        2,
      ),
    );
  });

  it("reload app", () => {
    const wrapper = mount(Error);

    delete window.location;
    window.location = { href: "" };

    let reloadButton = wrapper.findAllComponents(Button)[0];
    reloadButton.vm.$emit("click");

    expect(window.location.href).toBe("/index.html");
  });

  it("switch to java app", () => {
    const wrapper = mount(Error);

    delete window.switchToJavaUI;
    window.switchToJavaUI = vi.fn();

    let switchButton = wrapper.findAllComponents(FunctionButton).at(0);
    switchButton.vm.$emit("click");

    expect(window.switchToJavaUI).toHaveBeenCalled();
  });

  it("shows copy success", async () => {
    const wrapper = mount(Error);
    let copyButton = wrapper.find(".copy-to-clipboard");

    expect(copyButton.attributes().class).not.toMatch("copied");
    copyButton.trigger("click");

    await flushPromises();
    expect(copyButton.attributes().class).toMatch("copied");
  });
});
