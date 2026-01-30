import { describe, expect, it } from "vitest";
import { shallowMount } from "@vue/test-utils";

import type { KnimeNode } from "@/api/custom-types";
import WorkflowMetadata from "@/components/workflowMetadata/WorkflowMetadata.vue";
import { createComponentNode, createNativeNode } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import ComponentInstanceDescription from "../ComponentInstanceDescription.vue";
import ContextAwareDescription from "../ContextAwareDescription.vue";
import NativeNodeDescription from "../NativeNodeDescription.vue";

describe("ContextAwareDescription.vue", () => {
  const doMount = ({ selectedNode }: { selectedNode?: KnimeNode } = {}) => {
    const { testingPinia, panelStore, selectionStore, nodeInteractionsStore } =
      mockStores();

    if (selectedNode) {
      // @ts-expect-error
      selectionStore.singleSelectedNode = selectedNode;
    }

    // @ts-expect-error
    panelStore.isTabActive = () => true;

    nodeInteractionsStore.getNodeName = (nodeId: string) =>
      `Node with id ${nodeId}`;
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
    expect(wrapper.findComponent(NativeNodeDescription).exists()).toBe(false);
    expect(wrapper.findComponent(ComponentInstanceDescription).exists()).toBe(
      false,
    );
  });

  it("shows node description if a single NATIVE node is selected", () => {
    const { wrapper } = doMount({
      selectedNode: createNativeNode({
        id: "2",
        templateId: "org.mock.node",
      }),
    });

    expect(wrapper.findComponent(WorkflowMetadata).exists()).toBe(false);
    expect(wrapper.findComponent(NativeNodeDescription).exists()).toBe(true);
    expect(wrapper.findComponent(ComponentInstanceDescription).exists()).toBe(
      false,
    );
  });

  it("shows node description if a single COMPONENT node is selected", () => {
    const { wrapper } = doMount({
      selectedNode: createComponentNode({
        id: "2",
      }),
    });

    expect(wrapper.findComponent(WorkflowMetadata).exists()).toBe(false);
    expect(wrapper.findComponent(NativeNodeDescription).exists()).toBe(false);
    expect(wrapper.findComponent(ComponentInstanceDescription).exists()).toBe(
      true,
    );
  });
});
