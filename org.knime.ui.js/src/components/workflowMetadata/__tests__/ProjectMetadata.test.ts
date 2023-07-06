import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import { createWorkflow } from "@/test/factories";
import { TypedText } from "@/api/gateway-api/generated-api";

import FunctionButton from "webapps-common/ui/components/FunctionButton.vue";
import ExternalResourcesList from "@/components/common/ExternalResourcesList.vue";

import ProjectMetadata from "../ProjectMetadata.vue";
import MetadataDescription from "../MetadataDescription.vue";
import ProjectMetadataTags from "../ProjectMetadataTags.vue";
import { nextTick } from "vue";

describe("ProjectMetadata.vue", () => {
  const doMount = ({ props = {} } = {}) => {
    const workflow = createWorkflow({
      projectMetadata: {
        description: {
          value: "This is a dummy description",
          contentType: TypedText.ContentTypeEnum.Plain,
        },
        links: [
          { text: "link1", url: "http://link1.com" },
          { text: "link2", url: "http://link2.com" },
        ],
        tags: ["tag1", "tag2"],
      },
    });

    const defaultProps = {
      workflow,
      isEditing: false,
    };

    const wrapper = mount(ProjectMetadata, {
      props: { ...defaultProps, ...props },
    });

    return { wrapper, workflow };
  };

  it("should render content", () => {
    const { wrapper, workflow } = doMount();

    const { description, links, tags } = workflow.projectMetadata;

    expect(wrapper.findAllComponents(FunctionButton).length).toBe(1);
    expect(wrapper.findComponent(MetadataDescription).props("editable")).toBe(
      false
    );
    expect(wrapper.findComponent(MetadataDescription).props("modelValue")).toBe(
      description.value
    );

    expect(wrapper.findComponent(ExternalResourcesList).props("editable")).toBe(
      false
    );
    expect(
      wrapper.findComponent(ExternalResourcesList).props("modelValue")
    ).toEqual(links);

    expect(wrapper.findComponent(ProjectMetadataTags).props("editable")).toBe(
      false
    );
    expect(
      wrapper.findComponent(ProjectMetadataTags).props("modelValue")
    ).toEqual(tags);
  });

  it("should go into edit mode", async () => {
    const { wrapper } = doMount();

    await wrapper.findComponent(FunctionButton).find("button").trigger("click");
    expect(wrapper.emitted("editStart")).toBeDefined();

    await wrapper.setProps({ isEditing: true });

    expect(wrapper.findComponent(MetadataDescription).props("editable")).toBe(
      true
    );

    expect(wrapper.findComponent(ExternalResourcesList).props("editable")).toBe(
      true
    );

    expect(wrapper.findComponent(ProjectMetadataTags).props("editable")).toBe(
      true
    );
  });

  it("should update metadata", async () => {
    const { wrapper } = doMount({ props: { isEditing: true } });

    const descriptionComponent = wrapper.findComponent(MetadataDescription);
    const linksComponent = wrapper.findComponent(ExternalResourcesList);
    const tagsComponent = wrapper.findComponent(ProjectMetadataTags);

    descriptionComponent.vm.$emit(
      "update:modelValue",
      "<p>This is a new description</>"
    );

    linksComponent.vm.$emit("update:modelValue", [
      { text: "link3", url: "://link1.com" },
    ]);

    tagsComponent.vm.$emit("update:modelValue", ["new tag"]);

    await wrapper.findComponent(FunctionButton).find("button").trigger("click");

    expect(wrapper.emitted("editSave")[0][0]).toEqual({
      description: {
        contentType: TypedText.ContentTypeEnum.Html,
        value: "<p>This is a new description</>",
      },
      links: [{ text: "link3", url: "://link1.com" }],
      tags: ["new tag"],
    });
  });

  it("should disable saving if data is invalid", async () => {
    const { wrapper } = doMount({ props: { isEditing: true } });

    expect(
      wrapper
        .findComponent(FunctionButton)
        .find("button")
        .attributes("disabled")
    ).toBeUndefined();

    wrapper.findComponent(ExternalResourcesList).vm.$emit("valid", false);

    await nextTick();

    expect(
      wrapper
        .findComponent(FunctionButton)
        .find("button")
        .attributes("disabled")
    ).toBeDefined();
  });

  it("should cancel an edit", async () => {
    const { wrapper, workflow } = doMount({ props: { isEditing: true } });

    const { description, links, tags } = workflow.projectMetadata;

    const descriptionComponent = wrapper.findComponent(MetadataDescription);
    const linksComponent = wrapper.findComponent(ExternalResourcesList);
    const tagsComponent = wrapper.findComponent(ProjectMetadataTags);

    descriptionComponent.vm.$emit(
      "update:modelValue",
      "<p>This is a new description</>"
    );

    linksComponent.vm.$emit("update:modelValue", [
      { text: "link3", url: "://link1.com" },
    ]);

    tagsComponent.vm.$emit("update:modelValue", ["new tag"]);

    await wrapper
      .findAllComponents(FunctionButton)
      .at(1)
      .find("button")
      .trigger("click");

    expect(wrapper.emitted("editCancel")).toBeDefined();

    // values are reset
    expect(descriptionComponent.props("modelValue")).toBe(description.value);
    expect(linksComponent.props("modelValue")).toEqual(links);
    expect(tagsComponent.props("modelValue")).toEqual(tags);
  });
});
