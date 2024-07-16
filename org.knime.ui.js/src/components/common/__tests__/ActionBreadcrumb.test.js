import { expect, describe, beforeEach, it } from "vitest";
import { shallowMount } from "@vue/test-utils";

import { Breadcrumb } from "@knime/components";
import ActionBreadcrumb from "../ActionBreadcrumb.vue";

describe("ActionBreadcrumb.vue", () => {
  let wrapper, doShallowMount, props;

  beforeEach(() => {
    doShallowMount = () => {
      wrapper = shallowMount(ActionBreadcrumb, { props });
    };
  });

  it("renders empty", () => {
    doShallowMount();

    expect(wrapper.findComponent(Breadcrumb).props("items")).toStrictEqual([]);
  });

  it("forwards attrs/props to Breadcrumb", () => {
    props = {
      greyStyle: true,
      someOtherAttr: "value",
    };
    doShallowMount();

    expect(wrapper.findComponent(Breadcrumb).props("greyStyle")).toBe(true);
    expect(wrapper.findComponent(Breadcrumb).vm.$attrs.someOtherAttr).toBe(
      "value",
    );
  });

  it("renders default", () => {
    props = {
      items: [
        {
          text: "this is a dummy item",
        },
      ],
    };
    doShallowMount();

    expect(wrapper.findComponent(Breadcrumb).props("items")).toStrictEqual([
      {
        icon: null,
        text: "this is a dummy item",
      },
    ]);
  });

  it("encodes href urls properly", () => {
    props = {
      items: [
        {
          text: "some node",
          id: "root:p1",
        },
      ],
    };
    doShallowMount();

    expect(wrapper.findComponent(Breadcrumb).props("items")).toStrictEqual([
      {
        icon: null,
        text: "some node",
        href: "#root%3Ap1",
      },
    ]);
  });

  describe("event handling", () => {
    // unfortunately, event simulation in vue-test-utils is pretty crappy, especially in combination with
    // nested components and nuxt-links. So we call the event handler directly.

    beforeEach(() => {
      doShallowMount();
    });

    it("handles clicks on nothing", () => {
      const event = {
        target: {
          tagName: "DIV",
        },
      };
      wrapper.vm.onClick(event);
      expect(wrapper.emitted("click")).toBeFalsy();
    });

    it("handles clicks on link", () => {
      const event = {
        target: {
          tagName: "A",
          href: "#root:0:123",
        },
      };
      wrapper.vm.onClick(event);
      expect(wrapper.emitted("click")[0][0]).toStrictEqual({
        id: "root:0:123",
        target: event.target,
      });
    });

    it("handles clicks on link with weird characters in ID (which should never occur)", () => {
      let weirdId = "root#;,/?:@&=+$-_.!~*'\"()123";
      const event = {
        target: {
          tagName: "A",
          href: `#${encodeURIComponent(weirdId)}`,
        },
      };
      wrapper.vm.onClick(event);
      expect(wrapper.emitted("click")[0][0]).toStrictEqual({
        id: weirdId,
        target: event.target,
      });
    });
  });
});
