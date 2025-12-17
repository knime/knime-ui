import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import NodeList from "@/components/common/NodeList/NodeList.vue";
import ScrollViewContainer from "@/components/common/ScrollViewContainer/ScrollViewContainer.vue";
import * as $colors from "@/style/colors";
import { mockStores } from "@/test/utils/mockStores";
import SearchResults from "../SearchResults.vue";

const ScrollViewContainerMock = {
  template: "<div><slot></slot></div>",
};

describe("SearchResults", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  const doMount = ({
    propsOverrides = {},
    numFilteredOutNodes = 10,
    component = SearchResults,
    useScrollViewContainerMock = false,
    searchNextPageTimeout = 10,
  } = {}) => {
    const searchActions = {
      searchNodesNextPage: vi
        .fn()
        .mockImplementation(
          () => new Promise((r) => setTimeout(r, searchNextPageTimeout)),
        ),
    };

    const props = {
      nodes: [
        {
          id: "node1",
          name: "Node 1",
        },
        {
          id: "node2",
          name: "Node 2",
        },
      ],
      query: "",
      selectedTags: [],
      searchScrollPosition: 100,
      selectedNode: { id: "some-node" },
      searchActions,
      numFilteredOutNodes,
      highlightFirst: false,
      displayMode: "icon",
      isLoadingSearchResults: false,
      ...propsOverrides,
    };

    const { testingPinia } = mockStores();

    const wrapper = mount(component ?? SearchResults, {
      props,
      global: {
        stubs: {
          ScrollViewContainer: useScrollViewContainerMock
            ? ScrollViewContainerMock
            : null,
          DownloadAPButton: true,
        },
        plugins: [testingPinia],
        mocks: { $colors },
      },
    });

    return { wrapper, searchActions, props };
  };

  it("displays node list skeleton when isLoadingSearchResults is true", async () => {
    vi.useFakeTimers();

    const { wrapper } = doMount();

    expect(wrapper.find(".node-list-skeleton").exists()).toBe(false);

    await wrapper.setProps({ isLoadingSearchResults: true });
    await nextTick();

    expect(wrapper.find(".node-list-skeleton").exists()).toBe(false);

    vi.advanceTimersByTime(2000);
    await nextTick();

    expect(wrapper.find(".node-list-skeleton").exists()).toBe(true);
  });

  it("renders nodes", () => {
    const { wrapper, props } = doMount();

    const nodeList = wrapper.findComponent(NodeList);
    expect(nodeList.props("nodes")).toStrictEqual(props.nodes);
  });

  describe("scroll", () => {
    it("remembers scroll position", () => {
      const { wrapper } = doMount();

      const scrollViewContainer = wrapper.findComponent(ScrollViewContainer);
      expect(scrollViewContainer.props("initialPosition")).toBe(100);
    });

    it("resets scroll if search query changes", async () => {
      const { wrapper } = doMount();
      wrapper.vm.$refs.scroller.$el.scrollTop = 100;

      await wrapper.setProps({ query: "query" });
      await nextTick();

      expect(wrapper.vm.$refs.scroller.$el.scrollTop).toBe(0);
    });

    it("resets scroll if selected tags change", async () => {
      const { wrapper } = doMount();
      wrapper.vm.$refs.scroller.$el.scrollTop = 100;

      await wrapper.setProps({ selectedTags: ["1", "2"] });
      await nextTick();

      expect(wrapper.vm.$refs.scroller.$el.scrollTop).toBe(0);
    });

    it("scrolling to bottom load more results", async () => {
      vi.useFakeTimers();
      const { wrapper, searchActions } = doMount({
        searchNextPageTimeout: 3000,
      });

      const scrollViewContainer = wrapper.findComponent(ScrollViewContainer);

      expect(wrapper.find(".node-list-skeleton").exists()).toBe(false);

      scrollViewContainer.vm.$emit("scrollBottom");
      await nextTick();

      expect(searchActions.searchNodesNextPage).toHaveBeenCalled();

      expect(wrapper.find(".node-list-skeleton").exists()).toBe(false);

      await vi.advanceTimersByTimeAsync(1000);
      vi.runOnlyPendingTimers();
      await nextTick();
      expect(wrapper.find(".node-list-skeleton").exists()).toBe(true);

      await flushPromises();
      expect(wrapper.find(".node-list-skeleton").exists()).toBe(false);
    });
  });
});
