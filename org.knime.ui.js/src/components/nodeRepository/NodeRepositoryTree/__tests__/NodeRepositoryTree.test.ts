import { describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

import { Tree } from "@knime/virtual-tree";

import { mockStores } from "@/test/utils/mockStores";
import NodeRepositoryTree from "../NodeRepositoryTree.vue";
import type { NodeCategoryWithExtendedPorts } from "../types";

const { addNodeWithAutoPositioningMock } = vi.hoisted(() => ({
  addNodeWithAutoPositioningMock: vi.fn(),
}));

vi.mock("@/composables/useAddNodeToWorkflow", () => {
  return {
    useAddNodeToWorkflow: () => ({
      addNodeWithAutoPositioning: addNodeWithAutoPositioningMock,
      addNodeByPosition: vi.fn(),
    }),
  };
});

describe("NodeRepositoryTree", () => {
  const rootTreeResponse: NodeCategoryWithExtendedPorts = {
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
    nodeCategoryCache = new Map<string, NodeCategoryWithExtendedPorts>(),
    treeExpandedKeys: string[] = [],
  ) => {
    const { nodeRepositoryStore, testingPinia, applicationSettingsStore } =
      mockStores();

    applicationSettingsStore.hasNodeCollectionActive = false;

    // we can't just override the state as that breaks things,
    // but we use params to have it ready before mount for hooks like onMounted
    [...nodeCategoryCache.keys()].forEach((categoryPath) => {
      nodeRepositoryStore.updateNodeCategoryCache({
        categoryPath: categoryPath.split("/"),
        nodeCategory: nodeCategoryCache.get(categoryPath)!,
      });
    });

    treeExpandedKeys.forEach((key) =>
      nodeRepositoryStore.addTreeExpandedKey(key),
    );

    const getNodeCategoryMock = vi.mocked(nodeRepositoryStore.getNodeCategory);
    getNodeCategoryMock.mockImplementation(({ categoryPath }) =>
      Promise.resolve(categoryPath.length === 0 ? rootTreeResponse : {}),
    );

    const wrapper = mount(NodeRepositoryTree, {
      global: { plugins: [testingPinia] },
    });

    return { wrapper, getNodeCategoryMock };
  };

  it("loads root tree level", async () => {
    const { wrapper, getNodeCategoryMock } = doMount();
    expect(getNodeCategoryMock).toHaveBeenCalledWith({
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
        // @ts-expect-error
        { id: "c11", name: "a node" },
        // @ts-expect-error
        { id: "c21", name: "another node" },
      ],
    });

    nodeCategoryCache.set("child2", {
      metadata: {
        displayName: "child 2",
        path: ["child2"],
      },
      // @ts-expect-error
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
    const { wrapper } = doMount();
    const tree = wrapper.getComponent(Tree);

    const nodeEnterEvent = {
      event: { key: "Enter" },
      node: {
        origin: { nodeTemplate: { nodeFactory: "mockNodeTemplateFactory1" } },
      },
    };
    tree.vm.$emit("keydown", nodeEnterEvent);
    expect(addNodeWithAutoPositioningMock).toHaveBeenLastCalledWith(
      nodeEnterEvent.node.origin.nodeTemplate.nodeFactory,
    );

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
