import { expect, describe, it, vi } from "vitest";
import * as Vue from "vue";

import { mount, flushPromises } from "@vue/test-utils";
import { Button } from "@knime/components";
import { API } from "@api";
import { deepMocked } from "@/test/utils";

import ErrorOverlay from "../ErrorOverlay.vue";
import { copyReportToClipboard } from "@/util/errorHandling";

vi.mock("@/util/errorHandling", async (importOriginal) => {
  return {
    ...((await importOriginal()) as Object),
    copyReportToClipboard: vi.fn(),
  };
});

const mockedAPI = deepMocked(API);

describe("ErrorOverlay.vue", () => {
  type ComponentProps = InstanceType<typeof ErrorOverlay>["$props"];

  const doMount = (props?: ComponentProps) => {
    const defaultProps: ComponentProps = {
      message: "default message",
      stack: "default stack",
    };

    const wrapper = mount(ErrorOverlay, {
      props: { ...defaultProps, ...props },
    });

    return { wrapper };
  };

  it("renders default", () => {
    const { wrapper } = doMount({
      message: "one-liner",
      stack: "stacky",
    });

    // @ts-ignore
    expect(wrapper.find(".stack").element.value).toBe(
      `one-liner\n\nVue: ${Vue.version}\n\nstacky`,
    );
  });

  it("copy to clipboard", async () => {
    const { wrapper } = doMount({
      message: "one-liner",
      stack: "stacky",
    });

    const copyButton = wrapper.findAllComponents(Button)[1];
    copyButton.vm.$emit("click");

    await Vue.nextTick();

    expect(copyReportToClipboard).toHaveBeenCalledWith({
      message: "one-liner",
      stack: "stacky",
    });
  });

  it("reload app", () => {
    const wrapper = mount(ErrorOverlay);

    // @ts-ignore
    delete window.location;
    // @ts-ignore
    window.location = { href: "" };

    const reloadButton = wrapper.findAllComponents(Button)[0];
    reloadButton.vm.$emit("click");

    expect(window.location.href).toBe("/index.html");
  });

  it("switch to java app", async () => {
    const { wrapper } = doMount();

    await wrapper.find(".switch-classic").trigger("click");

    expect(mockedAPI.desktop.switchToJavaUI).toHaveBeenCalled();
  });

  it("shows copy success", async () => {
    const { wrapper } = doMount();
    const copyButton = wrapper.find(".copy-to-clipboard");

    expect(copyButton.attributes().class).not.toMatch("copied");
    copyButton.trigger("click");

    await flushPromises();
    expect(copyButton.attributes().class).toMatch("copied");
  });
});
