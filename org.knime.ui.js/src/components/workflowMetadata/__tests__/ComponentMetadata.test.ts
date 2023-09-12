import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import { mockVuexStore } from "@/test/utils";
import { createAvailablePortTypes } from "@/test/factories";
import { PortType, TypedText } from "@/api/gateway-api/generated-api";

import FunctionButton from "webapps-common/ui/components/FunctionButton.vue";
import ExternalResourcesList from "@/components/common/ExternalResourcesList.vue";

import ComponentMetadata from "../ComponentMetadata.vue";
import MetadataDescription from "../MetadataDescription.vue";
import MetadataTags from "../MetadataTags.vue";
import ComponentIconEditor from "../ComponentIconEditor.vue";
import ComponentTypeEditor from "../ComponentTypeEditor.vue";
import ComponentMetadataNodeFeatures from "../ComponentMetadataNodeFeatures.vue";

describe("ComponentMetadata.vue", () => {
  const doMount = ({
    customComponentMetadata = null,
  }: { customComponentMetadata?: ComponentMetadata } = {}) => {
    const componentMetadata = {
      description: {
        value: "This is a dummy description",
        contentType: TypedText.ContentTypeEnum.Plain,
      },
      type: "Learner",
      icon: "data:image/someImage",
      inPorts: [],
      outPorts: [],
      links: [
        { text: "link1", url: "http://link1.com" },
        { text: "link2", url: "http://link2.com" },
      ],
      tags: ["tag1", "tag2"],
    };

    const $store = mockVuexStore({
      application: {
        state: {
          availableComponentTypes: ["Learner", "Type2", "Type3", "Type4"],
        },
      },
    });

    const wrapper = mount(ComponentMetadata, {
      props: {
        componentMetadata: customComponentMetadata || componentMetadata,
        projectId: "project1",
        componentId: "root:3:1",
        availablePortTypes: createAvailablePortTypes({
          "org.some.otherPorType": {
            kind: PortType.KindEnum.Other,
            color: "blue",
            name: "Some other port",
          },
        }),
      },
      global: {
        plugins: [$store],
        stubs: { RichTextEditor: true },
      },
    });

    return { wrapper, componentMetadata, $store };
  };

  it("should render content", () => {
    const { wrapper, componentMetadata } = doMount();

    const { description, links, tags } = componentMetadata;

    expect(wrapper.findAllComponents(FunctionButton).length).toBe(1);
    expect(wrapper.findComponent(MetadataDescription).props("editable")).toBe(
      false,
    );
    expect(wrapper.findComponent(MetadataDescription).props("modelValue")).toBe(
      description.value,
    );

    expect(wrapper.findComponent(ExternalResourcesList).props("editable")).toBe(
      false,
    );
    expect(
      wrapper.findComponent(ExternalResourcesList).props("modelValue"),
    ).toEqual(links);

    expect(wrapper.findComponent(MetadataTags).props("editable")).toBe(false);
    expect(wrapper.findComponent(MetadataTags).props("modelValue")).toEqual(
      tags,
    );
  });

  it("should go into edit mode", async () => {
    const { wrapper } = doMount();

    await wrapper.findComponent(FunctionButton).find("button").trigger("click");

    expect(wrapper.findComponent(MetadataDescription).props("editable")).toBe(
      true,
    );

    expect(wrapper.findComponent(ExternalResourcesList).props("editable")).toBe(
      true,
    );

    expect(wrapper.findComponent(MetadataTags).props("editable")).toBe(true);

    expect(
      wrapper.findComponent(ComponentMetadataNodeFeatures).props("editable"),
    ).toBe(true);

    expect(wrapper.findComponent(ComponentIconEditor).exists()).toBe(true);
    expect(wrapper.findComponent(ComponentTypeEditor).exists()).toBe(true);
  });

  it("should update metadata", async () => {
    const { wrapper } = doMount();

    await wrapper.findComponent(FunctionButton).find("button").trigger("click");

    const descriptionComponent = wrapper.findComponent(MetadataDescription);
    const linksComponent = wrapper.findComponent(ExternalResourcesList);
    const tagsComponent = wrapper.findComponent(MetadataTags);

    const iconComponent = wrapper.findComponent(ComponentIconEditor);
    const typeComponent = wrapper.findComponent(ComponentTypeEditor);
    const nodeFeaturesComponent = wrapper.findComponent(
      ComponentMetadataNodeFeatures,
    );

    descriptionComponent.vm.$emit(
      "update:modelValue",
      "This is a new description",
    );

    linksComponent.vm.$emit("update:modelValue", [
      { text: "link3", url: "://link1.com" },
    ]);

    tagsComponent.vm.$emit("update:modelValue", ["new tag"]);

    iconComponent.vm.$emit("update:modelValue", "data:image/anotherImage");

    typeComponent.vm.$emit("update:modelValue", "Type2");

    nodeFeaturesComponent.vm.$emit("update:inPorts", [
      { name: "My Port", description: "Some Text" },
      { name: "Another Port", description: "Some moreText" },
    ]);

    nodeFeaturesComponent.vm.$emit("update:outPorts", [
      { name: "My out Port", description: "Some Text for the out port" },
      { name: "Another out Port", description: "Some different text" },
    ]);

    await wrapper.findComponent(FunctionButton).find("button").trigger("click");

    expect(wrapper.emitted("save")[0][0]).toEqual({
      description: {
        contentType: TypedText.ContentTypeEnum.Plain,
        value: "This is a new description",
      },
      icon: "data:image/anotherImage",
      inPorts: [
        { description: "Some Text", name: "My Port" },
        {
          description: "Some moreText",
          name: "Another Port",
        },
      ],
      outPorts: [
        { description: "Some Text for the out port", name: "My out Port" },
        {
          description: "Some different text",
          name: "Another out Port",
        },
      ],
      links: [{ text: "link3", url: "://link1.com" }],
      tags: ["new tag"],
      projectId: "project1",
      type: "Type2",
      workflowId: "root:3:1",
    });
  });

  it("should disable saving if data is invalid", async () => {
    const { wrapper } = doMount();

    await wrapper.findComponent(FunctionButton).find("button").trigger("click");

    expect(
      wrapper
        .findComponent(FunctionButton)
        .find("button")
        .attributes("disabled"),
    ).toBeUndefined();

    wrapper.findComponent(ExternalResourcesList).vm.$emit("valid", false);

    await nextTick();

    expect(
      wrapper
        .findComponent(FunctionButton)
        .find("button")
        .attributes("disabled"),
    ).toBeDefined();
  });

  it("should cancel an edit", async () => {
    const { wrapper, componentMetadata } = doMount();

    await wrapper.findComponent(FunctionButton).find("button").trigger("click");

    const { description, links, tags } = componentMetadata;

    const descriptionComponent = wrapper.findComponent(MetadataDescription);
    const linksComponent = wrapper.findComponent(ExternalResourcesList);
    const tagsComponent = wrapper.findComponent(MetadataTags);

    descriptionComponent.vm.$emit(
      "update:modelValue",
      "<p>This is a new description</>",
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

    // values are reset
    expect(descriptionComponent.props("modelValue")).toBe(description.value);
    expect(linksComponent.props("modelValue")).toEqual(links);
    expect(tagsComponent.props("modelValue")).toEqual(tags);
  });
});
