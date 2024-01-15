import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import { mockVuexStore } from "@/test/utils";
import { createWorkflow } from "@/test/factories";
import { TypedText, type Workflow } from "@/api/gateway-api/generated-api";
import * as workflowStore from "@/store/workflow";
import * as applicationStore from "@/store/application";

import FunctionButton from "webapps-common/ui/components/FunctionButton.vue";
import ExternalResourcesList from "@/components/common/ExternalResourcesList.vue";

import ProjectMetadata from "../ProjectMetadata.vue";
import MetadataDescription from "../MetadataDescription.vue";
import MetadataTags from "../MetadataTags.vue";

describe("ProjectMetadata.vue", () => {
  const doMount = ({
    customWorkflow = null,
  }: { customWorkflow?: Workflow } = {}) => {
    const baseWorkflow = createWorkflow({
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
      // @ts-ignore
      projectId: "project1",
    });

    const $store = mockVuexStore({
      workflow: workflowStore,
      application: applicationStore,
    });

    const workflow = customWorkflow || baseWorkflow;

    $store.commit("workflow/setActiveWorkflow", workflow);

    const wrapper = mount(ProjectMetadata, {
      global: {
        plugins: [$store],
        stubs: { RichTextEditor: true },
      },
    });

    return { wrapper, workflow, $store };
  };

  it("should render content", () => {
    const { wrapper, workflow } = doMount();

    const { description, links, tags } = workflow.projectMetadata;

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
  });

  // eslint-disable-next-line vitest/no-disabled-tests
  it.skip("should update metadata", async () => {
    const { wrapper } = doMount();

    await wrapper.findComponent(FunctionButton).find("button").trigger("click");

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

    await wrapper.findComponent(FunctionButton).find("button").trigger("click");

    expect(wrapper.emitted("save")[0][0]).toEqual({
      description: {
        contentType: TypedText.ContentTypeEnum.Html,
        value: "<p>This is a new description</>",
      },
      links: [{ text: "link3", url: "://link1.com" }],
      tags: ["new tag"],
      projectId: "project1",
      workflowId: "root",
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
    const { wrapper, workflow } = doMount();

    await wrapper.findComponent(FunctionButton).find("button").trigger("click");

    const { description, links, tags } = workflow.projectMetadata;

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

  it("should hold different metadata draft states for multiple projects", async () => {
    const customWorkflow1 = createWorkflow({
      projectMetadata: {
        description: {
          value: "This is the description of the 1st workflow",
          contentType: TypedText.ContentTypeEnum.Plain,
        },
        links: [{ text: "WF1 link1", url: "http://link1.com" }],
        tags: ["tag1", "tag2"],
      },
      // @ts-ignore
      projectId: "project1",
    });

    const customWorkflow2 = createWorkflow({
      projectMetadata: {
        description: {
          value: "This is the description of the 2nd workflow",
          contentType: TypedText.ContentTypeEnum.Plain,
        },
        links: [{ text: "WF2 link1", url: "http://link2.com" }],
        tags: ["tag3", "tag4"],
      },
      // @ts-ignore
      projectId: "project2",
    });

    const { wrapper, $store } = doMount({ customWorkflow: customWorkflow1 });

    await wrapper.findComponent(FunctionButton).find("button").trigger("click");

    const descriptionComponent = wrapper.findComponent(MetadataDescription);
    const linksComponent = wrapper.findComponent(ExternalResourcesList);
    const tagsComponent = wrapper.findComponent(MetadataTags);

    expect(descriptionComponent.props("modelValue")).toEqual(
      customWorkflow1.projectMetadata.description.value,
    );
    expect(linksComponent.props("modelValue")).toEqual(
      customWorkflow1.projectMetadata.links,
    );
    expect(tagsComponent.props("modelValue")).toEqual(
      customWorkflow1.projectMetadata.tags,
    );

    // switch to workflow 2
    $store.commit("workflow/setActiveWorkflow", customWorkflow2);
    await nextTick();

    expect(descriptionComponent.props("modelValue")).toEqual(
      customWorkflow2.projectMetadata.description.value,
    );
    expect(linksComponent.props("modelValue")).toEqual(
      customWorkflow2.projectMetadata.links,
    );
    expect(tagsComponent.props("modelValue")).toEqual(
      customWorkflow2.projectMetadata.tags,
    );

    // switch back to workflow 1
    $store.commit("workflow/setActiveWorkflow", customWorkflow1);
    await nextTick();

    expect(descriptionComponent.props("modelValue")).toEqual(
      customWorkflow1.projectMetadata.description.value,
    );
    expect(linksComponent.props("modelValue")).toEqual(
      customWorkflow1.projectMetadata.links,
    );
    expect(tagsComponent.props("modelValue")).toEqual(
      customWorkflow1.projectMetadata.tags,
    );
  });

  describe("prompt user before leaving edited metadata", () => {
    // eslint-disable-next-line vitest/no-disabled-tests
    it.skip("should save changes if user confirms", async () => {
      window.confirm = vi.fn(() => true);

      const customWorkflow1 = createWorkflow({
        projectMetadata: {
          description: {
            value: "This is the description of the 1st workflow",
            contentType: TypedText.ContentTypeEnum.Plain,
          },
          links: [{ text: "WF1 link1", url: "http://link1.com" }],
          tags: ["tag1", "tag2"],
        },
        // @ts-ignore
        projectId: "project1",
      });

      const customWorkflow2 = createWorkflow({
        projectMetadata: {
          description: {
            value: "This is the description of the 2nd workflow",
            contentType: TypedText.ContentTypeEnum.Plain,
          },
          links: [{ text: "WF2 link1", url: "http://link2.com" }],
          tags: ["tag3", "tag4"],
        },
        // @ts-ignore
        projectId: "project2",
      });

      const { wrapper, $store } = doMount({ customWorkflow: customWorkflow1 });

      await wrapper
        .findComponent(FunctionButton)
        .find("button")
        .trigger("click");

      const descriptionComponent = wrapper.findComponent(MetadataDescription);
      const linksComponent = wrapper.findComponent(ExternalResourcesList);
      const tagsComponent = wrapper.findComponent(MetadataTags);

      expect(descriptionComponent.props("modelValue")).toEqual(
        customWorkflow1.projectMetadata.description.value,
      );
      expect(linksComponent.props("modelValue")).toEqual(
        customWorkflow1.projectMetadata.links,
      );
      expect(tagsComponent.props("modelValue")).toEqual(
        customWorkflow1.projectMetadata.tags,
      );

      // update description
      descriptionComponent.vm.$emit(
        "update:modelValue",
        "<p>This is an updated description for workflow1</>",
      );

      // update links
      linksComponent.vm.$emit("update:modelValue", [
        { text: "link3", url: "://link3.com" },
      ]);

      // update tags
      tagsComponent.vm.$emit("update:modelValue", ["new tag"]);

      // switch to workflow 2
      $store.commit("workflow/setActiveWorkflow", customWorkflow2);
      await nextTick();

      expect(window.confirm).toHaveBeenCalled();
      expect(wrapper.emitted("save")[0][0]).toEqual({
        description: {
          contentType: TypedText.ContentTypeEnum.Html,
          value: "<p>This is an updated description for workflow1</>",
        },
        links: [{ text: "link3", url: "://link3.com" }],
        tags: ["new tag"],
        projectId: "project1",
        workflowId: "root",
      });

      // switch back to workflow 1
      $store.commit("workflow/setActiveWorkflow", customWorkflow1);
      await nextTick();

      expect(wrapper.find('button[title="Edit metadata"]').exists()).toBe(true);
      expect(wrapper.find('button[title="Save metadata"]').exists()).toBe(
        false,
      );
    });

    it("should discard changes if user cancels", async () => {
      window.confirm = vi.fn(() => false);

      const customWorkflow1 = createWorkflow({
        projectMetadata: {
          description: {
            value: "This is the description of the 1st workflow",
            contentType: TypedText.ContentTypeEnum.Plain,
          },
          links: [{ text: "WF1 link1", url: "http://link1.com" }],
          tags: ["tag1", "tag2"],
        },
        // @ts-ignore
        projectId: "project1",
      });

      const customWorkflow2 = createWorkflow({
        projectMetadata: {
          description: {
            value: "This is the description of the 2nd workflow",
            contentType: TypedText.ContentTypeEnum.Plain,
          },
          links: [{ text: "WF2 link1", url: "http://link2.com" }],
          tags: ["tag3", "tag4"],
        },
        // @ts-ignore
        projectId: "project2",
      });

      const { wrapper, $store } = doMount({ customWorkflow: customWorkflow1 });

      await wrapper
        .findComponent(FunctionButton)
        .find("button")
        .trigger("click");

      const descriptionComponent = wrapper.findComponent(MetadataDescription);
      const linksComponent = wrapper.findComponent(ExternalResourcesList);
      const tagsComponent = wrapper.findComponent(MetadataTags);

      expect(descriptionComponent.props("modelValue")).toEqual(
        customWorkflow1.projectMetadata.description.value,
      );
      expect(linksComponent.props("modelValue")).toEqual(
        customWorkflow1.projectMetadata.links,
      );
      expect(tagsComponent.props("modelValue")).toEqual(
        customWorkflow1.projectMetadata.tags,
      );

      // update description
      descriptionComponent.vm.$emit(
        "update:modelValue",
        "<p>This is an updated description for workflow1</>",
      );

      // update links
      linksComponent.vm.$emit("update:modelValue", [
        { text: "link3", url: "://link3.com" },
      ]);

      // update tags
      tagsComponent.vm.$emit("update:modelValue", ["new tag"]);

      // switch to workflow 2
      $store.commit("workflow/setActiveWorkflow", customWorkflow2);
      await nextTick();

      expect(window.confirm).toHaveBeenCalled();
      expect(wrapper.emitted("save")).toBeUndefined();

      // switch back to workflow 1
      $store.commit("workflow/setActiveWorkflow", customWorkflow1);
      await nextTick();

      expect(wrapper.find('button[title="Edit metadata"]').exists()).toBe(true);
      expect(wrapper.find('button[title="Save metadata"]').exists()).toBe(
        false,
      );
    });
  });
});
