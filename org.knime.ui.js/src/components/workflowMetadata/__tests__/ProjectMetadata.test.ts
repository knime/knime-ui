import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { VueWrapper, mount } from "@vue/test-utils";

import { FunctionButton } from "@knime/components";

import { type Link, TypedText } from "@/api/gateway-api/generated-api";
import ExternalResourcesList from "@/components/common/ExternalResourcesList.vue";
import { createWorkflow } from "@/test/factories";
import MetadataDescription from "../MetadataDescription.vue";
import MetadataTags from "../MetadataTags.vue";
import ProjectMetadata from "../ProjectMetadata.vue";

describe("ProjectMetadata.vue", () => {
  type ComponentProps = InstanceType<typeof ProjectMetadata>["$props"];

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
    projectId: "project1",
  });

  const defaultProps: ComponentProps = {
    projectId: workflow.projectId,
    workflowId: workflow.info.containerId,
    isWorkflowWritable: true,
    projectMetadata: workflow.projectMetadata!,
    singleMetanodeSelectedId: null,
  };

  const doMount = ({ props }: { props?: Partial<ComponentProps> } = {}) => {
    const wrapper = mount(ProjectMetadata, {
      props: { ...defaultProps, ...props },
      global: {
        stubs: { RichTextEditor: true },
      },
    });

    return { wrapper, workflow };
  };

  it("should render content", () => {
    const { wrapper, workflow } = doMount();

    const { description, links, tags } = workflow.projectMetadata!;

    expect(wrapper.findAllComponents(FunctionButton).length).toBe(2);
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

    await wrapper.find("[data-test-id='edit-button']").trigger("click");

    expect(wrapper.findComponent(MetadataDescription).props("editable")).toBe(
      true,
    );

    expect(wrapper.findComponent(ExternalResourcesList).props("editable")).toBe(
      true,
    );

    expect(wrapper.findComponent(MetadataTags).props("editable")).toBe(true);
  });

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
      description = "<p>This is a new description</>",
      links = [{ text: "link3", url: "://link3.com" }],
      tags = ["new tag"],
    }: { description?: string; links?: Link[]; tags?: string[] } = {},
  ) => {
    const descriptionComponent = wrapper.findComponent(MetadataDescription);
    const linksComponent = wrapper.findComponent(ExternalResourcesList);
    const tagsComponent = wrapper.findComponent(MetadataTags);

    descriptionComponent.vm.$emit("update:modelValue", description);

    linksComponent.vm.$emit("update:modelValue", links);

    tagsComponent.vm.$emit("update:modelValue", tags);
  };

  it("should update metadata", async () => {
    const { wrapper } = doMount();

    await startEdit(wrapper);

    modifyContent(wrapper);

    await triggerSave(wrapper);

    expect(wrapper.emitted("save")![0][0]).toEqual({
      description: {
        contentType: TypedText.ContentTypeEnum.Html,
        value: "<p>This is a new description</>",
      },
      links: [{ text: "link3", url: "://link3.com" }],
      tags: ["new tag"],
      projectId: defaultProps.projectId,
      workflowId: defaultProps.workflowId,
    });
  });

  it("should disable saving if data is invalid", async () => {
    const { wrapper } = doMount();

    await startEdit(wrapper);

    expect(
      wrapper.find("[data-test-id='save-button']").attributes("disabled"),
    ).toBeUndefined();

    wrapper.findComponent(ExternalResourcesList).vm.$emit("valid", false);

    await nextTick();

    expect(
      wrapper.find("[data-test-id='save-button']").attributes("disabled"),
    ).toBeDefined();
  });

  it("should cancel an edit", async () => {
    const { wrapper, workflow } = doMount();

    await startEdit(wrapper);

    const { description, links, tags } = workflow.projectMetadata!;

    const descriptionComponent = wrapper.findComponent(MetadataDescription);
    const linksComponent = wrapper.findComponent(ExternalResourcesList);
    const tagsComponent = wrapper.findComponent(MetadataTags);

    modifyContent(wrapper);

    await cancelEdit(wrapper);

    // values are reset
    expect(descriptionComponent.props("modelValue")).toBe(description!.value);
    expect(linksComponent.props("modelValue")).toEqual(links);
    expect(tagsComponent.props("modelValue")).toEqual(tags);
  });

  it("should reset internal state when metadata changes", async () => {
    const { wrapper } = doMount();

    const workflow2 = createWorkflow({
      projectMetadata: {
        description: {
          value: "This is the description of the 2nd workflow",
          contentType: TypedText.ContentTypeEnum.Html,
        },
        links: [{ text: "WF2 link1", url: "http://link2.com" }],
        tags: ["tag3", "tag4"],
      },
      projectId: "project2",
    });

    await startEdit(wrapper); // but don't make any changes

    // simulate clicking away and switching to another workflow
    window.dispatchEvent(new Event("click"));
    await wrapper.setProps({
      projectId: workflow2.projectId,
      workflowId: workflow2.info.containerId,
      projectMetadata: workflow2.projectMetadata!,
    });

    expect(wrapper.emitted("save")).toBeUndefined();

    const { projectMetadata: projectMetadata2 } = workflow2;
    expect(wrapper.findComponent(MetadataDescription).props("editable")).toBe(
      false,
    );
    expect(wrapper.findComponent(MetadataDescription).props("modelValue")).toBe(
      projectMetadata2!.description!.value,
    );

    expect(wrapper.findComponent(ExternalResourcesList).props("editable")).toBe(
      false,
    );
    expect(
      wrapper.findComponent(ExternalResourcesList).props("modelValue"),
    ).toEqual(projectMetadata2!.links);

    expect(wrapper.findComponent(MetadataTags).props("editable")).toBe(false);
    expect(wrapper.findComponent(MetadataTags).props("modelValue")).toEqual(
      projectMetadata2!.tags,
    );
  });

  it("should save content on click away", async () => {
    const { wrapper } = doMount();

    const workflow2 = createWorkflow({
      projectMetadata: {
        description: {
          value: "This is the description of the 2nd workflow",
          contentType: TypedText.ContentTypeEnum.Plain,
        },
        links: [{ text: "WF2 link1", url: "http://link2.com" }],
        tags: ["tag3", "tag4"],
      },
      projectId: "project2",
    });

    await startEdit(wrapper);

    modifyContent(wrapper, {
      description: "<p>This is an updated description for workflow1</>",
    });

    expect(wrapper.emitted("save")).toBeUndefined();

    // simulate clicking away and switching to another workflow
    window.dispatchEvent(new Event("click"));
    await wrapper.setProps({
      projectId: workflow2.projectId,
      workflowId: workflow2.info.containerId,
      projectMetadata: workflow2.projectMetadata!,
    });

    expect(wrapper.emitted("save")![0][0]).toEqual({
      description: {
        contentType: TypedText.ContentTypeEnum.Html,
        value: "<p>This is an updated description for workflow1</>",
      },
      links: [{ text: "link3", url: "://link3.com" }],
      tags: ["new tag"],
      projectId: defaultProps.projectId,
      workflowId: defaultProps.workflowId,
    });

    const { projectMetadata: projectMetadata2 } = workflow2;
    expect(wrapper.findAllComponents(FunctionButton).length).toBe(2);
    expect(wrapper.findComponent(MetadataDescription).props("editable")).toBe(
      false,
    );
    expect(wrapper.findComponent(MetadataDescription).props("modelValue")).toBe(
      projectMetadata2!.description!.value,
    );

    expect(wrapper.findComponent(ExternalResourcesList).props("editable")).toBe(
      false,
    );
    expect(
      wrapper.findComponent(ExternalResourcesList).props("modelValue"),
    ).toEqual(projectMetadata2!.links);

    expect(wrapper.findComponent(MetadataTags).props("editable")).toBe(false);
    expect(wrapper.findComponent(MetadataTags).props("modelValue")).toEqual(
      projectMetadata2!.tags,
    );
  });

  it("should save content before unmount", async () => {
    const { wrapper } = doMount();

    await startEdit(wrapper);

    modifyContent(wrapper);

    expect(wrapper.emitted("save")).toBeUndefined();

    wrapper.unmount();

    expect(wrapper.emitted("save")![0][0]).toEqual({
      description: {
        contentType: TypedText.ContentTypeEnum.Html,
        value: "<p>This is a new description</>",
      },
      links: [{ text: "link3", url: "://link3.com" }],
      tags: ["new tag"],
      projectId: defaultProps.projectId,
      workflowId: defaultProps.workflowId,
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
        value: "<p>This is a new description</>",
      },
      links: [{ text: "link3", url: "://link3.com" }],
      tags: ["new tag"],
      projectId: defaultProps.projectId,
      workflowId: defaultProps.workflowId,
    });
  });

  it("should save only valid data on click-away", async () => {
    const workflow2 = createWorkflow({
      projectMetadata: {
        description: {
          value: "This is the description of the 2nd workflow",
          contentType: TypedText.ContentTypeEnum.Plain,
        },
        links: [{ text: "WF2 link1", url: "http://link2.com" }],
        tags: ["tag3", "tag4"],
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
      workflowId: workflow2.info.containerId,
      projectMetadata: workflow2.projectMetadata!,
    });

    expect(wrapper.emitted("save")![0][0]).toEqual({
      description: {
        contentType: TypedText.ContentTypeEnum.Html,
        value: "<p>This is a new description</>",
      },
      links: defaultProps.projectMetadata.links,
      tags: ["new tag"],
      projectId: defaultProps.projectId,
      workflowId: defaultProps.workflowId,
    });
  });
});
