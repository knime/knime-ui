import { describe, expect, it } from "vitest";
import { shallowMount } from "@vue/test-utils";

import { Breadcrumb, type BreadcrumbItem } from "@knime/components";

import ActionBreadcrumb from "../ActionBreadcrumb.vue";

describe("ActionBreadcrumb.vue", () => {
  type ComponentProps = InstanceType<typeof ActionBreadcrumb>["$props"];

  const doMount = (
    opts: {
      props?: ComponentProps;
      attrs?: Record<string, string | boolean | number>;
    } = { props: { items: [] }, attrs: {} },
  ) => {
    const wrapper = shallowMount(ActionBreadcrumb, {
      props: { ...opts.props, ...opts.attrs },
    });

    return { wrapper };
  };

  it("renders empty", () => {
    const { wrapper } = doMount();

    expect(wrapper.findComponent(Breadcrumb).props("items")).toStrictEqual([]);
  });

  it("forwards attrs/props to Breadcrumb", () => {
    const { wrapper } = doMount({
      attrs: {
        greyStyle: true,
        someOtherAttr: "value",
      },
    });

    expect(wrapper.findComponent(Breadcrumb).props("greyStyle")).toBe(true);
    expect(wrapper.findComponent(Breadcrumb).vm.$attrs.someOtherAttr).toBe(
      "value",
    );
  });

  it("renders default", () => {
    const { wrapper } = doMount({
      props: {
        items: [
          {
            id: "myitem",
            text: "this is a dummy item",
          },
        ],
      },
    });

    expect(wrapper.findComponent(Breadcrumb).props("items")).toStrictEqual([
      {
        id: "myitem",
        clickable: true,
        text: "this is a dummy item",
      },
    ]);
  });

  it("should emit an event when item is clicked", () => {
    const item: BreadcrumbItem = {
      id: "myitem",
      text: "this is a dummy item",
    };
    const { wrapper } = doMount({
      props: {
        items: [item],
      },
    });

    wrapper.findComponent(Breadcrumb).vm.$emit("click-item", item);
    expect(wrapper.emitted("click")!.at(0)!.at(0)).toEqual({ id: item.id });
  });
});
