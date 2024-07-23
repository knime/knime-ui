import { expect, describe, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";

import { mockVuexStore } from "@/test/utils";
import ContextAwareDescription from "@/components/sidebar/ContextAwareDescription.vue";
import WorkflowMetadata from "@/components/workflowMetadata/WorkflowMetadata.vue";
import NodeDescription from "@/components/nodeRepository/NodeDescription.vue";

describe("ContextAwareDescription.vue", () => {
  const doMount = ({ singleSelectedNodeMock = vi.fn() } = {}) => {
    const $store = mockVuexStore({
      selection: {
        getters: {
          singleSelectedNode: singleSelectedNodeMock,
        },
      },
      workflow: {
        getters: {
          getNodeName() {
            return (nodeId) => `Node with id ${nodeId}`;
          },
          getNodeFactory() {
            return () => ({ className: "someClassName" });
          },
        },
      },
      panel: {
        getters: {
          isTabActive() {
            return () => true;
          },
        },
      },
    });

    const wrapper = shallowMount(ContextAwareDescription, {
      global: { plugins: [$store] },
    });

    return {
      wrapper,
      $store,
    };
  };

  it("shows workflow description (metadata) by default", () => {
    const { wrapper } = doMount();
    expect(wrapper.findComponent(WorkflowMetadata).exists()).toBe(true);
    expect(wrapper.findComponent(NodeDescription).exists()).toBe(false);
  });

  it("shows node description if a single node is selected", () => {
    const { wrapper } = doMount({
      singleSelectedNodeMock: vi.fn().mockReturnValue({
        id: 2,
        kind: "node",
      }),
    });
    expect(wrapper.findComponent(WorkflowMetadata).exists()).toBe(false);
    expect(wrapper.findComponent(NodeDescription).exists()).toBe(true);
    expect(
      wrapper.findComponent(NodeDescription).props("selectedNode"),
    ).toMatchObject({
      name: "Node with id 2", // see getter
      nodeFactory: {
        className: "someClassName",
      },
    });
  });
});
