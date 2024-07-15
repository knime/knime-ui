import { expect, describe, it, afterEach, vi } from "vitest";
import * as Vue from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import * as $colors from "@/style/colors";
import SearchResults from "../SearchResults.vue";
import ScrollViewContainer from "../ScrollViewContainer.vue";
import NodeList from "../NodeList.vue";

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
  } = {}) => {
    const searchActions = {
      searchNodesNextPage: vi
        .fn()
        .mockImplementation(() => new Promise((r) => setTimeout(r, 10))),
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

    const wrapper = mount(component ?? SearchResults, {
      props,
      global: {
        stubs: {
          ScrollViewContainer: useScrollViewContainerMock
            ? ScrollViewContainerMock
            : null,
          DownloadAPButton: true,
        },
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
    await Vue.nextTick();

    expect(wrapper.find(".node-list-skeleton").exists()).toBe(false);

    vi.advanceTimersByTime(2000);
    await Vue.nextTick();

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
      await Vue.nextTick();

      expect(wrapper.vm.$refs.scroller.$el.scrollTop).toBe(0);
    });

    it("resets scroll if selected tags change", async () => {
      const { wrapper } = doMount();
      wrapper.vm.$refs.scroller.$el.scrollTop = 100;

      await wrapper.setProps({ selectedTags: ["1", "2"] });
      await Vue.nextTick();

      expect(wrapper.vm.$refs.scroller.$el.scrollTop).toBe(0);
    });

    it("scrolling to bottom load more results", async () => {
      vi.useFakeTimers();
      const { wrapper, searchActions } = doMount();

      const scrollViewContainer = wrapper.findComponent(ScrollViewContainer);

      expect(wrapper.find(".node-list-skeleton").exists()).toBe(false);

      scrollViewContainer.vm.$emit("scrollBottom");
      await Vue.nextTick();

      expect(searchActions.searchNodesNextPage).toHaveBeenCalled();

      expect(wrapper.find(".node-list-skeleton").exists()).toBe(false);

      vi.advanceTimersByTime(1000);
      await Vue.nextTick();
      expect(wrapper.find(".node-list-skeleton").exists()).toBe(true);

      await flushPromises();
      expect(wrapper.find(".node-list-skeleton").exists()).toBe(false);
    });
  });
});
