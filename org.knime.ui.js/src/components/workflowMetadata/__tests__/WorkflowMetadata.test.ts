import { mount } from "@vue/test-utils";
import { expect, describe, it, vi } from "vitest";
import { nextTick } from "vue";

import { mockVuexStore } from "@/test/utils/mockVuexStore";
import { createAvailablePortTypes, createWorkflow } from "@/test/factories";

import LinkList from "webapps-common/ui/components/LinkList.vue";
import NodeFeatureList from "webapps-common/ui/components/node/NodeFeatureList.vue";
import NodePreview from "webapps-common/ui/components/node/NodePreview.vue";
import TagList from "webapps-common/ui/components/TagList.vue";
import Tag from "webapps-common/ui/components/Tag.vue";

import {
  ComponentNodeAndDescription,
  TypedText,
  WorkflowInfo,
  type Workflow,
} from "@/api/gateway-api/generated-api";
import * as selectionStore from "@/store/selection";
import * as workflowStore from "@/store/workflow";
import * as applicationStore from "@/store/application";

import ExternalResourcesList from "@/components/common/ExternalResourcesList.vue";

import WorkflowMetadata from "../WorkflowMetadata.vue";
import ProjectMetadata from "../ProjectMetadata.vue";
import ComponentMetadata from "../ComponentMetadata.vue";
import MetadataDescription from "../MetadataDescription.vue";
import ComponentMetadataNodeFeatures from "../ComponentMetadataNodeFeatures.vue";

vi.mock("@/environment");

