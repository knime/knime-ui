import { describe, expect, it } from "vitest";
import { shallowMount } from "@vue/test-utils";

import type { NativeNode } from "@/api/gateway-api/generated-api";
import NodeDescription from "@/components/nodeDescription/NodeDescription.vue";
import ContextAwareDescription from "@/components/sidebar/ContextAwareDescription.vue";
import WorkflowMetadata from "@/components/workflowMetadata/WorkflowMetadata.vue";
import { mockStores } from "@/test/utils/mockStores";

describe("ContextAwareDescription.vue", () => {
  const doMount = ({ selectedNode }: { selectedNode?: NativeNode } = {}) => {
    const { testingPinia, panelStore, selectionStore, nodeInteractionsStore } =
      mockStores();

    if (selectedNode) {
      // @ts-expect-error
      selectionStore.singleSelectedNode = selectedNode;
    }

    // @ts-expect-error
    panelStore.isTabActive = () => true;

    // @ts-expect-error
    nodeInteractionsStore.getNodeName = (nodeId: string) =>
      `Node with id ${nodeId}`;
    // @ts-expect-error
    nodeInteractionsStore.getNodeFactory = () => ({
      className: "someClassName",
    });

    const wrapper = shallowMount(ContextAwareDescription, {
      global: { plugins: [testingPinia] },
    });

    return {
      wrapper,
    };
  };

  it("shows workflow description (metadata) by default", () => {
    const { wrapper } = doMount();
    expect(wrapper.findComponent(WorkflowMetadata).exists()).toBe(true);
    expect(wrapper.findComponent(NodeDescription).exists()).toBe(false);
  });

  it("shows node description if a single node is selected", () => {
    const { wrapper } = doMount({
      selectedNode: {
        id: "2",
        templateId: "org.mock.node",
        // @ts-ignore
        kind: "node",
      },
    });

    expect(wrapper.findComponent(WorkflowMetadata).exists()).toBe(false);
    expect(wrapper.findComponent(NodeDescription).exists()).toBe(true);
    expect(
      wrapper.findComponent(NodeDescription).props("params"),
    ).toMatchObject({
      id: "org.mock.node",
      name: "Node with id 2", // see getter
      nodeFactory: {
        className: "someClassName",
      },
    });
  });
});
