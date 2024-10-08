import { expect, describe, it, vi, type Mock } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

import { mockVuexStore } from "@/test/utils";
import CategoryTree from "../CategoryTree.vue";
import type { NodeCategory } from "@/api/gateway-api/generated-api";
import { Tree } from "@knime/virtual-tree";
import { useAddNodeToWorkflow } from "../useAddNodeToWorkflow";

vi.mock("@/components/nodeRepository/useAddNodeToWorkflow", () => {
  return { useAddNodeToWorkflow: vi.fn(vi.fn) };
});

describe("CategoryTree", () => {
  const rootNodes: NodeCategory = {
    childCategories: [
      {
        displayName: "mockCategory1",
        path: ["child", "category", "1", "path"],
      },
      {
        displayName: "mockCategory2",
        path: ["child", "category", "2", "another", "path"],
      },
    ],
  };
  const doMount = () => {
    const getNodeCategoryMock = vi
      .fn()
      .mockImplementation((_, { categoryPath }) =>
        categoryPath.length === 0 ? rootNodes : {},
      );

    const $store = mockVuexStore({
      nodeRepository: {
        state: {
          treeCache: new Map(),
          treeExpandedKeys: [],
        },
        actions: {
          getNodeCategory: getNodeCategoryMock,
        },
        mutations: {},
      },
      application: {
        state: {
          hasNodeCollectionActive: false,
        },
      },
    });

    const wrapper = mount(CategoryTree, {
      global: { plugins: [$store] },
    });

    return { wrapper, $store, getNodeCategoryMock };
  };

  it("loads root tree level", async () => {
    const { wrapper, getNodeCategoryMock } = doMount();
    expect(getNodeCategoryMock).toHaveBeenCalledWith(expect.anything(), {
      categoryPath: [],
    });
    await flushPromises();
    const treeNodes = wrapper.findAllComponents({ name: "TreeNode" });
    expect(treeNodes.length).toBe(rootNodes.childCategories!.length);

    for (let i = 0; i < rootNodes.childCategories!.length; i++) {
      expect(treeNodes.at(i)?.props("node").name).toBe(
        rootNodes.childCategories![i].displayName,
      );
    }
  });

  it("keyboard node actions", () => {
    const addNodeToWorkflowMock = vi.fn();
    const useAddNodeToWorkflowMock = useAddNodeToWorkflow as Mock;
    useAddNodeToWorkflowMock.mockImplementationOnce(
      () => addNodeToWorkflowMock,
    );

    const { wrapper } = doMount();
    const tree = wrapper.getComponent(Tree);

    const nodeEnterEvent = {
      event: { key: "Enter" },
      node: {
        origin: { nodeTemplate: { nodeFactory: "mockNodeTemplateFactory1" } },
      },
    };
    tree.vm.$emit("keydown", nodeEnterEvent);
    expect(addNodeToWorkflowMock).toHaveBeenLastCalledWith({
      nodeFactory: nodeEnterEvent.node.origin.nodeTemplate.nodeFactory,
    });

    const nodeInfoEvent = {
      event: { key: "i" },
      node: {
        origin: { nodeTemplate: { id: "mockNodeTemplateId1" } },
      },
    };
    tree.vm.$emit("keydown", nodeInfoEvent);
    expect(wrapper.emitted().showNodeDescription[0]).toStrictEqual([
      expect.objectContaining({
        nodeTemplate: nodeInfoEvent.node.origin.nodeTemplate,
      }),
    ]);
  });
});
