import { expect, describe, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";
import { mockVuexStore } from "@/test/utils/mockVuexStore";

import * as settingsStore from "@/store/settings";
import SearchBar from "webapps-common/ui/components/forms/SearchInput.vue";
import ActionBreadcrumb from "@/components/common/ActionBreadcrumb.vue";

import CloseableTagList from "../CloseableTagList.vue";
import NodeRepositoryHeader from "../NodeRepositoryHeader.vue";

describe("NodeRepositoryHeader", () => {
  const doMount = ({
    searchIsActive = null,
    nodesPerCategory = null,
    selectedTags = null,
    query = null,
    nodeRepositoryLoadedMock = true,
  } = {}) => {
    const searchNodesMock = vi.fn();
    const setSelectedTagsMock = vi.fn();
    const clearSearchParamsMock = vi.fn();
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
        },
        actions: {
          searchNodes: searchNodesMock,
          setSelectedTags: setSelectedTagsMock,
          clearSearchParams: clearSearchParamsMock,
          updateQuery: updateQueryMock,
        },
        getters: {
          searchIsActive: searchIsActive || (() => true),
          tagsOfVisibleNodes() {
            return ["myTag1", "myTag2"];
          },
        },
      },
      settings: settingsStore,
      application: {
        state: {
          activeProjectId: "project1",
          nodeRepositoryLoaded: nodeRepositoryLoadedMock,
        },
      },
    });

    const wrapper = shallowMount(NodeRepositoryHeader, {
      global: {
        plugins: [$store],
      },
    });

    return {
      wrapper,
      $store,
      searchNodesMock,
      setSelectedTagsMock,
      clearSearchParamsMock,
      updateQueryMock,
    };
  };

  describe("renders", () => {
    it("renders header", () => {
      const { wrapper } = doMount({
        searchIsActive: () => false,
      });

      expect(wrapper.findComponent(ActionBreadcrumb).props("items")).toEqual([
        { text: "Nodes" },
      ]);
      expect(wrapper.findComponent(SearchBar).exists()).toBe(true);
      expect(wrapper.findComponent(CloseableTagList).exists()).toBe(false);
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
      });

      expect(wrapper.findComponent(ActionBreadcrumb).props("items")).toEqual([
        { id: "clear", text: "Nodes" },
        { text: "Results" },
      ]);
    });
  });
});
