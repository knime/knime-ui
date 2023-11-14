import { expect, describe, it, vi } from "vitest";
import * as Vue from "vue";
import { mount } from "@vue/test-utils";

import ReloadIcon from "webapps-common/ui/assets/img/icons/reload.svg";
import SearchResults from "../SearchResults.vue";
import ScrollViewContainer from "../ScrollViewContainer.vue";
import NodeList from "../NodeList.vue";

describe("SearchResults", () => {
  const doMount = ({
    propsOverrides = {},
    hasFilteredOutNodes = true,
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
      hasFilteredOutNodes,
      ...propsOverrides,
    };

    const wrapper = mount(SearchResults, { props });

    return { wrapper, searchActions, props };
  };

  it("shows placeholder for empty result if hasFilteredOutNodes is true", async () => {
    const { wrapper } = doMount({
      propsOverrides: {
        query: "xxx",
        nodes: [],
      },
    });

    expect(wrapper.text()).toMatch(
      "There are no nodes matching with your current filter settings.",
    );
    expect(wrapper.text()).toMatch("But there are some in “All nodes“.");
    await wrapper.find("a").trigger("click");
    expect(wrapper.emitted("openPreferences")).toBeTruthy();
    expect(wrapper.findComponent(NodeList).exists()).toBe(false);
  });

  it("shows placeholder for empty result if hasFilteredOutNodes is false", () => {
    const query = "xxx xxx";
    const { wrapper } = doMount({
      propsOverrides: {
        query,
        nodes: [],
      },
      hasFilteredOutNodes: false,
    });
    const encodedQuery = encodeURIComponent(query);

    expect(wrapper.text()).toMatch("There are no matching nodes.");
    expect(wrapper.text()).toMatch("Search the KNIME Community Hub");
    expect(wrapper.find("a").attributes("href")).toBe(
      `https://hub.knime.com/search?q=${encodedQuery}&type=all&src=knimeappmodernui`,
    );
    expect(wrapper.findComponent(NodeList).exists()).toBe(false);
  });

  it("displays icon if loading is true", async () => {
    const { wrapper } = doMount();

    wrapper.vm.isLoading = true;
    await wrapper.vm.$nextTick();
    const loadingIcon = wrapper.findComponent(ReloadIcon);
    expect(loadingIcon.exists()).toBe(true);
  });

  it("renders nodes", () => {
    const { wrapper, props } = doMount();

    let nodeList = wrapper.findComponent(NodeList);
    expect(nodeList.props("nodes")).toStrictEqual(props.nodes);
  });

  describe("scroll", () => {
    it("remembers scroll position", () => {
      const { wrapper } = doMount();

      let scrollViewContainer = wrapper.findComponent(ScrollViewContainer);
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
      const { wrapper, searchActions } = doMount();

      vi.useFakeTimers();

      let scrollViewContainer = wrapper.findComponent(ScrollViewContainer);

      expect(wrapper.findComponent(ReloadIcon).exists()).toBe(false);

      scrollViewContainer.vm.$emit("scrollBottom");
      await Vue.nextTick();

      expect(searchActions.searchNodesNextPage).toHaveBeenCalled();

      expect(wrapper.findComponent(ReloadIcon).exists()).toBe(true);
      await vi.runAllTimersAsync();
      await Vue.nextTick();
      expect(wrapper.findComponent(ReloadIcon).exists()).toBe(false);
    });
  });
});
