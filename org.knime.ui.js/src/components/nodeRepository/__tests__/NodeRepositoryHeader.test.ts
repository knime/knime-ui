import { describe, expect, it } from "vitest";
import { shallowMount } from "@vue/test-utils";
import { API } from "@api";

import { SearchInput } from "@knime/components";

import ActionBreadcrumb from "@/components/common/ActionBreadcrumb.vue";
import type { NodeRepositoryState } from "@/store/nodeRepository";
import { createNodeTemplateWithExtendedPorts } from "@/test/factories";
import { deepMocked } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";
import CloseableTagList from "../CloseableTagList.vue";
import NodeRepositoryHeader from "../NodeRepositoryHeader.vue";

const defaultNodesPerTag = [
  {
    tag: "myTag1",
    nodes: [
      createNodeTemplateWithExtendedPorts({ id: "node3" }),
      createNodeTemplateWithExtendedPorts({ id: "node4" }),
    ],
  },
];

const mockedAPI = deepMocked(API);

describe("NodeRepositoryHeader", () => {
  type MountOpts = {
    searchIsActive?: boolean;
    nodesPerTag?: NodeRepositoryState["nodesPerTag"];
    selectedTags?: string[];
    query?: string;
    nodeRepositoryLoaded?: boolean;
    hasNodeCollectionActive?: boolean;
    activeNodeCollection?: string;
  };

  const doMount = ({
    searchIsActive = true,
    nodesPerTag,
    selectedTags,
    query,
    nodeRepositoryLoaded = true,
    hasNodeCollectionActive = false,
    activeNodeCollection = "",
  }: MountOpts = {}) => {
    const {
      nodeRepositoryStore,
      testingPinia,
      applicationStore,
      applicationSettingsStore,
      lifecycleStore,
      panelStore,
    } = mockStores();

    nodeRepositoryStore.setNodesPerTags({
      groupedNodes: nodesPerTag ?? defaultNodesPerTag,
      append: false,
    });

    nodeRepositoryStore.setTotalNumNodesFound(2);
    nodeRepositoryStore.setTagScrollPosition(100);
    nodeRepositoryStore.setSelectedNode(
      createNodeTemplateWithExtendedPorts({ id: "node1" }),
    );

    mockedAPI.noderepository.searchNodes.mockResolvedValue({
      tags: [],
      totalNumNodesFound: 0,
      totalNumFilteredNodesFound: 0,
      nodes: [],
    });

    nodeRepositoryStore.setSelectedTags(selectedTags ?? ["myTag2"]);

    // @ts-expect-error
    nodeRepositoryStore.searchIsActive = searchIsActive;
    // @ts-expect-error
    nodeRepositoryStore.tagsOfVisibleNodes = ["myTag1", "myTag2"];
    // @ts-expect-error
    nodeRepositoryStore.isNodeVisible = true;

    if (query) {
      nodeRepositoryStore.setQuery(query);
    }

    applicationStore.setActiveProjectId("project1");

    applicationStore.nodeRepositoryLoaded = nodeRepositoryLoaded;

    applicationSettingsStore.setHasNodeCollectionActive(
      hasNodeCollectionActive,
    );
    applicationSettingsStore.setActiveNodeCollection(activeNodeCollection);

    const wrapper = shallowMount(NodeRepositoryHeader, {
      global: {
        plugins: [testingPinia],
      },
    });

    return {
      wrapper,
      nodeRepositoryStore,
      lifecycleStore,
      panelStore,
    };
  };

  describe("renders", () => {
    it("renders header", () => {
      const { wrapper } = doMount({
        searchIsActive: false,
      });

      expect(wrapper.findComponent(ActionBreadcrumb).props("items")).toEqual([
        { text: "Nodes" },
      ]);
      expect(wrapper.findComponent(SearchInput).exists()).toBe(true);
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
        searchIsActive: false,
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
      const { wrapper, nodeRepositoryStore } = doMount();
      wrapper
        .findComponent(CloseableTagList)
        .vm.$emit("update:modelValue", ["myTag1", "myTag2"]);

      expect(nodeRepositoryStore.selectedTags).toStrictEqual([
        "myTag1",
        "myTag2",
      ]);
    });
  });

  describe("tag de-selection", () => {
    it("de-selects tag and clears search using back to Repository link", () => {
      const { wrapper, nodeRepositoryStore } = doMount();
      expect(wrapper.findComponent(ActionBreadcrumb).props("items")).toEqual([
        { id: "clear", text: "Nodes" },
        { text: "Results" },
      ]);
      wrapper
        .findComponent(ActionBreadcrumb)
        .vm.$emit("click", { id: "clear" });
      expect(nodeRepositoryStore.clearSearchParams).toHaveBeenCalled();
    });
  });

  describe("search for nodes", () => {
    it("updates query on SearchInput input", () => {
      const { wrapper, nodeRepositoryStore } = doMount();

      wrapper
        .findComponent(SearchInput)
        .vm.$emit("update:modelValue", "myquery");

      expect(nodeRepositoryStore.query).toBe("myquery");
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

    it("uses collection name when a collection is active", () => {
      const activeNodeCollection = "Test Collection";
      const { wrapper } = doMount({
        hasNodeCollectionActive: true,
        activeNodeCollection,
      });
      expect(wrapper.findComponent(SearchInput).props("placeholder")).includes(
        activeNodeCollection,
      );
    });
  });
});
