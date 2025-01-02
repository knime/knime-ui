import { afterEach, describe, expect, it, vi } from "vitest";
import { API } from "@api";
import { createTestingPinia } from "@pinia/testing";

import { useApplicationStore } from "@/store/application/application";
import { useApplicationSettingsStore } from "@/store/application/settings";
import { createSearchNodesResponse } from "@/test/factories";
import { deepMocked, withPorts } from "@/test/utils";
import { useNodeSearch } from "../useNodeSearch";

const mockedAPI = deepMocked(API);

const searchNodesResponse = createSearchNodesResponse();

describe("Node search partial store", () => {
  const createComposable = () => {
    const availablePortTypes = {
      "org.knime.core.node.BufferedDataTable": {
        name: "BufferedDataTable",
        kind: "table" as any,
        color: "green",
      },
      "org.some.otherPorType": {
        name: "otherPorType",
        kind: "other" as any,
        color: "blue",
      },
      "org.knime.ext.h2o.ports.H2OFramePortObject": {
        name: "H2OFramePortObject",
        kind: "other" as any,
        color: "red",
      },
    };

    // search is part of the node repo API
    mockedAPI.noderepository.searchNodes.mockResolvedValue(searchNodesResponse);

    const testingPinia = createTestingPinia({
      stubActions: false,
      createSpy: vi.fn,
    });
    const applicationStore = useApplicationStore(testingPinia);
    applicationStore.setAvailablePortTypes(availablePortTypes);
    const applicationSettingsStore = useApplicationSettingsStore(testingPinia);

    const nodeSearch = useNodeSearch();

    return {
      availablePortTypes,
      applicationStore,
      applicationSettingsStore,
      nodeSearch,
    };
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getters", () => {
    it("returns proper values for hasSearchParams", () => {
      const { nodeSearch } = createComposable();
      expect(nodeSearch.hasSearchParams.value).toBe(false);
      nodeSearch.query.value = "value";
      expect(nodeSearch.hasSearchParams.value).toBe(true);
      nodeSearch.selectedTags.value = ["myTag1"];
      expect(nodeSearch.hasSearchParams.value).toBe(true);
      nodeSearch.query.value = "";
      expect(nodeSearch.hasSearchParams.value).toBe(true);
    });

    it("returns proper value for searchIsActive", () => {
      const { nodeSearch } = createComposable();
      expect(nodeSearch.searchIsActive.value).toBe(false);
      nodeSearch.nodes.value = [{ id: 1, name: "Node" }];
      expect(nodeSearch.searchIsActive.value).toBe(false);
      nodeSearch.query.value = "value";
      expect(nodeSearch.searchIsActive.value).toBe(true);
    });

    it("returns proper value for searchResultsContainNodeId", () => {
      const { nodeSearch } = createComposable();
      expect(nodeSearch.searchResultsContainNodeId(null)).toBe(false);
      nodeSearch.nodes.value = [{ id: 1, name: "Node" }];
      expect(nodeSearch.searchResultsContainNodeId(null)).toBe(false);
      const selectedNode = { id: 1, name: "Node" };
      expect(nodeSearch.searchResultsContainNodeId(selectedNode.id)).toBe(true);
      nodeSearch.nodes.value = [];
      expect(nodeSearch.searchResultsContainNodeId(selectedNode.id)).toBe(
        false,
      );
    });

    it("returns proper value for tagsOfVisibleNodes", () => {
      const { nodeSearch } = createComposable();
      expect(nodeSearch.tagsOfVisibleNodes.value).toEqual([]);
      nodeSearch.nodesTags.value = ["tag1", "tag2"];
      expect(nodeSearch.tagsOfVisibleNodes.value).toEqual(["tag1", "tag2"]);
      nodeSearch.nodesTags.value = [];
      expect(nodeSearch.tagsOfVisibleNodes.value).toEqual([]);
    });
  });

  describe("mutations", () => {
    it("sets nodeSearchPage", () => {
      const { nodeSearch } = createComposable();
      nodeSearch.setNodeSearchPage(2);
      expect(nodeSearch.nodeSearchPage.value).toBe(2);
    });

    it("sets portTypeId", () => {
      const { nodeSearch } = createComposable();
      nodeSearch.setPortTypeId("org.some.port.typeId");
      expect(nodeSearch.portTypeId.value).toBe("org.some.port.typeId");
    });

    it("sets nodeRelation", () => {
      const { nodeSearch } = createComposable();
      nodeSearch.setSearchNodeRelation("SUCCESSORS");
      expect(nodeSearch.nodeRelation.value).toBe("SUCCESSORS");
    });

    it("sets totalNumNodesFound", () => {
      const { nodeSearch } = createComposable();
      nodeSearch.setTotalNumNodesFound(2);
      expect(nodeSearch.totalNumNodesFound.value).toBe(2);
    });

    it("sets totalNumFilteredNodesFound", () => {
      const { nodeSearch } = createComposable();
      nodeSearch.setTotalNumFilteredNodesFound(5);
      expect(nodeSearch.totalNumFilteredNodesFound.value).toBe(5);
    });

    it("adds nodes (and skips duplicates)", () => {
      const { nodeSearch } = createComposable();
      const nodes = [{ id: "node1" }, { id: "node2" }];
      nodeSearch.setNodes(nodes);

      const moreNodes = [...nodes, { id: "node3" }];
      nodeSearch.addNodes(moreNodes);
      expect(nodeSearch.nodes.value).toEqual(moreNodes);
    });

    it("sets nodes", () => {
      const { nodeSearch } = createComposable();
      const nodes = [{ id: "node1" }];
      nodeSearch.setNodes([{ id: "node1" }]);
      expect(nodeSearch.nodes.value).toEqual(nodes);
    });

    it("sets nodesTags", () => {
      const { nodeSearch } = createComposable();
      nodeSearch.setNodesTags(["myTag", "myTag2"]);
      expect(nodeSearch.nodesTags.value).toEqual(["myTag", "myTag2"]);
    });

    it("sets selectedTags", () => {
      const { nodeSearch } = createComposable();
      nodeSearch.setSearchScrollPosition(100);

      nodeSearch.setSelectedTags(["myTag", "myTag2"]);
      expect(nodeSearch.selectedTags.value).toEqual(["myTag", "myTag2"]);
      expect(nodeSearch.searchScrollPosition.value).toBe(0);
    });

    it("sets query", () => {
      const { nodeSearch } = createComposable();
      nodeSearch.setSearchScrollPosition(100);

      nodeSearch.setQuery("some value");
      expect(nodeSearch.query.value).toBe("some value");
      expect(nodeSearch.searchScrollPosition.value).toBe(0);
    });

    it("sets search scroll position", () => {
      const { nodeSearch } = createComposable();
      nodeSearch.setSearchScrollPosition(22);
      expect(nodeSearch.searchScrollPosition.value).toBe(22);
    });

    it("sets loading of search results", () => {
      const { nodeSearch } = createComposable();
      nodeSearch.setLoadingSearchResults(true);
      expect(nodeSearch.isLoadingSearchResults.value).toBe(true);
    });
  });

  describe("actions", () => {
    describe("search", () => {
      // eslint-disable-next-line vitest/max-nested-describe
      describe("searchNodes", () => {
        it("clears search results on empty parameters (tags and query)", async () => {
          const { nodeSearch } = createComposable();
          await nodeSearch.searchNodes();
          expect(nodeSearch.nodes.value).toBeNull();
          expect(nodeSearch.nodesTags.value).toEqual([]);
        });

        it("searches for starter nodes", async () => {
          const { nodeSearch, availablePortTypes } = createComposable();
          nodeSearch.setQuery("lookup");
          await nodeSearch.searchNodes();

          expect(nodeSearch.nodeSearchPage.value).toBe(0);
          expect(mockedAPI.noderepository.searchNodes).toHaveBeenCalledWith({
            allTagsMatch: true,
            fullTemplateInfo: true,
            limit: 100,
            offset: 0,
            q: "lookup",
            tags: [],
            portTypeId: null,
            nodeRelation: null,
          });
          expect(nodeSearch.totalNumNodesFound.value).toBe(
            searchNodesResponse.totalNumNodesFound,
          );
          expect(nodeSearch.nodes.value).toEqual(
            withPorts(searchNodesResponse.nodes, availablePortTypes),
          );
          expect(nodeSearch.nodesTags.value).toEqual(searchNodesResponse.tags);
        });

        it("searches for nodes with append=true", async () => {
          const { nodeSearch, availablePortTypes } = createComposable();
          const dummyNode = { dummy: true };
          nodeSearch.setNodes([dummyNode]);
          nodeSearch.setQuery("lookup");
          await nodeSearch.searchNodes({ append: true });

          expect(nodeSearch.nodeSearchPage.value).toBe(1);
          expect(mockedAPI.noderepository.searchNodes).toHaveBeenCalledWith({
            allTagsMatch: true,
            fullTemplateInfo: true,
            limit: 100,
            offset: 100,
            q: "lookup",
            tags: [],
            portTypeId: null,
            nodeRelation: null,
          });
          expect(nodeSearch.totalNumNodesFound.value).toBe(
            searchNodesResponse.totalNumNodesFound,
          );
          expect(nodeSearch.nodes.value).toEqual([
            dummyNode,
            ...withPorts(searchNodesResponse.nodes, availablePortTypes),
          ]);
          expect(nodeSearch.nodesTags.value).toEqual(searchNodesResponse.tags);
        });

        it("searches for nodes next page", async () => {
          const { nodeSearch } = createComposable();
          nodeSearch.nodes.value = [{ dummy: true }];
          nodeSearch.totalNumNodesFound.value = 2;
          // we need to have a query to get to the searchNodes API call
          nodeSearch.setQuery("test");

          await nodeSearch.searchNodesNextPage();

          expect(mockedAPI.noderepository.searchNodes).toHaveBeenCalledWith(
            expect.objectContaining({
              offset: 100,
            }),
          );
        });

        it("does not search for nodes next page if all nodes loaded", async () => {
          const { nodeSearch } = createComposable();

          nodeSearch.nodes.value = [{ dummy: true }];
          nodeSearch.totalNumNodesFound.value = 1;
          nodeSearch.query.value = "look";
          await nodeSearch.searchNodesNextPage();

          expect(mockedAPI.noderepository.searchNodes).not.toHaveBeenCalled();
        });
      });

      it("updates query", async () => {
        const { nodeSearch } = createComposable();
        await nodeSearch.updateQuery("some value");

        expect(nodeSearch.query.value).toBe("some value");
        expect(mockedAPI.noderepository.searchNodes).toHaveBeenCalledWith(
          expect.objectContaining({
            q: "some value",
          }),
        );
      });

      it("set selected tags", () => {
        const { nodeSearch } = createComposable();

        nodeSearch.setSelectedTags(["myTag", "myTag2"]);
        expect(nodeSearch.selectedTags.value).toEqual(["myTag", "myTag2"]);

        // the search should use them
        nodeSearch.searchNodes();
        expect(mockedAPI.noderepository.searchNodes).toHaveBeenCalledWith(
          expect.objectContaining({
            tags: ["myTag", "myTag2"],
          }),
        );
      });

      it("set selected tags to empty list", () => {
        const { nodeSearch } = createComposable();

        // Make sure that searchIsActive will return true
        nodeSearch.setQuery("test");
        nodeSearch.setNodes(["dummy value"]);

        nodeSearch.setSelectedTags([]);
        expect(nodeSearch.selectedTags.value).toEqual([]);
      });

      it("clears search params (nodesTags and query)", () => {
        const { nodeSearch } = createComposable();

        nodeSearch.clearSearchParams();

        expect(nodeSearch.selectedTags.value).toEqual([]);
        expect(nodeSearch.query.value).toBe("");
        expect(nodeSearch.nodes.value).toBeNull();
        expect(nodeSearch.nodesTags.value).toEqual([]);
        expect(nodeSearch.totalNumNodesFound.value).toBe(0);
        expect(nodeSearch.totalNumFilteredNodesFound.value).toBe(0);
        expect(nodeSearch.portTypeId.value).toBeNull();
        expect(nodeSearch.nodeRelation.value).toBeNull();
      });
    });
  });
});
