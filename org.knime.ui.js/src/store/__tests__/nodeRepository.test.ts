import { afterEach, describe, expect, it, vi } from "vitest";
import { API } from "@api";
import { createTestingPinia } from "@pinia/testing";

import { useNodeRepositoryStore } from "@/store/nodeRepository";
import { createSearchNodesResponse } from "@/test/factories";
import { deepMocked, withPorts } from "@/test/utils";
import { useApplicationStore } from "../application/application";
import {
  type NodeRepositoryDisplayModesType,
  useSettingsStore,
} from "../settings";

const getNodesGroupedByTagsResponse = {
  groups: [
    {
      nodes: [
        {
          component: false,
          icon: "data:image/png;base64,xxx",
          name: "GroupBy Bar Chart (JFreeChart)",
          id: "org.knime.ext.jfc.node.groupbarchart.JfcGroupBarChartNodeFactory",
          type: "Visualizer",
          inPorts: [{ typeId: "org.knime.core.node.BufferedDataTable" }],
          outPorts: [{ typeId: "org.knime.core.node.BufferedDataTable" }],
        },
        {
          component: false,
          icon: "data:image/png;base64,xxx",
          name: "Decision Tree Learner",
          id: "org.knime.base.node.mine.decisiontree2.learner2.DecisionTreeLearnerNodeFactory3",
          type: "Learner",
          inPorts: [{ typeId: "org.knime.core.node.BufferedDataTable" }],
          outPorts: [
            { typeId: "org.knime.core.node.BufferedDataTable" },
            { typeId: "org.knime.core.node.BufferedDataTable" },
            { typeId: "org.some.otherPorType" },
          ],
        },
      ],
      tag: "Analytics",
    },
  ],
};

const getNodeCategoryResponse = {
  metadata: {
    displayName: "a node category",
    path: ["cat"],
  },
  childCategories: [
    {
      displayName: "child 1",
      path: ["child1"],
    },
    {
      displayName: "child 2",
      path: ["child2"],
    },
  ],
  nodes: getNodesGroupedByTagsResponse.groups[0].nodes,
};

const getNodeDescriptionResponse = {
  id: 1,
  description: "This is a node.",
  inPorts: [{ typeId: "org.knime.core.node.BufferedDataTable" }],
  outPorts: [],
  dynamicInPortGroupDescriptions: [
    {
      identifier: "inGroupName",
      supportedPortTypes: [{ typeId: "org.knime.core.node.BufferedDataTable" }],
    },
  ],
  dynamicOutPortGroupDescriptions: [
    {
      identifier: "outGroupName",
      description: "This is the description",
      supportedPortTypes: [{ typeId: "org.knime.core.node.BufferedDataTable" }],
    },
  ],
};

const mockedAPI = deepMocked(API);

