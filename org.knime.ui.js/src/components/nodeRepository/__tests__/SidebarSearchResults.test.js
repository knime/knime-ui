import { expect, describe, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { mockVuexStore } from "@/test/utils/mockVuexStore";

import SidebarSearchResults from "../SidebarSearchResults.vue";
import SearchResults from "@/components/nodeRepository/SearchResults.vue";

describe("SidebarSearchResults", () => {
  const doMount = () => {
    const $store = mockVuexStore({
      nodeRepository: {
        state: {
          query: "",
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
          totalNumNodes: 2,
          searchScrollPosition: 100,
          selectedNode: { id: "some-node" },
          totalNumFilteredNodesFound: 0,
        },
        actions: {
          searchNodesNextPage: vi.fn(),
        },
        mutations: {
          setSearchScrollPosition: vi.fn(),
          setSelectedNode: vi.fn(),
        },
      },
      application: {
        state: {
          hasNodeCollectionActive: false,
        },
      },
    });

    const commitSpy = vi.spyOn($store, "commit");

    const wrapper = mount(SidebarSearchResults, {
      global: { plugins: [$store] },
    });

    return { wrapper, $store, commitSpy };
  };

  it("passes nodes and query", async () => {
    const { wrapper, $store } = doMount();
    $store.state.nodeRepository.query = "some query";
    await wrapper.vm.$nextTick();

    let results = wrapper.findComponent(SearchResults);
    expect(results.props("nodes")).toStrictEqual(
      $store.state.nodeRepository.nodes,
    );
    expect(results.props("query")).toStrictEqual(
      $store.state.nodeRepository.query,
    );
  });

  it("updates scroll position", async () => {
    const { wrapper, commitSpy, $store } = doMount();

    let results = wrapper.findComponent(SearchResults);
    expect(results.props("searchScrollPosition")).toBe(
      $store.state.nodeRepository.searchScrollPosition,
    );

    results.vm.$emit("update:searchScrollPosition", 57);
    await wrapper.vm.$nextTick();

    expect(commitSpy).toBeCalledWith(
      "nodeRepository/setSearchScrollPosition",
      57,
    );
  });
});
