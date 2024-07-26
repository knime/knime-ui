import { expect, describe, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";
import { mockVuexStore } from "@/test/utils/mockVuexStore";
import { lodashMockFactory } from "@/test/utils";

import * as panelStore from "@/store/panel";
import * as settingsStore from "@/store/settings";

import NodeDescription from "@/components/nodeDescription/NodeDescription.vue";
import CategoryResults from "../CategoryResults.vue";
import SearchResults from "../SearchResults.vue";
import NodeRepositoryLoader from "../NodeRepositoryLoader.vue";
import NodeRepositoryHeader from "../NodeRepositoryHeader.vue";
import NodeRepository from "../NodeRepository.vue";

vi.mock("lodash-es", async () => {
  const actual = await vi.importActual("lodash-es");

  return {
    ...actual,
    ...lodashMockFactory(),
  };
});

describe("NodeRepository", () => {
  const doMount = ({
    searchIsActive = null,
    nodesPerCategory = null,
    nodeRepositoryLoadedMock = true,
  } = {}) => {
    const searchNodesMock = vi.fn();
    const getAllNodesMock = vi.fn();
    const setSelectedNodeMock = vi.fn();
    const setShowDescriptionForNodeMock = vi.fn();
    const subscribeToNodeRepositoryLoadingEventMock = vi.fn();

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
          searchIsActive: searchIsActive || (() => true),
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
        nodesPerCategory: [],
        searchIsActive: () => false,
      });

      expect(getAllNodesMock).toHaveBeenCalled();
      expect(subscribeToNodeRepositoryLoadingEventMock).toHaveBeenCalled();
      expect(wrapper.findComponent(NodeRepositoryHeader).exists()).toBe(true);
      expect(wrapper.findComponent(CategoryResults).exists()).toBe(true);
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
      expect(wrapper.findComponent(CategoryResults).exists()).toBe(true);
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
      await wrapper.vm.$nextTick();

      expect(wrapper.findComponent(NodeDescription).exists()).toBe(true);
    });

    it("resets description node on close of description panel", async () => {
      // @ts-ignore
      window.setTimeout = vi.fn().mockImplementation((fn) => {
        fn();
        return 0;
      });
      const { wrapper, $store, setShowDescriptionForNodeMock } = doMount();
      $store.state.panel.isExtensionPanelOpen = true;
      await wrapper.vm.$nextTick();

      $store.state.panel.isExtensionPanelOpen = false;
      await wrapper.vm.$nextTick();

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
      expect(wrapper.findComponent(CategoryResults).exists()).toBe(false);
      expect(wrapper.findComponent(SearchResults).exists()).toBe(false);
      expect(wrapper.findComponent(NodeRepositoryLoader).exists()).toBe(true);
    });
  });
});
