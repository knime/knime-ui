import { mount } from "@vue/test-utils";
import { expect, describe, it } from "vitest";
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
} from "@/api/gateway-api/generated-api";
import * as workflowStore from "@/store/workflow";
import ExternalResourcesList from "@/components/common/ExternalResourcesList.vue";

import WorkflowMetadata from "../WorkflowMetadata.vue";
import ProjectMetadata from "../ProjectMetadata.vue";
import ComponentMetadata from "../ComponentMetadata.vue";
import MetadataDescription from "../MetadataDescription.vue";
import ComponentMetadataNodeFeatures from "../ComponentMetadataNodeFeatures.vue";

describe("WorkflowMetadata.vue", () => {
  const doMount = () => {
    const availablePortTypes = createAvailablePortTypes();
    const $store = mockVuexStore({
      workflow: workflowStore,

      application: {
        state: {
          availablePortTypes,
        },
      },
    });

    const workflow = createWorkflow({
      info: {
        name: "filename",
        containerType: WorkflowInfo.ContainerTypeEnum.Project,
      },
      projectMetadata: {
        lastEdit: "",
      },
    });

    $store.commit("workflow/setActiveWorkflow", workflow);

    const wrapper = mount(WorkflowMetadata, {
      global: {
        plugins: [$store],
      },
    });

    return { wrapper, $store };
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

    it("renders all metadata", async () => {
      const { wrapper, $store } = doMount();

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

      $store.commit("workflow/setActiveWorkflow", workflow);

      await nextTick();

      expect(wrapper.text()).toMatch("Last update: Jan 1, 2000");

      const description = wrapper.findComponent(MetadataDescription);
      expect(description.props("description")).toMatch("Description");

      const linkList = wrapper.findComponent(LinkList);
      expect(linkList.props().links).toStrictEqual([{ text: "link1" }]);

      expect(wrapper.findComponent(TagList).exists()).toBe(true);
      const tags = wrapper.findAllComponents(Tag);
      expect(tags.length).toBe(1);
      expect(tags.at(0).text()).toBe("tag1");
    });
  });

  describe("component", () => {
    it("displays component metadata", async () => {
      const { wrapper, $store } = doMount();

      const workflow = createWorkflow({
        info: {
          containerType: WorkflowInfo.ContainerTypeEnum.Component,
        },
        componentMetadata: {
          name: "name",
          // @ts-ignore
          inPorts: [{ typeId: "org.knime.core.node.BufferedDataTable" }],
          outPorts: [{ typeId: "org.knime.core.node.BufferedDataTable" }],
          description: "Description",
          type: ComponentNodeAndDescription.TypeEnum.Source,
          views: [{ name: "view", description: "description" }],
          options: ["options"],
        },
      });

      $store.commit("workflow/setActiveWorkflow", workflow);
      await nextTick();

      expect(wrapper.findComponent(NodePreview).exists()).toBe(true);

      expect(wrapper.findComponent(MetadataDescription).text()).toMatch(
        "Description"
      );

      expect(
        wrapper.findComponent(ComponentMetadataNodeFeatures).exists()
      ).toBe(true);
    });

    it("maps the port color and type to display them properly", async () => {
      const { wrapper, $store } = doMount();

      const workflow = createWorkflow({
        info: {
          containerType: WorkflowInfo.ContainerTypeEnum.Component,
        },
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
          description: "Description",
          type: ComponentNodeAndDescription.TypeEnum.Source,
          views: [{ name: "view", description: "description" }],
          options: ["options"],
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
