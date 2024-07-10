import { expect, describe, it, vi, afterEach } from "vitest";
/* eslint-disable max-lines */
import {
  deepMocked,
  lodashMockFactory,
  mockVuexStore,
  withPorts,
} from "@/test/utils";
import { API } from "@api";

import {
  createSearchNodesResponse,
  createSearchAllNodesResponse,
} from "@/test/factories";

const mockedAPI = deepMocked(API);

const searchNodesResponse = createSearchNodesResponse();
const searchAllNodesResponse = createSearchAllNodesResponse();

vi.mock("lodash-es", async () => {
  const actual = await vi.importActual("lodash-es");

  return {
    ...actual,
    ...lodashMockFactory(),
  };
});

describe("Node search partial store", () => {
  let hasNodeCollectionActive = true;
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

    // search is part of the node repo API
    mockedAPI.noderepository.searchNodes.mockResolvedValue(searchNodesResponse);

    const store = mockVuexStore({
      nodeSearch: await import("@/store/common/nodeSearch"),
      application: {
        state: {
          availablePortTypes,
          hasNodeCollectionActive,
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
    it("returns proper values for hasSearchParams", async () => {
      const { store } = await createStore();
      expect(store.getters["nodeSearch/hasSearchParams"]).toBe(false);
      store.state.nodeSearch.query = "value";
      expect(store.getters["nodeSearch/hasSearchParams"]).toBe(true);
      store.state.nodeSearch.selectedTags = ["myTag1"];
      expect(store.getters["nodeSearch/hasSearchParams"]).toBe(true);
      store.state.nodeSearch.query = "";
      expect(store.getters["nodeSearch/hasSearchParams"]).toBe(true);
    });

    it("returns proper value for searchIsActive", async () => {
      const { store } = await createStore();
      expect(store.getters["nodeSearch/searchIsActive"]).toBe(false);
      store.state.nodeSearch.nodes = [{ id: 1, name: "Node" }];
      expect(store.getters["nodeSearch/searchIsActive"]).toBe(false);
      store.state.nodeSearch.query = "value";
      expect(store.getters["nodeSearch/searchIsActive"]).toBe(true);
    });

    it("returns proper value for searchResultsContainNodeId", async () => {
      const { store } = await createStore();
      expect(store.getters["nodeSearch/searchResultsContainNodeId"](null)).toBe(
        false,
      );
      store.state.nodeSearch.nodes = [{ id: 1, name: "Node" }];
      expect(store.getters["nodeSearch/searchResultsContainNodeId"](null)).toBe(
        false,
      );
      const selectedNode = { id: 1, name: "Node" };
      expect(
        store.getters["nodeSearch/searchResultsContainNodeId"](selectedNode.id),
      ).toBe(true);
      store.state.nodeSearch.nodes = [];
      expect(
        store.getters["nodeSearch/searchResultsContainNodeId"](selectedNode.id),
      ).toBe(false);
    });

    it("returns proper value for tagsOfVisibleNodes", async () => {
      const { store } = await createStore();
      expect(store.getters["nodeSearch/tagsOfVisibleNodes"]).toEqual([]);
      store.state.nodeSearch.nodesTags = ["tag1", "tag2"];
      expect(store.getters["nodeSearch/tagsOfVisibleNodes"]).toEqual([
        "tag1",
        "tag2",
      ]);
      store.state.nodeSearch.nodesTags = [];
      expect(store.getters["nodeSearch/tagsOfVisibleNodes"]).toEqual([]);
    });
  });

  describe("mutations", () => {
    it("sets nodeSearchPage", async () => {
      const { store } = await createStore();
      store.commit("nodeSearch/setNodeSearchPage", 2);
      expect(store.state.nodeSearch.nodeSearchPage).toBe(2);
    });

    it("sets portTypeId", async () => {
      const { store } = await createStore();
      store.commit("nodeSearch/setPortTypeId", "org.some.port.typeId");
      expect(store.state.nodeSearch.portTypeId).toBe("org.some.port.typeId");
    });

    it("sets totalNumNodesFound", async () => {
      const { store } = await createStore();
      store.commit("nodeSearch/setTotalNumNodesFound", 2);
      expect(store.state.nodeSearch.totalNumNodesFound).toBe(2);
    });

    it("sets totalNumFilteredNodesFound", async () => {
      const { store } = await createStore();
      store.commit("nodeSearch/setTotalNumFilteredNodesFound", 5);
      expect(store.state.nodeSearch.totalNumFilteredNodesFound).toBe(5);
    });

    it("adds nodes (and skips duplicates)", async () => {
      const { store } = await createStore();
      const nodes = [{ id: "node1" }, { id: "node2" }];
      store.commit("nodeSearch/setNodes", nodes);

      const moreNodes = [...nodes, { id: "node3" }];
      store.commit("nodeSearch/addNodes", moreNodes);
      expect(store.state.nodeSearch.nodes).toEqual(moreNodes);
    });

    it("sets nodes", async () => {
      const { store } = await createStore();
      const nodes = [{ id: "node1" }];
      store.commit("nodeSearch/setNodes", [{ id: "node1" }]);
      expect(store.state.nodeSearch.nodes).toEqual(nodes);
    });

    it("sets nodesTags", async () => {
      const { store } = await createStore();
      store.commit("nodeSearch/setNodesTags", ["myTag", "myTag2"]);
      expect(store.state.nodeSearch.nodesTags).toEqual(["myTag", "myTag2"]);
    });

    it("sets selectedTags", async () => {
      const { store } = await createStore();
      store.commit("nodeSearch/setSearchScrollPosition", 100);

      store.commit("nodeSearch/setSelectedTags", ["myTag", "myTag2"]);
      expect(store.state.nodeSearch.selectedTags).toEqual(["myTag", "myTag2"]);
      expect(store.state.nodeSearch.searchScrollPosition).toBe(0);
    });

    it("sets query", async () => {
      const { store } = await createStore();
      store.commit("nodeSearch/setSearchScrollPosition", 100);

      store.commit("nodeSearch/setQuery", "some value");
      expect(store.state.nodeSearch.query).toBe("some value");
      expect(store.state.nodeSearch.searchScrollPosition).toBe(0);
    });

    it("sets search scroll position", async () => {
      const { store } = await createStore();
      store.commit("nodeSearch/setSearchScrollPosition", 22);
      expect(store.state.nodeSearch.searchScrollPosition).toBe(22);
    });

    it("sets loading of search results", async () => {
      const { store } = await createStore();
      store.commit("nodeSearch/setLoadingSearchResults", true);
      expect(store.state.nodeSearch.isLoadingSearchResults).toBe(true);
    });
  });

  describe("actions", () => {
    describe("search", () => {
      // eslint-disable-next-line vitest/max-nested-describe
      describe("searchNodes", () => {
        it("clears search results on empty parameters (tags and query)", async () => {
          const { store } = await createStore();
          await store.dispatch("nodeSearch/searchNodes");
          expect(store.state.nodeSearch.nodes).toBeNull();
          expect(store.state.nodeSearch.nodesTags).toEqual([]);
        });

        it("searches for starter nodes", async () => {
          const { store, availablePortTypes } = await createStore();
          store.commit("nodeSearch/setQuery", "lookup");
          await store.dispatch("nodeSearch/searchNodes");

          expect(store.state.nodeSearch.nodeSearchPage).toBe(0);
          expect(mockedAPI.noderepository.searchNodes).toHaveBeenCalledWith({
            allTagsMatch: true,
            fullTemplateInfo: true,
            limit: 100,
            offset: 0,
            q: "lookup",
            tags: [],
            portTypeId: null,
          });
          expect(store.state.nodeSearch.totalNumNodesFound).toBe(
            searchNodesResponse.totalNumNodesFound,
          );
          expect(store.state.nodeSearch.nodes).toEqual(
            withPorts(searchNodesResponse.nodes, availablePortTypes),
          );
          expect(store.state.nodeSearch.nodesTags).toEqual(
            searchNodesResponse.tags,
          );
        });

        it("searches for all nodes", async () => {
          const { store, availablePortTypes } = await createStore();
          mockedAPI.noderepository.searchNodes.mockResolvedValue(
            searchAllNodesResponse,
          );
          store.commit("nodeSearch/setQuery", "lookup");
          await store.dispatch("nodeSearch/searchNodes", { all: true });

          expect(store.state.nodeSearch.nodeSearchPage).toBe(0);
          expect(mockedAPI.noderepository.searchNodes).toHaveBeenCalledWith({
            allTagsMatch: true,
            fullTemplateInfo: true,
            limit: 100,
            offset: 0,
            q: "lookup",
            tags: [],
            portTypeId: null,
          });
          expect(store.state.nodeSearch.totalNumNodesFound).toBe(
            searchAllNodesResponse.totalNumNodesFound,
          );
          expect(store.state.nodeSearch.nodes).toEqual(
            withPorts(searchAllNodesResponse.nodes, availablePortTypes),
          );
          expect(store.state.nodeSearch.nodesTags).toEqual(
            searchAllNodesResponse.tags,
          );
        });

        it("searches for nodes with append=true", async () => {
          const { store, availablePortTypes } = await createStore();
          const dummyNode = { dummy: true };
          store.commit("nodeSearch/setNodes", [dummyNode]);
          store.commit("nodeSearch/setQuery", "lookup");
          await store.dispatch("nodeSearch/searchNodes", { append: true });

          expect(store.state.nodeSearch.nodeSearchPage).toBe(1);
          expect(mockedAPI.noderepository.searchNodes).toHaveBeenCalledWith({
            allTagsMatch: true,
            fullTemplateInfo: true,
            limit: 100,
            offset: 100,
            q: "lookup",
            tags: [],
            portTypeId: null,
          });
          expect(store.state.nodeSearch.totalNumNodesFound).toBe(
            searchNodesResponse.totalNumNodesFound,
          );
          expect(store.state.nodeSearch.nodes).toEqual([
            dummyNode,
            ...withPorts(searchNodesResponse.nodes, availablePortTypes),
          ]);
          expect(store.state.nodeSearch.nodesTags).toEqual(
            searchNodesResponse.tags,
          );
        });

        it("searches for nodes next page", async () => {
          const { store, dispatchSpy } = await createStore();
          await store.dispatch("nodeSearch/searchNodesNextPage");
          expect(dispatchSpy).toHaveBeenCalledWith("nodeSearch/searchNodes", {
            append: true,
          });
        });

        it("does not search for nodes next page if all nodes loaded", async () => {
          const { store, dispatchSpy } = await createStore();
          store.state.nodeSearch.nodes = [{ dummy: true }];
          store.state.nodeSearch.totalNumNodesFound = 1;
          await store.dispatch("nodeSearch/searchNodesNextPage");
          expect(dispatchSpy).not.toHaveBeenCalledWith(
            "nodeSearch/searchNodes",
            expect.anything(),
          );
        });
      });

      it("updates query", async () => {
        const { store, dispatchSpy } = await createStore();
        await store.dispatch("nodeSearch/updateQuery", "some value");

        expect(store.state.nodeSearch.query).toBe("some value");
        expect(dispatchSpy).toHaveBeenCalledWith(
          "nodeSearch/searchNodesDebounced",
          undefined,
        );
        expect(dispatchSpy).toHaveBeenCalledWith(
          "nodeSearch/searchNodes",
          undefined,
        );
      });

      it("updates query for all nodes if hasNodeCollectionActive is false", async () => {
        hasNodeCollectionActive = false;
        const { store, dispatchSpy } = await createStore();
        await store.dispatch("nodeSearch/updateQuery", "some value");

        expect(store.state.nodeSearch.query).toBe("some value");
        expect(dispatchSpy).toHaveBeenCalledWith(
          "nodeSearch/searchNodesDebounced",
          undefined,
        );
        expect(dispatchSpy).toHaveBeenCalledWith(
          "nodeSearch/searchNodes",
          undefined,
        );
      });

      it("set selected tags", async () => {
        const { store, dispatchSpy } = await createStore();
        store.dispatch("nodeSearch/setSelectedTags", ["myTag", "myTag2"]);
        expect(store.state.nodeSearch.selectedTags).toEqual([
          "myTag",
          "myTag2",
        ]);

        expect(dispatchSpy).toHaveBeenCalledWith(
          "nodeSearch/searchNodesDebounced",
          undefined,
        );
      });

      it("set selected tags to empty list", async () => {
        const { store, dispatchSpy } = await createStore();

        // Make sure that searchIsActive will return true
        store.commit("nodeSearch/setQuery", "test");
        store.commit("nodeSearch/setNodes", ["dummy value"]);

        await store.dispatch("nodeSearch/setSelectedTags", []);
        expect(store.state.nodeSearch.selectedTags).toEqual([]);
        expect(dispatchSpy).toHaveBeenCalledWith(
          "nodeSearch/searchNodesDebounced",
          undefined,
        );
      });

      it("clears search params (nodesTags and query)", async () => {
        const { store, dispatchSpy } = await createStore();
        store.dispatch("nodeSearch/clearSearchParams");

        expect(store.state.nodeSearch.selectedTags).toEqual([]);
        expect(store.state.nodeSearch.query).toBe("");
        expect(store.state.nodeSearch.nodes).toBeNull();
        expect(store.state.nodeSearch.nodesTags).toEqual([]);
        expect(dispatchSpy).toHaveBeenCalledWith(
          "nodeSearch/clearSearchResults",
          undefined,
        );
      });
    });
  });
});