describe("WorkflowMetadata.vue", () => {
  const doMount = ({
    workflow = null,
  }: { workflow?: Workflow | null } = {}) => {
    const availablePortTypes = createAvailablePortTypes();
    const $store = mockVuexStore({
      selection: selectionStore,
      workflow: workflowStore,

      application: {
        state: {
          ...applicationStore.state(),
          availablePortTypes,
        },
      },
    });

    const baseWorkflow = createWorkflow({
      info: {
        name: "filename",
        containerType: WorkflowInfo.ContainerTypeEnum.Project,
      },
      projectMetadata: {
        lastEdit: "",
      },
    });

    $store.commit("workflow/setActiveWorkflow", workflow || baseWorkflow);
    const dispatchSpy = vi.spyOn($store, "dispatch");

    const wrapper = mount(WorkflowMetadata, {
      global: {
        plugins: [$store],
        stubs: { RichTextEditor: true },
      },
    });

    return { wrapper, $store, dispatchSpy };
  };

  describe("project", () => {
    it("renders placeholders", () => {
      const { wrapper } = doMount();

      // show placeholder parents
      expect(wrapper.find(".last-updated").exists()).toBe(true);
      expect(wrapper.find(".tags").exists()).toBe(true);
      expect(wrapper.findComponent(ExternalResourcesList).exists()).toBe(true);

      // show placeholder tags
      expect(wrapper.text()).toMatch("Last update: no update yet");
      expect(wrapper.text()).toMatch("No description has been set yet");
      expect(wrapper.text()).toMatch("No tags have been set yet");

      // don't show content containers
      expect(wrapper.findComponent(LinkList).exists()).toBe(false);
      expect(wrapper.findComponent(TagList).exists()).toBe(false);
      expect(wrapper.findComponent(NodeFeatureList).exists()).toBe(false);
      expect(wrapper.findComponent(NodePreview).exists()).toBe(false);
    });

    it("renders all metadata", () => {
      const workflow = createWorkflow({
        info: { containerType: WorkflowInfo.ContainerTypeEnum.Project },
        projectMetadata: {
          lastEdit: "2000-01-01T00:00Z",
          description: {
            value: "Description",
            contentType: TypedText.ContentTypeEnum.Plain,
          },
          links: [{ text: "link1" }],
          tags: ["tag1"],
        },
      });
      const { wrapper } = doMount({ workflow });

      expect(wrapper.text()).toMatch("Last update: Jan 1, 2000");

      const description = wrapper.findComponent(MetadataDescription);
      expect(description.props("modelValue")).toMatch("Description");

      const linkList = wrapper.findComponent(LinkList);
      expect(linkList.props().links).toStrictEqual([{ text: "link1" }]);

      expect(wrapper.findComponent(TagList).exists()).toBe(true);
      const tags = wrapper.findAllComponents(Tag);
      expect(tags.length).toBe(1);
      expect(tags.at(0)!.text()).toBe("tag1");
    });
  });

  describe("component", () => {
    it("displays component metadata", async () => {
      const { wrapper, $store } = doMount();

      const workflow = createWorkflow({
        info: {
          containerType: WorkflowInfo.ContainerTypeEnum.Component,
        },
        // @ts-ignore
        projectMetadata: null,
        componentMetadata: {
          name: "name",
          // @ts-ignore
          inPorts: [{ typeId: "org.knime.core.node.BufferedDataTable" }],
          outPorts: [{ typeId: "org.knime.core.node.BufferedDataTable" }],
          description: { value: "Description" },
          type: ComponentNodeAndDescription.TypeEnum.Source,
          views: [{ name: "view", description: "description" }],
          options: [],
        },
      });

      $store.commit("workflow/setActiveWorkflow", workflow);
      await nextTick();

      expect(wrapper.findComponent(NodePreview).exists()).toBe(true);

      const description = wrapper.findComponent(MetadataDescription);
      expect(description.props("modelValue")).toMatch("Description");

      expect(
        wrapper.findComponent(ComponentMetadataNodeFeatures).exists(),
      ).toBe(true);
    });

    it("maps the port color and type to display them properly", async () => {
      const { wrapper, $store } = doMount();

      const workflow = createWorkflow({
        info: {
          containerType: WorkflowInfo.ContainerTypeEnum.Component,
        },
        // @ts-ignore
        projectMetadata: null,
        componentMetadata: {
          name: "name",
          // @ts-ignore
          inPorts: [{ typeId: "org.knime.core.node.BufferedDataTable" }],
          outPorts: [
            {
              typeId:
                "org.knime.core.node.port.flowvariable.FlowVariablePortObject",
            },
          ],
          description: {
            value: "Description",
            contentType: TypedText.ContentTypeEnum.Plain,
          },
          type: ComponentNodeAndDescription.TypeEnum.Source,
          views: [{ name: "view", description: "description" }],
          options: [],
        },
      });

      $store.commit("workflow/setActiveWorkflow", workflow);
      await nextTick();

      const nodeFeatures = wrapper
        .findComponent(ComponentMetadataNodeFeatures)
        .props("nodeFeatures");

      expect(nodeFeatures.inPorts).toEqual([
        {
          kind: "table",
          name: "Table",
          color: "#000000",
          views: {
            descriptors: expect.any(Array),
            descriptorMapping: expect.any(Object),
          },
          description: "No description available",
          typeId: "org.knime.core.node.BufferedDataTable",
          type: "table",
        },
      ]);

      expect(nodeFeatures.outPorts).toEqual([
        {
          kind: "flowVariable",
          name: "Flow Variable",
          color: "#FF4B4B",
          views: {
            descriptors: expect.any(Array),
            descriptorMapping: expect.any(Object),
          },
          description: "No description available",
          typeId:
            "org.knime.core.node.port.flowvariable.FlowVariablePortObject",
          type: "flowVariable",
        },
      ]);
    });

    it("saves changes for component", async () => {
      const { wrapper, $store, dispatchSpy } = doMount();

      const workflow = createWorkflow({
        info: {
          containerType: WorkflowInfo.ContainerTypeEnum.Component,
        },
        // @ts-ignore
        projectMetadata: null,
        componentMetadata: {
          name: "name",
          // @ts-ignore
          inPorts: [{ typeId: "org.knime.core.node.BufferedDataTable" }],
          outPorts: [
            {
              typeId:
                "org.knime.core.node.port.flowvariable.FlowVariablePortObject",
            },
          ],
          description: {
            value: "Description",
            contentType: TypedText.ContentTypeEnum.Plain,
          },
          type: ComponentNodeAndDescription.TypeEnum.Source,
          views: [{ name: "view", description: "description" }],
          options: [],
        },
      });
      const savedComponent = {
        projectId: "id1",
        workflowId: "workflowId",
        links: [],
        tags: [],
        description: {
          value: "This is a description",
          contentType: "",
        },
        inPorts: [],
        outPorts: [],
        icon: null,
        type: "",
      };

      $store.commit("workflow/setActiveWorkflow", workflow);
      await nextTick();

      wrapper.findComponent(ComponentMetadata).vm.$emit("save", savedComponent);

      expect(wrapper.findComponent(ComponentMetadata).exists()).toBe(true);
      expect(dispatchSpy).toHaveBeenCalledWith(
        "workflow/updateComponentMetadata",
        savedComponent,
      );
    });
  });

  it("saves changes for project metadata", async () => {
    const { wrapper, $store, dispatchSpy } = doMount();

    const workflow = createWorkflow({
      info: { containerType: WorkflowInfo.ContainerTypeEnum.Project },
      projectMetadata: {
        lastEdit: "2000-01-01T00:00Z",
        description: {
          value: "Description",
          contentType: TypedText.ContentTypeEnum.Plain,
        },
        links: [{ text: "link1" }],
        tags: ["tag1"],
      },
    });
    const savedProject = {
      description: "This is a description",
      links: [],
      tags: [],
      projectId: "id1",
      workflowId: "workflow1",
    };

    $store.commit("workflow/setActiveWorkflow", workflow);
    await nextTick();

    wrapper.findComponent(ProjectMetadata).vm.$emit("save", savedProject);

    expect(wrapper.findComponent(ProjectMetadata).exists()).toBe(true);
    expect(dispatchSpy).toHaveBeenCalledWith(
      "workflow/updateWorkflowMetadata",
      savedProject,
    );
  });

  it("should display metadata for Components opened as a project", async () => {
    const { wrapper, $store } = doMount();

    const workflow = createWorkflow({
      info: {
        containerType: WorkflowInfo.ContainerTypeEnum.Project,
      },
      // @ts-ignore
      projectMetadata: null,
      componentMetadata: {
        name: "name",
        // @ts-ignore
        inPorts: [{ typeId: "org.knime.core.node.BufferedDataTable" }],
        outPorts: [
          {
            typeId:
              "org.knime.core.node.port.flowvariable.FlowVariablePortObject",
          },
        ],
        description: {
          value: "Description",
          contentType: TypedText.ContentTypeEnum.Plain,
        },
        type: ComponentNodeAndDescription.TypeEnum.Source,
        views: [{ name: "view", description: "description" }],
        options: [],
      },
    });

    $store.commit("workflow/setActiveWorkflow", workflow);
    await nextTick();

    expect(wrapper.findComponent(ProjectMetadata).exists()).toBe(false);
    expect(wrapper.findComponent(ComponentMetadata).exists()).toBe(true);
  });

  it("should not display metadata for metanodes", async () => {
    const { wrapper, $store } = doMount();

    const workflow = createWorkflow({
      info: {
        containerType: WorkflowInfo.ContainerTypeEnum.Metanode,
      },
    });

    $store.commit("workflow/setActiveWorkflow", workflow);
    await nextTick();

    expect(wrapper.findComponent(ProjectMetadata).exists()).toBe(false);
    expect(wrapper.findComponent(ComponentMetadata).exists()).toBe(false);
  });
});
