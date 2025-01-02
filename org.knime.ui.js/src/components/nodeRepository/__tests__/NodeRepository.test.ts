import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { shallowMount } from "@vue/test-utils";

import { sleep } from "@knime/utils";

import NodeDescription from "@/components/nodeDescription/NodeDescription.vue";
import type { NodeRepositoryState } from "@/store/nodeRepository";
import { TABS } from "@/store/panel";
import { createNodeTemplateWithExtendedPorts } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import NodeRepository from "../NodeRepository.vue";
import NodeRepositoryHeader from "../NodeRepositoryHeader.vue";
import NodeRepositoryLoader from "../NodeRepositoryLoader.vue";
import SearchResults from "../SearchResults.vue";
import TagResults from "../TagResults.vue";

const defaultNodesPerTag = [
  {
    tag: "myTag1",
    nodes: [
      createNodeTemplateWithExtendedPorts({ id: "node3" }),
      createNodeTemplateWithExtendedPorts({ id: "node4" }),
    ],
  },
];

describe("NodeRepository", () => {
  type MountOpts = {
    searchIsActive?: boolean;
    nodesPerTag?: NodeRepositoryState["nodesPerTag"];
    nodeRepositoryLoaded?: boolean;
  };

  const doMount = ({
    searchIsActive = true,
    nodesPerTag,
    nodeRepositoryLoaded = true,
  }: MountOpts = {}) => {
    const {
      nodeRepositoryStore,
      testingPinia,
      applicationStore,
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

    // @ts-expect-error
    nodeRepositoryStore.searchIsActive = searchIsActive;
    // @ts-expect-error
    nodeRepositoryStore.tagsOfVisibleNodes = ["myTag1", "myTag2"];
    // @ts-expect-error
    nodeRepositoryStore.isNodeVisible = true;

    applicationStore.setActiveProjectId("project1");

    applicationStore.nodeRepositoryLoaded = nodeRepositoryLoaded;

    const wrapper = shallowMount(NodeRepository, {
      global: {
        plugins: [testingPinia],
      },
    });

    return {
      wrapper,
      nodeRepositoryStore,
      applicationStore,
      lifecycleStore,
      panelStore,
    };
  };

  describe("renders", () => {
    it("renders empty Node Repository view and fetch first grouped nodes", async () => {
      const { wrapper, nodeRepositoryStore, lifecycleStore } = doMount({
        nodesPerTag: [],
        searchIsActive: false,
      });

      expect(
        lifecycleStore.subscribeToNodeRepositoryLoadingEvent,
      ).toHaveBeenCalled();

      await sleep(0);

      expect(nodeRepositoryStore.getAllNodes).toHaveBeenCalled();

      expect(wrapper.findComponent(NodeRepositoryHeader).exists()).toBe(true);
      expect(wrapper.findComponent(TagResults).exists()).toBe(true);
      expect(wrapper.findComponent(SearchResults).exists()).toBe(false);
      expect(wrapper.findComponent(NodeRepositoryLoader).exists()).toBe(false);
    });

    it("renders first grouped nodes", () => {
      const { wrapper, nodeRepositoryStore, lifecycleStore } = doMount({
        searchIsActive: false,
      });

      expect(nodeRepositoryStore.getAllNodes).not.toHaveBeenCalled();
      expect(
        lifecycleStore.subscribeToNodeRepositoryLoadingEvent,
      ).toHaveBeenCalled();
      expect(wrapper.findComponent(NodeRepositoryHeader).exists()).toBe(true);
      expect(wrapper.findComponent(TagResults).exists()).toBe(true);
      expect(wrapper.findComponent(SearchResults).exists()).toBe(false);
      expect(wrapper.findComponent(NodeRepositoryLoader).exists()).toBe(false);
    });
  });

  describe("info panel", () => {
    it("shows node description panel", async () => {
      const { wrapper, panelStore } = doMount();
      expect(wrapper.findComponent(NodeDescription).exists()).toBe(false);

      panelStore.isExtensionPanelOpen = true;
      panelStore.setActiveTab({
        projectId: "project1",
        activeTab: TABS.NODE_REPOSITORY,
      });
      await nextTick();

      expect(wrapper.findComponent(NodeDescription).exists()).toBe(true);
    });

    it("resets description node on close of description panel", async () => {
      // @ts-ignore
      window.setTimeout = vi.fn().mockImplementation((fn) => {
        fn();
        return 0;
      });
      const { panelStore, nodeRepositoryStore } = doMount();
      panelStore.isExtensionPanelOpen = true;
      await nextTick();

      panelStore.isExtensionPanelOpen = false;
      await nextTick();

      expect(
        nodeRepositoryStore.setShowDescriptionForNode,
      ).toHaveBeenCalledWith(null);
    });

    it("shows loader if node repository is not loaded", () => {
      const { wrapper } = doMount({
        nodeRepositoryLoaded: false,
      });

      expect(wrapper.findComponent(NodeRepositoryHeader).exists()).toBe(true);
      expect(wrapper.findComponent(TagResults).exists()).toBe(false);
      expect(wrapper.findComponent(SearchResults).exists()).toBe(false);
      expect(wrapper.findComponent(NodeRepositoryLoader).exists()).toBe(true);
    });
  });
});
