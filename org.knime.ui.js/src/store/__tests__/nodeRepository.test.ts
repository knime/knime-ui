import { expect, describe, it, vi, afterEach } from "vitest";
/* eslint-disable max-lines */
import {
  deepMocked,
  lodashMockFactory,
  mockVuexStore,
  withPorts,
} from "@/test/utils";
import { API } from "@api";
import { createSearchNodesResponse } from "@/test/factories";
import type { NodeRepositoryDisplayModesType } from "../settings";
import type { NodeRepositoryState } from "@/store/nodeRepository";

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

vi.mock("lodash-es", async () => {
  const actual = await vi.importActual("lodash-es");

  return {
    ...actual,
    ...lodashMockFactory(),
  };
});

describe("Node Repository store", () => {
  const createStore = async (
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
    mockedAPI.noderepository.getNodesGroupedByTags.mockReturnValue(
      getNodesGroupedByTagsResponse,
    );
    mockedAPI.node.getNodeDescription.mockReturnValue(
      getNodeDescriptionResponse,
    );

    mockedAPI.noderepository.getNodeCategory.mockReturnValue(
      getNodeCategoryResponse,
    );

    const store = mockVuexStore({
      nodeRepository: await import("@/store/nodeRepository"),
      settings: {
        state: {
          settings: {
            nodeRepositoryDisplayMode,
          },
        },
      },
      application: {
        state: {
          availablePortTypes,
        },
      },
    });

    const dispatchSpy = vi.spyOn(store, "dispatch");

    return {
      dispatchSpy,
      availablePortTypes,
      store,
    };
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getters", () => {
    it("returns proper value for nodesPerTagContainSelectedNode", async () => {
      const nodeId = 1;
      const { store } = await createStore();
      expect(
        store.getters["nodeRepository/nodesPerTagContainNodeId"](nodeId),
      ).toBe(false);
      store.state.nodeRepository.nodesPerTag = [
        { tag: "tag:1", nodes: [{ id: 1 }, { id: 2 }] },
      ];
      expect(store.getters["nodeRepository/nodesPerTagContainNodeId"](3)).toBe(
        false,
      );
      expect(
        store.getters["nodeRepository/nodesPerTagContainNodeId"](nodeId),
      ).toBe(true);
    });

    it("returns proper value for isSelectedNodeVisible for searches", async () => {
      const { store } = await createStore();
      store.state.nodeRepository.nodes = [{ id: 1, name: "Node" }];
      store.state.nodeRepository.query = "value";
      expect(store.getters["nodeRepository/isNodeVisible"](3)).toBe(false);
      expect(store.getters["nodeRepository/isNodeVisible"](1)).toBe(true);
    });

    it("returns proper value for isSelectedNodeVisible for the tree", async () => {
      const { store } = await createStore("tree");
      const repoState = store.state.nodeRepository as NodeRepositoryState;
      repoState.nodeCategoryCache.set("something", {
        // @ts-ignore
        nodes: [{ id: "node1", name: "Node" }],
      });
      repoState.nodeCategoryCache.set("other", {
        // @ts-ignore
        nodes: [{ id: "node3", name: "Node" }],
      });
      repoState.treeExpandedKeys.add("something");
      store.state.nodeRepository.open = "value";

      expect(store.getters["nodeRepository/isNodeVisible"]("node3")).toBe(
        false,
      );
      expect(store.getters["nodeRepository/isNodeVisible"]("node1")).toBe(true);
    });

    it("returns proper value for isSelectedNodeVisible for tags", async () => {
      const { store } = await createStore();
      expect(store.getters["nodeRepository/isNodeVisible"](0)).toBe(false);
      store.state.nodeRepository.nodesPerTag = [
        { tag: "tag:1", nodes: [{ id: 1 }, { id: 2 }] },
      ];
      expect(store.getters["nodeRepository/isNodeVisible"](2)).toBe(true);
    });
  });

  describe("mutations", () => {
    it("sets tagPage", async () => {
      const { store } = await createStore();
      store.commit("nodeRepository/setTagPage", 1);
      expect(store.state.nodeRepository.tagPage).toBe(1);
    });

    it("sets nodesPerTag", async () => {
      const { store } = await createStore();
      const tags = [{ tag: "MyTag1", nodes: [{ id: "node1" }] }];
      store.commit("nodeRepository/setNodesPerTags", {
        groupedNodes: [{ tag: "MyTag1", nodes: [{ id: "node1" }] }],
      });
      expect(store.state.nodeRepository.nodesPerTag).toStrictEqual(tags);
    });

    it("adds nodesPerTag", async () => {
      const { store } = await createStore();
      store.commit("nodeRepository/setNodesPerTag", {
        groupedNodes: [{ tag: "MyTag1", nodes: [{ id: "node1" }] }],
      });
      const tags = store.state.nodeRepository.nodesPerTag;
      const tag = { tag: "MyTag2", nodes: [{ id: "node2" }] };
      store.commit("nodeRepository/setNodesPerTags", {
        groupedNodes: [tag],
        append: true,
      });
      tags.push(tag);

      expect(store.state.nodeRepository.nodesPerTag).toStrictEqual(tags);
    });

    it("sets totalNumTags", async () => {
      const { store } = await createStore();
      store.commit("nodeRepository/setTotalNumTags", 2);
      expect(store.state.nodeRepository.totalNumTags).toBe(2);
    });

    it("sets tag scroll position", async () => {
      const { store } = await createStore();
      store.commit("nodeRepository/setTagScrollPosition", 22);
      expect(store.state.nodeRepository.tagScrollPosition).toBe(22);
    });

    it("sets selected node", async () => {
      const { store } = await createStore();
      const node = { id: "node1" };
      store.commit("nodeRepository/setSelectedNode", { id: "node1" });
      expect(store.state.nodeRepository.selectedNode).toEqual(node);
    });
  });

  describe("actions", () => {
    describe("getAllNodes", () => {
      it("gets all nodes", async () => {
        const { store, availablePortTypes } = await createStore();

        await store.dispatch("nodeRepository/getAllNodes", { append: true });
        expect(store.state.nodeRepository.tagPage).toBe(1);

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

        expect(store.state.nodeRepository.nodesPerTag).toEqual([
          {
            nodes: groupedNodesWithPorts,
            tag,
          },
        ]);
      });

      it("gets all nodes without append and with a bigger tagsLimits", async () => {
        const { store } = await createStore();

        await store.dispatch("nodeRepository/getAllNodes", { append: false });

        expect(store.state.nodeRepository.tagPage).toBe(0);
        expect(store.state.nodeRepository.nodeSearchPage).toBe(0);
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
        const { store } = await createStore();
        const tags = [{}, {}, {}];
        store.commit("nodeRepository/setNodesPerTags", {
          groupedNodes: tags,
        });
        store.commit("nodeRepository/setTotalNumTags", tags.length);

        await store.dispatch("nodeRepository/getAllNodes", { append: true });
        expect(API.noderepository.getNodesGroupedByTags).not.toHaveBeenCalled();
      });
    });

    describe("getNodeCategory", () => {
      it("gets a node category", async () => {
        const { store, availablePortTypes } = await createStore();

        await store.dispatch("nodeRepository/getNodeCategory", {
          categoryPath: ["cat"],
        });

        expect(mockedAPI.noderepository.getNodeCategory).toHaveBeenCalledWith({
          categoryPath: ["cat"],
        });

        // make sure the port information is mapped in to every node
        const groupedNodesWithPorts = withPorts(
          getNodeCategoryResponse.nodes,
          availablePortTypes,
        );

        expect(store.state.nodeRepository.nodeCategoryCache.get("cat")).toEqual(
          {
            ...getNodeCategoryResponse,
            nodes: groupedNodesWithPorts,
          },
        );
      });
    });

    describe("reset", () => {
      it("resets search results", async () => {
        const { store, dispatchSpy } = await createStore();
        store.state.nodeRepository.query = "foo";
        store.state.nodeRepository.nodes = [{ dummy: true }];
        await store.dispatch("nodeRepository/resetSearchTagsAndTree");
        expect(dispatchSpy).toHaveBeenCalledWith(
          "nodeRepository/clearSearchResults",
          undefined,
        );
        expect(dispatchSpy).toHaveBeenCalledWith(
          "nodeRepository/searchNodesDebounced",
          undefined,
        );
        expect(dispatchSpy).toHaveBeenCalledWith(
          "nodeRepository/clearTagResults",
          undefined,
        );
        expect(dispatchSpy).toHaveBeenCalledWith("nodeRepository/getAllNodes", {
          append: false,
        });
      });

      it("resets tag results", async () => {
        const { store, dispatchSpy } = await createStore();
        await store.dispatch("nodeRepository/resetSearchTagsAndTree");
        expect(dispatchSpy).not.toHaveBeenCalledWith(
          "nodeRepository/clearSearchResults",
          undefined,
        );
        expect(dispatchSpy).not.toHaveBeenCalledWith(
          "nodeRepository/searchTopAndBottomNodes",
          undefined,
        );
        expect(dispatchSpy).toHaveBeenCalledWith(
          "nodeRepository/clearTagResults",
          undefined,
        );
        expect(dispatchSpy).toHaveBeenCalledWith("nodeRepository/getAllNodes", {
          append: false,
        });
      });

      it("clears tag results", async () => {
        const { store } = await createStore();
        store.state.nodeRepository.nodesPerTag = [{ dummy: true }];
        store.state.nodeRepository.totalNumTags = 100;
        store.state.nodeRepository.tagPage = 5;
        store.state.nodeRepository.tagScrollPosition = 10;
        await store.dispatch("nodeRepository/clearTagResults");
        expect(store.state.nodeRepository.nodesPerTag).toEqual([]);
        expect(store.state.nodeRepository.totalNumTags).toBeNull();
        expect(store.state.nodeRepository.tagPage).toBe(0);
        expect(store.state.nodeRepository.tagScrollPosition).toBe(0);
      });
    });
  });
});
