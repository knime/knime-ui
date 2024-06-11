import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import NavMenuItem from "../NavMenuItem.vue";
import type { NavMenuItemType } from "..";

describe("NavMenuItem.vue", () => {
  const item1: NavMenuItemType = {
    id: "item1",
    text: "Item 1",
    active: true,
    onClick: () => {},
  };

  type MountOptions = Parameters<typeof mount<typeof NavMenuItem<any>>>[1];

  const doMount = (opts: MountOptions = {}) => {
    const wrapper = mount(NavMenuItem, {
      props: opts?.props ?? { item: item1 },
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

    await wrapper.setProps({ item: { ...item1, active: false } });

    expect(wrapper.classes()).not.toContain("active");
  });

  it("should handle onClick handler passed", async () => {
    const onClick = vi.fn();
    const item = { ...item1, onClick };
    const { wrapper } = doMount({
      props: { item },
    });

    const preventDefault = vi.fn();

    expect(wrapper.find("a").attributes("href")).toBe("#");
    await wrapper.find("a").trigger("click", { preventDefault });

    expect(preventDefault).toHaveBeenCalled();
    expect(onClick).toHaveBeenCalledWith(expect.anything(), item);
  });

  it("should handle href", async () => {
    const onClick = vi.fn();
    const item = { ...item1, onClick, href: "http://www.google.com" };

    const { wrapper } = doMount({
      props: { item },
    });

    const preventDefault = vi.fn();
    expect(wrapper.find("a").attributes("href")).toBe("http://www.google.com");
    await wrapper.find("a").trigger("click", { preventDefault });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(onClick).toHaveBeenCalledWith(expect.anything(), item);
  });
});
