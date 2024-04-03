import { expect, describe, it } from "vitest";
import { mount } from "@vue/test-utils";

import Card from "../Card.vue";
import CardHeader from "../CardHeader.vue";
import CardContent from "../CardContent.vue";
import CardFooter from "../CardFooter.vue";

describe("Card.vue", () => {
  const doMount = ({ props = {}, renderSubElements = true } = {}) => {
    const wrapper = mount(Card, {
      props,
      slots: {
        default: renderSubElements ? [CardHeader, CardContent, CardFooter] : [],
      },
      global: {
        stubs: {
          RouterLink: {
            name: "RouterLink",
            template: "<router-link-stub></router-link-stub>",
          },
        },
      },
    });

    return { wrapper };
  };

  it("should render simple card", () => {
    const { wrapper } = doMount({ renderSubElements: false });

    expect(wrapper.find(".card").exists()).toBe(true);
  });

  it("should render Header, Content and Footer", () => {
    const { wrapper } = doMount();

    expect(wrapper.find(".card-header").exists()).toBe(true);
    expect(wrapper.find(".card-content").exists()).toBe(true);
    expect(wrapper.find(".card-footer").exists()).toBe(true);
  });

  it("should behave as <a> tag when `link` prop is not specified", () => {
    const { wrapper } = doMount();

    expect(wrapper.element.tagName).toBe("BUTTON");

    wrapper.trigger("click");
    expect(wrapper.emitted("click")).toBeDefined();
  });

  it("should behave as a router link when `link` prop is specified", () => {
    const { wrapper } = doMount({
      props: { link: true, href: "http://example.com" },
    });

    expect(wrapper.find("router-link-stub").attributes("to")).toBe(
      "http://example.com",
    );
  });
});
