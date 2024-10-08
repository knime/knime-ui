import { type Mock, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

import { Tree } from "@knime/virtual-tree";

import type { NodeCategoryWithExtendedPorts } from "@/api/custom-types";
import type { NodeCategory } from "@/api/gateway-api/generated-api";
import { mockVuexStore } from "@/test/utils";
import CategoryTree from "../CategoryTree.vue";
import { useAddNodeToWorkflow } from "../useAddNodeToWorkflow";

vi.mock("@/components/nodeRepository/useAddNodeToWorkflow", () => {
  return { useAddNodeToWorkflow: vi.fn(vi.fn) };
});

describe("CategoryTree", () => {
  const rootTreeResponse: NodeCategory = {
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
  const doMount = (
    nodeCategoryCache = new Map<string, any>(),
    treeExpandedKeys: string[] = [],
  ) => {
    const getNodeCategoryMock = vi
      .fn()
      .mockImplementation((_, { categoryPath }) =>
        categoryPath.length === 0 ? rootTreeResponse : {},
      );

    const $store = mockVuexStore({
      nodeRepository: {
        state: {
          nodeCategoryCache,
          treeExpandedKeys,
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
    expect(treeNodes.length).toBe(rootTreeResponse.childCategories!.length);

    for (let i = 0; i < rootTreeResponse.childCategories!.length; i++) {
      expect(treeNodes.at(i)?.props("node").name).toBe(
        rootTreeResponse.childCategories![i].displayName,
      );
    }
  });

  it("uses cache on mount if it has data", async () => {
    const nodeCategoryCache = new Map<string, NodeCategoryWithExtendedPorts>();
    const treeExpandedKeys = ["child2"];

    const childCategories = [
      {
        displayName: "child 1",
        path: ["child1"],
      },
      {
        displayName: "child 2",
        path: ["child2"],
      },
      {
        displayName: "child 3",
        path: ["child3"],
      },
    ];

    nodeCategoryCache.set("", {
      childCategories,
    });

    nodeCategoryCache.set("child1", {
      metadata: {
        displayName: "child 1",
        path: ["child1"],
      },
      nodes: [
        // @ts-ignore
        { id: "c11", name: "a node" },
        // @ts-ignore
        { id: "c21", name: "another node" },
      ],
    });

    nodeCategoryCache.set("child2", {
      metadata: {
        displayName: "child 2",
        path: ["child2"],
      },
      // @ts-ignore
      nodes: [{ id: "c21", name: "visible node" }],
    });

    const { wrapper, getNodeCategoryMock } = doMount(
      nodeCategoryCache,
      treeExpandedKeys,
    );
    expect(getNodeCategoryMock).toHaveBeenCalledTimes(0);
    await flushPromises();

    const treeNodes = wrapper.findAllComponents({ name: "TreeNode" });
    expect(treeNodes.length).toBe(4); // 3 root categories + one is open with a single node

    expect(treeNodes.at(0)?.props("node").name).toBe("child 1");
    expect(treeNodes.at(1)?.props("node").name).toBe("child 2");
    expect(treeNodes.at(2)?.props("node").name).toBe("visible node");
    expect(treeNodes.at(3)?.props("node").name).toBe("child 3");
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
