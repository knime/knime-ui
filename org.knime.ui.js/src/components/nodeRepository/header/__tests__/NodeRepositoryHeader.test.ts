import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { VueWrapper, mount } from "@vue/test-utils";
import { API } from "@api";

import { SearchInput } from "@knime/components";

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

vi.mock("@/plugins/feature-flags", () => ({
  useFeatures: () => ({ isComponentSearchEnabled: () => true }),
}));

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
    const mockedStores = mockStores();
    const {
      nodeRepositoryStore,
      testingPinia,
      applicationStore,
      applicationSettingsStore,
    } = mockedStores;

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

    const wrapper = mount(NodeRepositoryHeader, {
      global: {
        plugins: [testingPinia],
      },
    });

    return {
      mockedStores,
      wrapper,
    };
  };

  const setSearchContext = async (
    wrapper: VueWrapper<any>,
    value: "nodes" | "components",
  ) => {
    wrapper
      .findComponent('[data-test-id="search-context-switch"]')
      // @ts-expect-error
      .vm.$emit("update:model-value", value);
    await nextTick();
  };

  describe("renders", () => {
    it("renders header", () => {
      const { wrapper } = doMount({
        searchIsActive: false,
      });

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

    it("doesn't render CloseableTagList when searching for components", async () => {
      const { wrapper } = doMount();

      await setSearchContext(wrapper, "components");

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
      const { wrapper, mockedStores } = doMount();
      wrapper
        .findComponent(CloseableTagList)
        .vm.$emit("update:modelValue", ["myTag1", "myTag2"]);

      expect(mockedStores.nodeRepositoryStore.selectedTags).toStrictEqual([
        "myTag1",
        "myTag2",
      ]);
    });
  });

  describe("search", () => {
    it("updates query on SearchInput input based on mode", async () => {
      const { wrapper, mockedStores } = doMount();

      wrapper
        .findComponent(SearchInput)
        .vm.$emit("update:modelValue", "myquery");

      expect(mockedStores.nodeRepositoryStore.updateQuery).toHaveBeenCalledWith(
        "myquery",
      );
      expect(
        mockedStores.componentSearchStore.updateQuery,
      ).not.toHaveBeenCalled();

      vi.clearAllMocks();
      await setSearchContext(wrapper, "components");

      wrapper
        .findComponent(SearchInput)
        .vm.$emit("update:modelValue", "myquery");

      expect(
        mockedStores.nodeRepositoryStore.updateQuery,
      ).not.toHaveBeenCalled();
      expect(
        mockedStores.componentSearchStore.updateQuery,
      ).toHaveBeenCalledWith("myquery");
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

    it("changes placeholder based on mode", async () => {
      const { wrapper } = doMount();

      expect(wrapper.findComponent(SearchInput).props("placeholder")).toMatch(
        "Search all nodes",
      );
      await setSearchContext(wrapper, "components");
      expect(wrapper.findComponent(SearchInput).props("placeholder")).toMatch(
        "Search components in the KNIME Hub",
      );
    });
  });
});
