import { expect, describe, it, afterEach, vi } from "vitest";
import * as Vue from "vue";
import { mount } from "@vue/test-utils";

import * as $colors from "@/style/colors.mjs";
import FilterCheckIcon from "webapps-common/ui/assets/img/icons/filter-check.svg";
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

  describe("placeholders", () => {
    it("shows placeholder for empty result if numFilteredOutNodes is a positive value", async () => {
      const { wrapper } = doMount({
        propsOverrides: {
          query: "xxx",
          nodes: [],
        },
      });

      expect(wrapper.text()).toMatch(
        "Change filter settings to “All nodes“ to see more advanced nodes matching your search criteria.",
      );
      await wrapper.findComponent(FilterCheckIcon).trigger("click");
      expect(wrapper.emitted("openPreferences")).toBeTruthy();
      expect(wrapper.findComponent(NodeList).exists()).toBe(false);
    });

    it("shows download AP button and message for an empty search result in the browser", async () => {
      vi.resetModules();
      vi.doMock("@/environment", async (importOriginal) => {
        const actual = await importOriginal<typeof import("@/environment")>();

        return {
          ...actual,
          environment: "BROWSER",
          isDesktop: false,
          isBrowser: true,
        };
      });
      const SearchResults = (await import("../SearchResults.vue")).default;
      const { wrapper } = doMount({
        propsOverrides: {
          query: "xxx",
          nodes: [],
          showDownloadButton: true,
        },
        component: SearchResults,
        useScrollViewContainerMock: true,
      });

      expect(wrapper.find("download-a-p-button-stub").exists()).toBe(true);
      expect(wrapper.text()).toMatch(
        "There are no available matching nodes. To work with more nodes, download the KNIME Analytics Platform.",
      );
    });

    it("shows placeholder for empty result if numFilteredOutNodes is 0", () => {
      const query = "xxx xxx";
      const { wrapper } = doMount({
        propsOverrides: {
          query,
          nodes: [],
        },
        numFilteredOutNodes: 0,
      });
      const encodedQuery = encodeURIComponent(query);

      expect(wrapper.text()).toMatch("There are no matching nodes.");
      expect(wrapper.text()).toMatch("Search the KNIME Community Hub");
      expect(wrapper.find("a").attributes("href")).toBe(
        `https://hub.knime.com/search?q=${encodedQuery}&type=all&src=knimeappmodernui`,
      );
      expect(wrapper.findComponent(NodeList).exists()).toBe(false);
    });
  });

  it("displays node list skeleton when loading", async () => {
    const { wrapper } = doMount();

    wrapper.vm.isLoading = true;
    await Vue.nextTick();
    const nodeListSkeleton = wrapper.find(".node-list-skeleton");
    expect(nodeListSkeleton.exists()).toBe(true);
  });

  it("displays node list skeleton when isLoadingSearchResults is true", async () => {
    const { wrapper } = doMount({
      propsOverrides: {
        isLoadingSearchResults: true,
      },
    });

    await Vue.nextTick();
    const nodeListSkeleton = wrapper.find(".node-list-skeleton");
    expect(nodeListSkeleton.exists()).toBe(true);
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
      const { wrapper, searchActions } = doMount();

      vi.useFakeTimers();

      const scrollViewContainer = wrapper.findComponent(ScrollViewContainer);

      expect(wrapper.find(".node-list-skeleton").exists()).toBe(false);

      scrollViewContainer.vm.$emit("scrollBottom");
      await Vue.nextTick();

      expect(searchActions.searchNodesNextPage).toHaveBeenCalled();

      expect(wrapper.find(".node-list-skeleton").exists()).toBe(true);
      await vi.runAllTimersAsync();
      await Vue.nextTick();
      expect(wrapper.find(".node-list-skeleton").exists()).toBe(false);
    });
  });
});
