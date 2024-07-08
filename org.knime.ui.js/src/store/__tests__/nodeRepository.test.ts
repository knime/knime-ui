import { expect, describe, it, vi, afterEach } from "vitest";
/* eslint-disable max-lines */
import {
  deepMocked,
  lodashMockFactory,
  mockVuexStore,
  withPorts,
  withoutKeys,
} from "@/test/utils";
import { API } from "@api";
import { createSearchNodesResponse } from "@/test/factories";
import { state as nodeSearchState } from "../common/nodeSearch";

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

const getNodeTemplatesResponse = {
  "org.knime.ext.h2o.nodes.frametotable.H2OFrameToTableNodeFactory": {
    name: "H2O to Table",
    id: "org.knime.ext.h2o.nodes.frametotable.H2OFrameToTableNodeFactory",
    type: "Manipulator",
    component: false,
    icon: "data:image/png;base64,xxx",
    inPorts: [
      {
        optional: false,
        typeId: "org.knime.ext.h2o.ports.H2OFramePortObject",
      },
    ],
    outPorts: [
      {
        optional: false,
        typeId: "org.knime.core.node.BufferedDataTable",
      },
    ],
    nodeFactory: {
      className:
        "org.knime.ext.h2o.nodes.frametotable.H2OFrameToTableNodeFactory",
    },
  },
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
  const createStore = async () => {
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
    mockedAPI.noderepository.getNodeTemplates.mockReturnValue(
      getNodeTemplatesResponse,
    );

    const store = mockVuexStore({
      nodeRepository: await import("@/store/nodeRepository"),
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

  it("creates an empty store", async () => {
    const { store } = await createStore();
    const nodeSearchStateKeys = Object.keys(nodeSearchState());

    expect(
      withoutKeys(store.state.nodeRepository, nodeSearchStateKeys),
    ).toStrictEqual({
      nodesPerCategory: [],
      totalNumCategories: null,
      categoryPage: 0,
      categoryScrollPosition: 0,
      selectedNode: null,
      showDescriptionForNode: null,
    });
  });

  describe("getters", () => {
    it("returns proper value for nodesPerCategoryContainSelectedNode", async () => {
      const nodeId = 1;
      const { store } = await createStore();
      expect(
        store.getters["nodeRepository/nodesPerCategoryContainNodeId"](nodeId),
      ).toBe(false);
      store.state.nodeRepository.nodesPerCategory = [
        { tag: "tag:1", nodes: [{ id: 1 }, { id: 2 }] },
      ];
      expect(
        store.getters["nodeRepository/nodesPerCategoryContainNodeId"](3),
      ).toBe(false);
      expect(
        store.getters["nodeRepository/nodesPerCategoryContainNodeId"](nodeId),
      ).toBe(true);
    });

    it("returns proper value for isSelectedNodeVisible for searches", async () => {
      const { store } = await createStore();
      store.state.nodeRepository.nodes = [{ id: 1, name: "Node" }];
      store.state.nodeRepository.query = "value";
      expect(store.getters["nodeRepository/isNodeVisible"](3)).toBe(false);
      expect(store.getters["nodeRepository/isNodeVisible"](1)).toBe(true);
    });

    it("returns proper value for isSelectedNodeVisible for categories", async () => {
      const { store } = await createStore();
      expect(store.getters["nodeRepository/isNodeVisible"](0)).toBe(false);
      store.state.nodeRepository.nodesPerCategory = [
        { tag: "tag:1", nodes: [{ id: 1 }, { id: 2 }] },
      ];
      expect(store.getters["nodeRepository/isNodeVisible"](2)).toBe(true);
    });
  });

  describe("mutations", () => {
    it("sets categoryPage", async () => {
      const { store } = await createStore();
      store.commit("nodeRepository/setCategoryPage", 1);
      expect(store.state.nodeRepository.categoryPage).toBe(1);
    });

    it("sets nodesPerCategory", async () => {
      const { store } = await createStore();
      const categories = [{ tag: "MyTag1", nodes: [{ id: "node1" }] }];
      store.commit("nodeRepository/setNodesPerCategories", {
        groupedNodes: [{ tag: "MyTag1", nodes: [{ id: "node1" }] }],
      });
      expect(store.state.nodeRepository.nodesPerCategory).toStrictEqual(
        categories,
      );
    });

    it("adds nodesPerCategory", async () => {
      const { store } = await createStore();
      store.commit("nodeRepository/setNodesPerCategories", {
        groupedNodes: [{ tag: "MyTag1", nodes: [{ id: "node1" }] }],
      });
      const categories = store.state.nodeRepository.nodesPerCategory;
      const category = { tag: "MyTag2", nodes: [{ id: "node2" }] };
      store.commit("nodeRepository/setNodesPerCategories", {
        groupedNodes: [category],
        append: true,
      });
      categories.push(category);

      expect(store.state.nodeRepository.nodesPerCategory).toStrictEqual(
        categories,
      );
    });

    it("sets totalNumCategories", async () => {
      const { store } = await createStore();
      store.commit("nodeRepository/setTotalNumCategories", 2);
      expect(store.state.nodeRepository.totalNumCategories).toBe(2);
    });

    it("sets category scroll position", async () => {
      const { store } = await createStore();
      store.commit("nodeRepository/setCategoryScrollPosition", 22);
      expect(store.state.nodeRepository.categoryScrollPosition).toBe(22);
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
        expect(store.state.nodeRepository.categoryPage).toBe(1);

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

        expect(store.state.nodeRepository.nodesPerCategory).toEqual([
          {
            nodes: groupedNodesWithPorts,
            tag,
          },
        ]);
      });

      it("gets all nodes without append and with a bigger tagsLimits", async () => {
        const { store } = await createStore();

        await store.dispatch("nodeRepository/getAllNodes", { append: false });

        expect(store.state.nodeRepository.categoryPage).toBe(0);
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

      it("skips getting nodes when all categories were loaded", async () => {
        const { store } = await createStore();
        const categories = [{}, {}, {}];
        store.commit("nodeRepository/setNodesPerCategories", {
          groupedNodes: categories,
        });
        store.commit("nodeRepository/setTotalNumCategories", categories.length);

        await store.dispatch("nodeRepository/getAllNodes", { append: true });
        expect(API.noderepository.getNodesGroupedByTags).not.toHaveBeenCalled();
      });
    });

    describe("node description", () => {
      it("fetches node description", async () => {
        const { store, availablePortTypes } = await createStore();
        const selectedNode = {
          id: "node1",
          nodeFactory: {
            className: "test",
            settings: "test1",
          },
        };

        const result = await store.dispatch(
          "nodeRepository/getNodeDescription",
          { selectedNode },
        );

        const data = withPorts(
          [getNodeDescriptionResponse],
          availablePortTypes,
        )[0];

        expect(mockedAPI.node.getNodeDescription).toHaveBeenCalled();
        expect(result).toEqual({
          ...data,
          dynInPorts: [
            {
              groupName: "inGroupName",
              groupDescription: "No description available",
              types: [
                expect.objectContaining({
                  color: "green",
                  kind: "table",
                  type: "table",
                  description: "No description available",
                }),
              ],
            },
          ],
          dynOutPorts: [
            {
              groupName: "outGroupName",
              groupDescription: "This is the description",
              types: [
                expect.objectContaining({
                  color: "green",
                  kind: "table",
                  type: "table",
                  description: "No description available",
                }),
              ],
            },
          ],
        });
      });
    });

    describe("reset", () => {
      it("resets search results", async () => {
        const { store, dispatchSpy } = await createStore();
        store.state.nodeRepository.query = "foo";
        store.state.nodeRepository.nodes = [{ dummy: true }];
        await store.dispatch("nodeRepository/resetSearchAndCategories");
        expect(dispatchSpy).toHaveBeenCalledWith(
          "nodeRepository/clearSearchResults",
          undefined,
        );
        expect(dispatchSpy).toHaveBeenCalledWith(
          "nodeRepository/searchNodesDebounced",
          undefined,
        );
        expect(dispatchSpy).toHaveBeenCalledWith(
          "nodeRepository/clearCategoryResults",
          undefined,
        );
        expect(dispatchSpy).toHaveBeenCalledWith("nodeRepository/getAllNodes", {
          append: false,
        });
      });

      it("resets category results", async () => {
        const { store, dispatchSpy } = await createStore();
        await store.dispatch("nodeRepository/resetSearchAndCategories");
        expect(dispatchSpy).not.toHaveBeenCalledWith(
          "nodeRepository/clearSearchResults",
          undefined,
        );
        expect(dispatchSpy).not.toHaveBeenCalledWith(
          "nodeRepository/searchTopAndBottomNodes",
          undefined,
        );
        expect(dispatchSpy).toHaveBeenCalledWith(
          "nodeRepository/clearCategoryResults",
          undefined,
        );
        expect(dispatchSpy).toHaveBeenCalledWith("nodeRepository/getAllNodes", {
          append: false,
        });
      });

      it("clears category results", async () => {
        const { store } = await createStore();
        store.state.nodeRepository.nodesPerCategory = [{ dummy: true }];
        store.state.nodeRepository.totalNumCategories = 100;
        store.state.nodeRepository.categoryPage = 5;
        store.state.nodeRepository.categoryScrollPosition = 10;
        await store.dispatch("nodeRepository/clearCategoryResults");
        expect(store.state.nodeRepository.nodesPerCategory).toEqual([]);
        expect(store.state.nodeRepository.totalNumCategories).toBeNull();
        expect(store.state.nodeRepository.categoryPage).toBe(0);
        expect(store.state.nodeRepository.categoryScrollPosition).toBe(0);
      });
    });
  });
});
