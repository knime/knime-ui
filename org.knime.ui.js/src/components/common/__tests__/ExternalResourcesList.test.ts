import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import { InputField, LinkList } from "@knime/components";

import ExternalResourcesList from "../ExternalResourcesList.vue";

const links = [
  {
    text: "Mock link text",
    url: "www.example.com",
  },
];

describe("ExternalResourcesList.vue", () => {
  const doMount = ({ props = {} } = {}) => {
    const defaultProps = {
      modelValue: links,
      editable: false,
    };

    const wrapper = mount(ExternalResourcesList, {
      props: { ...defaultProps, ...props },
    });

    return { wrapper };
  };

  it("should render the links", () => {
    const { wrapper } = doMount();

    const linkListComponent = wrapper.findComponent(LinkList);

    expect(linkListComponent.exists()).toBe(true);
    expect(linkListComponent.props("links")).toEqual(links);
  });

  it("should render a placeholder when no links exist", () => {
    const { wrapper } = doMount({ props: { modelValue: [] } });

    const linksListComponent = wrapper.findComponent(LinkList);

    expect(linksListComponent.exists()).toBe(false);
    expect(wrapper.text()).toMatch("No links have been added yet");
  });

  describe("editing", () => {
    it("should add new links", async () => {
      const { wrapper } = doMount({ props: { editable: true } });

      await wrapper.find(".add-link-btn").trigger("click");
      expect(wrapper.emitted("update:modelValue")[0][0]).toEqual([
        {
          text: "Mock link text",
          url: "www.example.com",
        },
        {
          text: "",
          url: "",
        },
      ]);
    });

    it("should emit an event when a link's url is invalid", async () => {
      const { wrapper } = doMount({ props: { editable: true } });

      await wrapper
        .findAll(".edit-link-url")
        .at(0)
        .findComponent(InputField)
        .find("input")
        .setValue("h://ww-adupdated.url");

      expect(wrapper.emitted("valid")[0][0]).toBe(false);
    });

    it("should remove links", async () => {
      const { wrapper } = doMount({ props: { editable: true } });

      await wrapper.find(".delete-link-btn").trigger("click");
      expect(wrapper.emitted("update:modelValue")[0][0]).toEqual([]);
    });

    it("should update fields", async () => {
      const { wrapper } = doMount({ props: { editable: true } });

      expect(wrapper.findAll(".edit-link").length).toBe(links.length);

      await wrapper
        .findAll(".edit-link-text")
        .at(0)
        .findComponent(InputField)
        .find("input")
        .setValue("updated text");

      expect(wrapper.emitted("update:modelValue")[0][0]).toEqual([
        {
          text: "updated text",
          url: "www.example.com",
        },
      ]);

      await wrapper
        .findAll(".edit-link-url")
        .at(0)
        .findComponent(InputField)
        .find("input")
        .setValue("http://updated.url");

      expect(wrapper.emitted("update:modelValue")[1][0]).toEqual([
        {
          text: "Mock link text",
          url: "http://updated.url",
        },
      ]);
    });
  });
});
