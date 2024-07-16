import { describe, expect, it } from "vitest";
import { VueWrapper, mount } from "@vue/test-utils";
import { nextTick } from "vue";

import { createAvailablePortTypes, createWorkflow } from "@/test/factories";
import {
  ComponentNodeAndDescription,
  PortType,
  TypedText,
  type Link,
} from "@/api/gateway-api/generated-api";

import { FunctionButton } from "@knime/components";
import ExternalResourcesList from "@/components/common/ExternalResourcesList.vue";

import ComponentMetadata from "../ComponentMetadata.vue";
import MetadataDescription from "../MetadataDescription.vue";
import MetadataTags from "../MetadataTags.vue";
import ComponentIconEditor from "../ComponentIconEditor.vue";
import ComponentTypeEditor from "../ComponentTypeEditor.vue";
import ComponentMetadataNodeFeatures from "../ComponentMetadataNodeFeatures.vue";

describe("ComponentMetadata.vue", () => {
  type ComponentProps = InstanceType<typeof ComponentMetadata>["$props"];

  const workflow = createWorkflow({
    info: { containerId: "root:3:1" },
    componentMetadata: {
      name: "Component name",
      description: {
        value: "This is a dummy description",
        contentType: TypedText.ContentTypeEnum.Plain,
      },
      type: ComponentNodeAndDescription.TypeEnum.Learner,
      icon: "data:image/someImage",
      inPorts: [],
      outPorts: [],
      links: [
        { text: "link1", url: "http://link1.com" },
        { text: "link2", url: "http://link2.com" },
      ],
      tags: ["tag1", "tag2"],
    },
    projectId: "project1",
  });

  const availableComponentTypes = ["Learner", "Type2", "Type3", "Type4"];

  const defaultProps: ComponentProps = {
    projectId: workflow.projectId,
    componentId: workflow.info.containerId,
    componentMetadata: workflow.componentMetadata!,
    availableComponentTypes,
    availablePortTypes: createAvailablePortTypes({
      "org.some.otherPorType": {
        kind: PortType.KindEnum.Other,
        color: "blue",
        name: "Some other port",
      },
    }),
    isWorkflowWritable: true,
    singleMetanodeSelectedId: null,
  };

  const doMount = ({ props }: { props?: Partial<ComponentProps> } = {}) => {
    const wrapper = mount(ComponentMetadata, {
      props: { ...defaultProps, ...props },
      global: {
        stubs: { RichTextEditor: true },
      },
    });

    return { wrapper };
  };

  const startEdit = async (wrapper: VueWrapper<any>) => {
    await wrapper.find("[data-test-id='edit-button']").trigger("click");
  };

  const triggerSave = async (wrapper: VueWrapper<any>) => {
    await wrapper.find("[data-test-id='save-button']").trigger("click");
  };

  const cancelEdit = async (wrapper: VueWrapper<any>) => {
    await wrapper.find("[data-test-id='cancel-edit-button']").trigger("click");
  };

  const modifyContent = (
    wrapper: VueWrapper<any>,
    {
      description = "This is a new description",
      links = [{ text: "link3", url: "://link3.com" }],
      tags = ["new tag"],
      icon = "data:image/anotherImage",
      type = "Type2",
    }: {
      description?: string;
      links?: Link[];
      tags?: string[];
      icon?: string;
      type?: string;
    } = {},
  ) => {
    const descriptionComponent = wrapper.findComponent(MetadataDescription);
    const linksComponent = wrapper.findComponent(ExternalResourcesList);
    const tagsComponent = wrapper.findComponent(MetadataTags);

    const iconComponent = wrapper.findComponent(ComponentIconEditor);
    const typeComponent = wrapper.findComponent(ComponentTypeEditor);
    const nodeFeaturesComponent = wrapper.findComponent(
      ComponentMetadataNodeFeatures,
    );

    descriptionComponent.vm.$emit("update:modelValue", description);

    linksComponent.vm.$emit("update:modelValue", links);

    tagsComponent.vm.$emit("update:modelValue", tags);

    iconComponent.vm.$emit("update:modelValue", icon);

    typeComponent.vm.$emit("update:modelValue", type);

    nodeFeaturesComponent.vm.$emit("update:inPorts", [
      { name: "My Port", description: "Some Text" },
      { name: "Another Port", description: "Some moreText" },
    ]);

    nodeFeaturesComponent.vm.$emit("update:outPorts", [
      { name: "My out Port", description: "Some Text for the out port" },
      { name: "Another out Port", description: "Some different text" },
    ]);
  };

  it("should render content", () => {
    const { wrapper } = doMount();

    const { description, links, tags } = workflow.componentMetadata!;

    expect(wrapper.findAllComponents(FunctionButton).length).toBe(1);
    expect(wrapper.findComponent(MetadataDescription).props("editable")).toBe(
      false,
    );
    expect(wrapper.findComponent(MetadataDescription).props("modelValue")).toBe(
      description!.value,
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

    await startEdit(wrapper);

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

    await startEdit(wrapper);

    modifyContent(wrapper);

    await triggerSave(wrapper);

    expect(wrapper.emitted("save")![0][0]).toEqual({
      description: {
        contentType: TypedText.ContentTypeEnum.Html,
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
      links: [{ text: "link3", url: "://link3.com" }],
      tags: ["new tag"],
      projectId: "project1",
      type: "Type2",
      workflowId: "root:3:1",
    });
  });

  it("should disable saving if data is invalid", async () => {
    const { wrapper } = doMount();

    await startEdit(wrapper);

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
    const { wrapper } = doMount();

    await wrapper.findComponent(FunctionButton).find("button").trigger("click");

    const { description, links, tags } = workflow.componentMetadata!;

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

    await cancelEdit(wrapper);

    // values are reset
    expect(descriptionComponent.props("modelValue")).toBe(description!.value);
    expect(linksComponent.props("modelValue")).toEqual(links);
    expect(tagsComponent.props("modelValue")).toEqual(tags);
  });

  it("should save content on click away", async () => {
    const { wrapper } = doMount();

    const workflow2 = createWorkflow({
      info: { containerId: "root:3:1" },
      componentMetadata: {
        name: "Component name 2",
        description: {
          value: "This is another description",
          contentType: TypedText.ContentTypeEnum.Plain,
        },
        type: ComponentNodeAndDescription.TypeEnum.Learner,
        icon: "data:image/someImage",
        inPorts: [],
        outPorts: [],
        links: [{ text: "link1", url: "http://link1.com" }],
        tags: ["tag3"],
      },
      projectId: "project2",
    });

    await startEdit(wrapper);

    modifyContent(wrapper);

    expect(wrapper.emitted("save")).toBeUndefined();

    // simulate clicking away and switching to another workflow
    window.dispatchEvent(new Event("click"));
    await wrapper.setProps({
      projectId: workflow2.projectId,
      componentId: workflow2.info.containerId,
      componentMetadata: workflow2.componentMetadata!,
    });

    expect(wrapper.emitted("save")![0][0]).toEqual({
      description: {
        contentType: TypedText.ContentTypeEnum.Html,
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
      links: [{ text: "link3", url: "://link3.com" }],
      tags: ["new tag"],
      projectId: "project1",
      type: "Type2",
      workflowId: "root:3:1",
    });

    const { componentMetadata: componentMetadata2 } = workflow2;
    expect(wrapper.findComponent(MetadataDescription).props("editable")).toBe(
      false,
    );
    expect(wrapper.findComponent(MetadataDescription).props("modelValue")).toBe(
      componentMetadata2!.description!.value,
    );

    expect(wrapper.findComponent(ExternalResourcesList).props("editable")).toBe(
      false,
    );
    expect(
      wrapper.findComponent(ExternalResourcesList).props("modelValue"),
    ).toEqual(componentMetadata2!.links);

    expect(wrapper.findComponent(MetadataTags).props("editable")).toBe(false);
    expect(wrapper.findComponent(MetadataTags).props("modelValue")).toEqual(
      componentMetadata2!.tags,
    );
  });

  it("should save content before unmount", async () => {
    const { wrapper } = doMount();

    await startEdit(wrapper);

    modifyContent(wrapper);

    wrapper.unmount();

    expect(wrapper.emitted("save")![0][0]).toEqual({
      description: {
        contentType: TypedText.ContentTypeEnum.Html,
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
      links: [{ text: "link3", url: "://link3.com" }],
      tags: ["new tag"],
      projectId: "project1",
      type: "Type2",
      workflowId: "root:3:1",
    });
  });

  it("should not allow edit if workflow is not writable", () => {
    const { wrapper } = doMount({ props: { isWorkflowWritable: false } });

    expect(wrapper.find("[data-test-id='edit-button']").exists()).toBe(false);
  });

  it("should exit edit when a single metanode gets selected and there are no changes", async () => {
    const { wrapper } = doMount();

    await startEdit(wrapper);

    expect(wrapper.find("[data-test-id='cancel-edit-button']").exists()).toBe(
      true,
    );

    await wrapper.setProps({ singleMetanodeSelectedId: "root:something" });
    expect(wrapper.find("[data-test-id='cancel-edit-button']").exists()).toBe(
      false,
    );
    expect(wrapper.emitted("save")).toBeUndefined();
  });

  it("should save content when a single metanode gets selected", async () => {
    const { wrapper } = doMount();

    await startEdit(wrapper);

    modifyContent(wrapper);

    await wrapper.setProps({ singleMetanodeSelectedId: "root:something" });

    expect(wrapper.emitted("save")![0][0]).toEqual({
      description: {
        contentType: TypedText.ContentTypeEnum.Html,
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
      links: [{ text: "link3", url: "://link3.com" }],
      tags: ["new tag"],
      projectId: "project1",
      type: "Type2",
      workflowId: "root:3:1",
    });
  });

  it("should save only valid data on click-away", async () => {
    const workflow2 = createWorkflow({
      info: { containerId: "root:3:1" },
      componentMetadata: {
        name: "Component name 2",
        description: {
          value: "This is another description",
          contentType: TypedText.ContentTypeEnum.Plain,
        },
        type: ComponentNodeAndDescription.TypeEnum.Learner,
        icon: "data:image/someImage",
        inPorts: [],
        outPorts: [],
        links: [{ text: "link1", url: "http://link1.com" }],
        tags: ["tag3"],
      },
      projectId: "project2",
    });

    const { wrapper } = doMount();

    await startEdit(wrapper);

    modifyContent(wrapper, {
      links: [{ text: "invalid", url: "somethinginvalid" }],
    });
    wrapper.findComponent(ExternalResourcesList).vm.$emit("valid", false);

    // simulate clicking away and switching to another workflow
    window.dispatchEvent(new Event("click"));
    await wrapper.setProps({
      projectId: workflow2.projectId,
      componentId: workflow2.info.containerId,
      componentMetadata: workflow2.componentMetadata!,
    });

    expect(wrapper.emitted("save")![0][0]).toEqual({
      description: {
        contentType: TypedText.ContentTypeEnum.Html,
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
      links: defaultProps.componentMetadata.links,
      tags: ["new tag"],
      projectId: "project1",
      type: "Type2",
      workflowId: "root:3:1",
    });
  });
});
