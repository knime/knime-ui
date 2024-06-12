import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import NavMenuItem from "../NavMenuItem.vue";
import type { NavMenuItemProps } from "..";

describe("NavMenuItem.vue", () => {
  const defaultProps: NavMenuItemProps = {
    text: "Item 1",
    active: true,
  };

  type MountOptions = Parameters<typeof mount<typeof NavMenuItem>>[1];

  const doMount = (opts: MountOptions = {}) => {
    const wrapper = mount(NavMenuItem, {
      props: opts?.props ?? { ...defaultProps },
      ...opts,
    });

    return { wrapper };
  };

  it("should render text content", () => {
    const { wrapper } = doMount();

    expect(wrapper.text()).toMatch("Item 1");
  });

  it.each([["append" as const], ["prepend" as const]])(
    "should render %s slot",
    (name) => {
      const { wrapper } = doMount({
        slots: {
          [name]: {
            template: `<div id='${name}' />`,
          },
        },
      });

      expect(wrapper.find(`#${name}`).exists()).toBe(true);
    },
  );

  it("should display active state", async () => {
    const { wrapper } = doMount();

    expect(wrapper.classes()).toContain("active");

    await wrapper.setProps({ active: false });

    expect(wrapper.classes()).not.toContain("active");
  });

  it("should display indicator", async () => {
    const { wrapper } = doMount();

    expect(wrapper.classes()).not.toContain("with-indicator");

    await wrapper.setProps({ withIndicator: true });

    expect(wrapper.classes()).toContain("with-indicator");
  });

  it("should display highlighted item", async () => {
    const { wrapper } = doMount();

    expect(wrapper.classes()).not.toContain("highlighted");

    await wrapper.setProps({ highlighted: true });

    expect(wrapper.classes()).toContain("highlighted");
  });

  it("should emit a click event", async () => {
    const { wrapper } = doMount();

    const preventDefault = vi.fn();

    expect(wrapper.find("a").attributes("href")).toBe("#");
    await wrapper.find("a").trigger("click", { preventDefault });

    expect(preventDefault).toHaveBeenCalled();
    expect(wrapper.emitted("click")).toBeDefined();
  });

  it("should handle href", async () => {
    const { wrapper } = doMount({
      props: { ...defaultProps, href: "http://www.google.com" },
    });

    const preventDefault = vi.fn();
    expect(wrapper.find("a").attributes("href")).toBe("http://www.google.com");
    await wrapper.find("a").trigger("click", { preventDefault });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(wrapper.emitted("click")).toBeDefined();
  });
});
