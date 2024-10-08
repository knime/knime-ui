import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { shallowMount } from "@vue/test-utils";

import NodeDescription from "@/components/nodeDescription/NodeDescription.vue";
import * as panelStore from "@/store/panel";
import * as settingsStore from "@/store/settings";
import { mockVuexStore } from "@/test/utils/mockVuexStore";
import NodeRepository from "../NodeRepository.vue";
import NodeRepositoryHeader from "../NodeRepositoryHeader.vue";
import NodeRepositoryLoader from "../NodeRepositoryLoader.vue";
import SearchResults from "../SearchResults.vue";
import TagResults from "../TagResults.vue";

describe("NodeRepository", () => {
  type MountOpts = {
    searchIsActive?: (() => boolean) | null;
    nodesPerTag?: any[] | null;
    nodeRepositoryLoadedMock?: boolean;
  };

  const doMount = ({
    searchIsActive = null,
    nodesPerTag = null,
    nodeRepositoryLoadedMock = true,
  }: MountOpts = {}) => {
    const searchNodesMock = vi.fn();
    const getAllNodesMock = vi.fn();
    const setSelectedNodeMock = vi.fn();
    const setShowDescriptionForNodeMock = vi.fn();
    const subscribeToNodeRepositoryLoadingEventMock = vi.fn();

    const $store = mockVuexStore({
      nodeRepository: {
        state: {
          nodesPerTag: nodesPerTag ?? [
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
          getAllNodes: getAllNodesMock,
        },
        getters: {
          searchIsActive: searchIsActive ?? (() => true),
          tagsOfVisibleNodes() {
            return ["myTag1", "myTag2"];
          },
          isNodeVisible: () => vi.fn().mockReturnValue(true),
        },
        mutations: {
          setSelectedNode: setSelectedNodeMock,
          setShowDescriptionForNode: setShowDescriptionForNodeMock,
        },
      },
      panel: panelStore,
      settings: settingsStore,
      application: {
        state: {
          activeProjectId: "project1",
          nodeRepositoryLoaded: nodeRepositoryLoadedMock,
        },
        actions: {
          subscribeToNodeRepositoryLoadingEvent:
            subscribeToNodeRepositoryLoadingEventMock,
        },
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
      getAllNodesMock,
      setSelectedNodeMock,
      setShowDescriptionForNodeMock,
      subscribeToNodeRepositoryLoadingEventMock,
    };
  };

  describe("renders", () => {
    it("renders empty Node Repository view and fetch first grouped nodes", () => {
      const {
        wrapper,
        getAllNodesMock,
        subscribeToNodeRepositoryLoadingEventMock,
      } = doMount({
        nodesPerTag: [],
        searchIsActive: () => false,
      });

      expect(getAllNodesMock).toHaveBeenCalled();
      expect(subscribeToNodeRepositoryLoadingEventMock).toHaveBeenCalled();
      expect(wrapper.findComponent(NodeRepositoryHeader).exists()).toBe(true);
      expect(wrapper.findComponent(TagResults).exists()).toBe(true);
      expect(wrapper.findComponent(SearchResults).exists()).toBe(false);
      expect(wrapper.findComponent(NodeRepositoryLoader).exists()).toBe(false);
    });

    it("renders first grouped nodes", () => {
      const {
        wrapper,
        getAllNodesMock,
        subscribeToNodeRepositoryLoadingEventMock,
      } = doMount({
        searchIsActive: () => false,
      });

      expect(getAllNodesMock).not.toHaveBeenCalled();
      expect(subscribeToNodeRepositoryLoadingEventMock).toHaveBeenCalled();
      expect(wrapper.findComponent(NodeRepositoryHeader).exists()).toBe(true);
      expect(wrapper.findComponent(TagResults).exists()).toBe(true);
      expect(wrapper.findComponent(SearchResults).exists()).toBe(false);
      expect(wrapper.findComponent(NodeRepositoryLoader).exists()).toBe(false);
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
      await nextTick();

      expect(wrapper.findComponent(NodeDescription).exists()).toBe(true);
    });

    it("resets description node on close of description panel", async () => {
      // @ts-ignore
      window.setTimeout = vi.fn().mockImplementation((fn) => {
        fn();
        return 0;
      });
      const { $store, setShowDescriptionForNodeMock } = doMount();
      $store.state.panel.isExtensionPanelOpen = true;
      await nextTick();

      $store.state.panel.isExtensionPanelOpen = false;
      await nextTick();

      expect(setShowDescriptionForNodeMock).toHaveBeenCalledWith(
        expect.anything(),
        null,
      );
    });

    it("shows loader if node repository is not loaded", () => {
      const { wrapper } = doMount({
        nodeRepositoryLoadedMock: false,
      });

      expect(wrapper.findComponent(NodeRepositoryHeader).exists()).toBe(true);
      expect(wrapper.findComponent(TagResults).exists()).toBe(false);
      expect(wrapper.findComponent(SearchResults).exists()).toBe(false);
      expect(wrapper.findComponent(NodeRepositoryLoader).exists()).toBe(true);
    });
  });
});