describe("Node Repository store", () => {
  const createStore = (
    nodeRepositoryDisplayMode: NodeRepositoryDisplayModesType = "icon",
  ) => {
    const availablePortTypes = {
      "org.knime.core.node.BufferedDataTable": {
        kind: "table",
        color: "green",
      },
      "org.some.otherPorType": {
        kind: "other",
        color: "blue",
      },
      "org.knime.ext.h2o.ports.H2OFramePortObject": {
        kind: "other",
        color: "red",
      },
    };

    mockedAPI.noderepository.searchNodes.mockResolvedValue(
      createSearchNodesResponse(),
    );
    mockedAPI.noderepository.getNodesGroupedByTags.mockResolvedValue(
      getNodesGroupedByTagsResponse,
    );
    mockedAPI.node.getNodeDescription.mockResolvedValue(
      getNodeDescriptionResponse,
    );

    mockedAPI.noderepository.getNodeCategory.mockResolvedValue(
      getNodeCategoryResponse,
    );

    const testingPinia = createTestingPinia({
      stubActions: false,
      createSpy: vi.fn,
    });

    // setup stores

    // @ts-expect-error
    useApplicationStore(testingPinia).setAvailablePortTypes(availablePortTypes);
    useSettingsStore(testingPinia).settings.nodeRepositoryDisplayMode =
      nodeRepositoryDisplayMode;

    const nodeRepository = useNodeRepositoryStore(testingPinia);

    return {
      availablePortTypes,
      nodeRepository,
    };
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getters", () => {
    it("returns proper value for nodesPerTagContainSelectedNode", () => {
      const nodeId = "1";
      const { nodeRepository } = createStore();
      expect(nodeRepository.nodesPerTagContainNodeId(nodeId)).toBe(false);
      nodeRepository.nodesPerTag = [
        // @ts-expect-error
        { tag: "tag:1", nodes: [{ id: "1" }, { id: "2" }] },
      ];
      expect(nodeRepository.nodesPerTagContainNodeId("3")).toBe(false);
      expect(nodeRepository.nodesPerTagContainNodeId(nodeId)).toBe(true);
    });

    it("returns proper value for isSelectedNodeVisible for searches", () => {
      const { nodeRepository } = createStore();
      // @ts-expect-error
      nodeRepository.nodes = [{ id: "1", name: "Node" }];
      nodeRepository.query = "value";
      expect(nodeRepository.isNodeVisible("3")).toBe(false);
      expect(nodeRepository.isNodeVisible("1")).toBe(true);
    });

    it("returns proper value for isSelectedNodeVisible for the tree", () => {
      const { nodeRepository } = createStore("tree");

      nodeRepository.nodeCategoryCache.set("something", {
        // @ts-expect-error
        nodes: [{ id: "node1", name: "Node" }],
      });
      nodeRepository.nodeCategoryCache.set("other", {
        // @ts-expect-error
        nodes: [{ id: "node3", name: "Node" }],
      });
      nodeRepository.treeExpandedKeys.add("something");

      expect(nodeRepository.isNodeVisible("node3")).toBe(false);
      expect(nodeRepository.isNodeVisible("node1")).toBe(true);
    });

    it("returns proper value for isSelectedNodeVisible for tags", () => {
      const { nodeRepository } = createStore();
      expect(nodeRepository.isNodeVisible("0")).toBe(false);
      nodeRepository.nodesPerTag = [
        // @ts-expect-error
        { tag: "tag:1", nodes: [{ id: "1" }, { id: "2" }] },
      ];
      expect(nodeRepository.isNodeVisible("2")).toBe(true);
    });
  });

  describe("mutations", () => {
    it("sets tagPage", () => {
      const { nodeRepository } = createStore();
      nodeRepository.setTagPage(1);
      expect(nodeRepository.tagPage).toBe(1);
    });

    it("sets nodesPerTag", () => {
      const { nodeRepository } = createStore();
      const tags = [{ tag: "MyTag1", nodes: [{ id: "node1" }] }];
      nodeRepository.setNodesPerTags({
        // @ts-expect-error
        groupedNodes: [{ tag: "MyTag1", nodes: [{ id: "node1" }] }],
      });
      expect(nodeRepository.nodesPerTag).toStrictEqual(tags);
    });

    it("adds nodesPerTag", () => {
      const { nodeRepository } = createStore();
      nodeRepository.setNodesPerTags({
        groupedNodes: [{ tag: "MyTag1", nodes: [{ id: "node1" }] }],
      });
      const tags = nodeRepository.nodesPerTag;
      const tag = { tag: "MyTag2", nodes: [{ id: "node2" }] };
      nodeRepository.setNodesPerTags({
        groupedNodes: [tag],
        append: true,
      });
      tags.push(tag);

      expect(nodeRepository.nodesPerTag).toStrictEqual(tags);
    });

    it("sets totalNumTags", () => {
      const { nodeRepository } = createStore();
      nodeRepository.setTotalNumTags(2);
      expect(nodeRepository.totalNumTags).toBe(2);
    });

    it("sets tag scroll position", () => {
      const { nodeRepository } = createStore();
      nodeRepository.setTagScrollPosition(22);
      expect(nodeRepository.tagScrollPosition).toBe(22);
    });

    it("sets selected node", () => {
      const { nodeRepository } = createStore();
      const node = { id: "node1" };
      // @ts-expect-error
      nodeRepository.setSelectedNode({ id: "node1" });
      expect(nodeRepository.selectedNode).toEqual(node);
    });
  });

  describe("actions", () => {
    describe("getAllNodes", () => {
      it("gets all nodes", async () => {
        const { nodeRepository, availablePortTypes } = createStore();

        await nodeRepository.getAllNodes({ append: true });
        expect(nodeRepository.tagPage).toBe(1);

        expect(
          mockedAPI.noderepository.getNodesGroupedByTags,
        ).toHaveBeenCalledWith({
          numNodesPerTag: 8,
          tagsOffset: 6,
          tagsLimit: 3,
          fullTemplateInfo: true,
        });

        const { nodes, tag } = getNodesGroupedByTagsResponse.groups[0];

        // make sure the port information is mapped in to every node
        const groupedNodesWithPorts = withPorts(nodes, availablePortTypes);

        expect(nodeRepository.nodesPerTag).toEqual([
          {
            nodes: groupedNodesWithPorts,
            tag,
          },
        ]);
      });

      it("gets all nodes without append and with a bigger tagsLimits", async () => {
        const { nodeRepository } = createStore();

        await nodeRepository.getAllNodes({ append: false });

        expect(nodeRepository.tagPage).toBe(0);
        expect(nodeRepository.nodeSearchPage).toBe(0);
        expect(
          mockedAPI.noderepository.getNodesGroupedByTags,
        ).toHaveBeenCalledWith({
          numNodesPerTag: 8,
          tagsOffset: 0,
          tagsLimit: 6,
          fullTemplateInfo: true,
        });
      });

      it("skips getting nodes when all tags were loaded", async () => {
        const { nodeRepository } = createStore();
        const tags = [{}, {}, {}];
        nodeRepository.setNodesPerTags({
          groupedNodes: tags,
        });
        nodeRepository.setTotalNumTags(tags.length);

        await nodeRepository.getAllNodes({ append: true });
        expect(API.noderepository.getNodesGroupedByTags).not.toHaveBeenCalled();
      });
    });

    describe("getNodeCategory", () => {
      it("gets a node category", async () => {
        const { nodeRepository, availablePortTypes } = createStore();

        await nodeRepository.getNodeCategory({ categoryPath: ["cat"] });

        expect(mockedAPI.noderepository.getNodeCategory).toHaveBeenCalledWith({
          categoryPath: ["cat"],
        });

        // make sure the port information is mapped in to every node
        const groupedNodesWithPorts = withPorts(
          getNodeCategoryResponse.nodes,
          availablePortTypes,
        );

        expect(nodeRepository.nodeCategoryCache.get("cat")).toEqual({
          ...getNodeCategoryResponse,
          nodes: groupedNodesWithPorts,
        });
      });
    });

    describe("reset", () => {
      it("resets search results", async () => {
        const { nodeRepository } = createStore();
        nodeRepository.query = "foo";
        nodeRepository.nodes = [{ dummy: true }];

        await nodeRepository.resetSearchAndTags();

        // it searches again
        expect(mockedAPI.noderepository.searchNodes).toHaveBeenCalled();
        expect(nodeRepository.nodes?.length).toBe(2);
      });

      it("resets tag results", async () => {
        const { nodeRepository } = createStore();

        await nodeRepository.resetSearchAndTags();

        // fetches the nodes per tag
        expect(nodeRepository.nodesPerTag.length).toBe(1);
        expect(
          mockedAPI.noderepository.getNodesGroupedByTags,
        ).toHaveBeenCalled();
      });

      it("clears tag results", () => {
        const { nodeRepository } = createStore();
        nodeRepository.nodesPerTag = [{ dummy: true }];
        nodeRepository.totalNumTags = 100;
        nodeRepository.tagPage = 5;
        nodeRepository.tagScrollPosition = 10;
        nodeRepository.clearTagResults();
        expect(nodeRepository.nodesPerTag).toEqual([]);
        expect(nodeRepository.totalNumTags).toBeNull();
        expect(nodeRepository.tagPage).toBe(0);
        expect(nodeRepository.tagScrollPosition).toBe(0);
      });
    });
  });
});
