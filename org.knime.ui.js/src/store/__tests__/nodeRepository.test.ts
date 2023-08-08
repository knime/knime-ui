import { expect, describe, it, vi, afterEach } from "vitest";
/* eslint-disable max-lines */
import {
  deepMocked,
  mockVuexStore,
  withPorts,
  withoutKeys,
} from "@/test/utils";
import { API } from "@api";
import { searchNodesResponse } from "../common/__tests__/nodeSearch.test";
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

    mockedAPI.noderepository.searchNodes.mockReturnValue(searchNodesResponse);
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
      isDraggingNode: false,
      draggedNodeData: null,
      isDescriptionPanelOpen: false,
      nodeTemplates: {},
    });
  });

  describe("getters", () => {
    it("returns proper value for nodesPerCategoryContainSelectedNode", async () => {
      const { store } = await createStore();
      expect(
        store.getters["nodeRepository/nodesPerCategoryContainSelectedNode"],
      ).toBe(false);
      store.state.nodeRepository.nodesPerCategory = [
        { tag: "tag:1", nodes: [{ id: 1 }, { id: 2 }] },
      ];
      expect(
        store.getters["nodeRepository/nodesPerCategoryContainSelectedNode"],
      ).toBe(false);
      store.state.nodeRepository.selectedNode = { id: 1, name: "Node" };
      expect(
        store.getters["nodeRepository/nodesPerCategoryContainSelectedNode"],
      ).toBe(true);
    });

    it("returns proper value for isSelectedNodeVisible for searches", async () => {
      const { store } = await createStore();
      store.state.nodeRepository.topNodes = [{ id: 1, name: "Node" }];
      store.state.nodeRepository.query = "value";
      store.state.nodeRepository.selectedNode = { id: 3, name: "Node 3" };
      expect(store.getters["nodeRepository/isSelectedNodeVisible"]).toBe(false);
      store.state.nodeRepository.selectedNode = { id: 1, name: "Node" };
      expect(store.getters["nodeRepository/isSelectedNodeVisible"]).toBe(true);
    });

    it("returns proper value for isSelectedNodeVisible for categories", async () => {
      const { store } = await createStore();
      expect(store.getters["nodeRepository/isSelectedNodeVisible"]).toBe(false);
      store.state.nodeRepository.nodesPerCategory = [
        { tag: "tag:1", nodes: [{ id: 1 }, { id: 2 }] },
      ];
      store.state.nodeRepository.selectedNode = { id: 2, name: "Node" };
      expect(store.getters["nodeRepository/isSelectedNodeVisible"]).toBe(true);
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

    it("sets isDraggingNode", async () => {
      const { store } = await createStore();
      expect(store.state.nodeRepository.isDraggingNode).toBe(false);
      store.commit("nodeRepository/setDraggingNode", true);
      expect(store.state.nodeRepository.isDraggingNode).toBe(true);
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
        expect(store.state.nodeRepository.topNodeSearchPage).toBe(0);
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

        expect(mockedAPI.node.getNodeDescription).toHaveBeenCalled();
        expect(result).toEqual(
          withPorts([getNodeDescriptionResponse], availablePortTypes)[0],
        );
      });

      it("opens description panel", async () => {
        const { store } = await createStore();

        store.dispatch("nodeRepository/openDescriptionPanel");
        expect(store.state.nodeRepository.isDescriptionPanelOpen).toBe(true);
      });

      it("closes description panel", async () => {
        const { store } = await createStore();
        await store.dispatch("nodeRepository/openDescriptionPanel");

        await store.dispatch("nodeRepository/closeDescriptionPanel");
        expect(store.state.nodeRepository.isDescriptionPanelOpen).toBe(false);
      });
    });

    describe("reset", () => {
      it("resets search results", async () => {
        const { store, dispatchSpy } = await createStore();
        store.state.nodeRepository.query = "foo";
        store.state.nodeRepository.topNodes = [{ dummy: true }];
        await store.dispatch("nodeRepository/resetSearchAndCategories");
        expect(dispatchSpy).toHaveBeenCalledWith(
          "nodeRepository/clearSearchResults",
          undefined,
        );
        expect(dispatchSpy).toHaveBeenCalledWith(
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

    it("fetches and caches nodeTemplates based on id", async () => {
      const { store } = await createStore();
      const nodeTemplate = await store.dispatch(
        "nodeRepository/getNodeTemplate",
        "org.knime.ext.h2o.nodes.frametotable.H2OFrameToTableNodeFactory",
      );

      expect(nodeTemplate).toEqual(
        getNodeTemplatesResponse[
          "org.knime.ext.h2o.nodes.frametotable.H2OFrameToTableNodeFactory"
        ],
      );
      expect(store.state.nodeRepository.nodeTemplates).toEqual(
        getNodeTemplatesResponse,
      );
    });

    it("updates the current dragged repository node", async () => {
      const { store } = await createStore();
      const mockNodeTemplate = { factory: "testFactory" };
      await store.dispatch(
        "nodeRepository/setDraggingNodeTemplate",
        mockNodeTemplate,
      );

      expect(store.state.nodeRepository.isDraggingNode).toBeTruthy();
      expect(store.state.nodeRepository.draggedNodeData).toEqual(
        mockNodeTemplate,
      );

      await store.dispatch("nodeRepository/setDraggingNodeTemplate", null);

      expect(store.state.nodeRepository.isDraggingNode).toBeFalsy();
      expect(store.state.nodeRepository.draggedNodeData).toBeNull();
    });
  });
});
