import { expect, describe, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";
import { mockVuexStore } from "@/test/utils/mockVuexStore";

import * as panelStore from "@/store/panel";
import * as settingsStore from "@/store/settings";
import SearchBar from "@/components/common/SearchBar.vue";
import ActionBreadcrumb from "@/components/common/ActionBreadcrumb.vue";

import CloseableTagList from "../CloseableTagList.vue";
import CategoryResults from "../CategoryResults.vue";
import SearchResults from "../SearchResults.vue";
import NodeDescription from "../NodeDescription.vue";
import { mockLodashThrottleAndDebounce } from "@/test/utils";
import NodeRepository from "../NodeRepository.vue";

mockLodashThrottleAndDebounce();

describe("NodeRepository", () => {
  const doMount = ({
    searchIsActive = null,
    isSelectedNodeVisible = null,
    nodesPerCategory = null,
    selectedTags = null,
    query = null,
    topNodes = null,
  } = {}) => {
    const searchNodesMock = vi.fn();
    const searchTopNodesNextPageMock = vi.fn();
    const setSelectedTagsMock = vi.fn();
    const getAllNodesMock = vi.fn();
    const clearSearchParamsMock = vi.fn();
    const setScrollPositionMock = vi.fn();
    const setSelectedNodeMock = vi.fn();
    const updateQueryMock = vi.fn();

    const $store = mockVuexStore({
      nodeRepository: {
        state: {
          nodesPerCategory: nodesPerCategory || [
            {
              tag: "myTag1",
              nodes: [
                {
                  id: "node3",
                  name: "Node 3",
                },
                {
                  id: "node4",
                  name: "Node 4",
                },
              ],
            },
          ],
          topNodes: topNodes || [
            {
              id: "node1",
              name: "Node 1",
            },
            {
              id: "node2",
              name: "Node 2",
            },
          ],
          totalNumTopNodes: 2,
          selectedTags: selectedTags || ["myTag2"],
          query: query || "",
          scrollPosition: 100,
          selectedNode: {
            id: 1,
            name: "Test",
            nodeFactory: {
              className: "some.class.name",
              settings: "",
            },
          },
          isDescriptionPanelOpen: false,
        },
        actions: {
          searchNodes: searchNodesMock,
          searchTopNodesNextPage: searchTopNodesNextPageMock,
          setSelectedTags: setSelectedTagsMock,
          getAllNodes: getAllNodesMock,
          clearSearchParams: clearSearchParamsMock,
          updateQuery: updateQueryMock,
        },
        getters: {
          searchIsActive: searchIsActive || (() => true),
          isSelectedNodeVisible: isSelectedNodeVisible || (() => true),
          tagsOfVisibleNodes() {
            return ["myTag1", "myTag2"];
          },
        },
        mutations: {
          setScrollPosition: setScrollPositionMock,
          setSelectedNode: setSelectedNodeMock,
        },
      },
      panel: panelStore,
      settings: settingsStore,
      application: {
        state: { activeProjectId: "project1" },
      },
    });

    const wrapper = shallowMount(NodeRepository, {
      global: {
        plugins: [$store],
      },
    });

    return {
      wrapper,
      $store,
      searchNodesMock,
      searchTopNodesNextPageMock,
      setSelectedTagsMock,
      getAllNodesMock,
      clearSearchParamsMock,
      setScrollPositionMock,
      setSelectedNodeMock,
      updateQueryMock,
      isSelectedNodeVisible,
    };
  };

  describe("renders", () => {
    it("renders empty Node Repository view and fetch first grouped nodes ", () => {
      const { wrapper, getAllNodesMock } = doMount({
        nodesPerCategory: [],
        searchIsActive: () => false,
      });

      expect(getAllNodesMock).toHaveBeenCalled();
      expect(wrapper.findComponent(ActionBreadcrumb).props("items")).toEqual([
        { text: "Nodes" },
      ]);
      expect(wrapper.findComponent(SearchBar).exists()).toBe(true);
      expect(wrapper.findComponent(CategoryResults).exists()).toBe(true);
      expect(wrapper.findComponent(SearchResults).exists()).toBe(false);
      expect(wrapper.findComponent(CloseableTagList).exists()).toBe(false);
    });

    it("renders first grouped nodes ", () => {
      const { wrapper, getAllNodesMock } = doMount({
        searchIsActive: () => false,
      });

      expect(getAllNodesMock).not.toHaveBeenCalled();
      expect(wrapper.findComponent(ActionBreadcrumb).props("items")).toEqual([
        { text: "Nodes" },
      ]);
      expect(wrapper.findComponent(SearchBar).exists()).toBe(true);
      expect(wrapper.findComponent(CloseableTagList).exists()).toBe(false);
      expect(wrapper.findComponent(CategoryResults).exists()).toBe(true);
      expect(wrapper.findComponent(SearchResults).exists()).toBe(false);
    });
  });

  describe("tags", () => {
    it("renders with selected tags", () => {
      const { wrapper } = doMount();
      expect(wrapper.findComponent(CloseableTagList).exists()).toBe(true);
      expect(wrapper.findComponent(CloseableTagList).props("tags")).toEqual([
        "myTag1",
        "myTag2",
      ]);
      expect(
        wrapper.findComponent(CloseableTagList).props("modelValue"),
      ).toEqual(["myTag2"]);
    });

    it("doesn't render CloseableTagList when no tags are selected and no search is active", () => {
      const { wrapper } = doMount({
        searchIsActive: () => false,
      });
      expect(wrapper.findComponent(CloseableTagList).exists()).toBe(false);
    });

    it("renders only Filter CloseableTagList (first list) when a single search is in progress", () => {
      const { wrapper } = doMount({
        query: "some node",
        selectedTags: [],
      });
      expect(wrapper.findComponent(CloseableTagList).exists()).toBe(true);
    });

    it("selects tag on click", () => {
      const { wrapper, setSelectedTagsMock } = doMount();
      wrapper
        .findComponent(CloseableTagList)
        .vm.$emit("update:modelValue", ["myTag1", "myTag2"]);

      expect(setSelectedTagsMock).toHaveBeenCalledWith(expect.anything(), [
        "myTag1",
        "myTag2",
      ]);
    });
  });

  describe("tag de-selection", () => {
    it("de-selects tag and clears search using back to Repository link", () => {
      const { wrapper, clearSearchParamsMock } = doMount();
      expect(wrapper.findComponent(ActionBreadcrumb).props("items")).toEqual([
        { id: "clear", text: "Nodes" },
        { text: "Results" },
      ]);
      wrapper
        .findComponent(ActionBreadcrumb)
        .vm.$emit("click", { id: "clear" });
      expect(clearSearchParamsMock).toHaveBeenCalled();
    });
  });

  describe("search for nodes", () => {
    it("updates query on SearchBar input", async () => {
      const { wrapper, updateQueryMock } = doMount();

      wrapper.findComponent(SearchBar).vm.$emit("update:modelValue", "myquery");
      await wrapper.vm.$nextTick();

      expect(updateQueryMock).toHaveBeenCalledWith(
        expect.anything(),
        "myquery",
      );
    });

    it("links back to repository view on search/filter results", () => {
      const { wrapper } = doMount({
        selectedTags: [],
        query: "some node",
        topNodes: [],
      });

      expect(wrapper.findComponent(ActionBreadcrumb).props("items")).toEqual([
        { id: "clear", text: "Nodes" },
        { text: "Results" },
      ]);
    });
  });

  describe("info panel", () => {
    it("shows node description panel", async () => {
      const { wrapper, $store } = doMount();
      expect(wrapper.findComponent(NodeDescription).exists()).toBe(false);

      $store.state.panel.isExtensionPanelOpen = true;
      $store.state.panel.activeTab = {
        project1: panelStore.TABS.NODE_REPOSITORY,
      };
      await wrapper.vm.$nextTick();

      expect(wrapper.findComponent(NodeDescription).exists()).toBe(true);
    });

    it("de-selectes node on close of description panel", async () => {
      // @ts-ignore
      window.setTimeout = vi.fn().mockImplementation((fn) => {
        fn();
        return 0;
      });
      const { wrapper, $store, setSelectedNodeMock } = doMount();
      $store.state.panel.isExtensionPanelOpen = true;
      await wrapper.vm.$nextTick();

      $store.state.panel.isExtensionPanelOpen = false;
      await wrapper.vm.$nextTick();

      expect(setSelectedNodeMock).toHaveBeenCalledWith(expect.anything(), null);
    });
  });
});
