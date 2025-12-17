import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import SearchResults from "@/components/nodeSearch/SearchResults.vue";
import { createNodeTemplateWithExtendedPorts } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import SidebarSearchResults from "../SidebarSearchResults.vue";

describe("SidebarSearchResults", () => {
  const doMount = () => {
    const { nodeRepositoryStore, testingPinia } = mockStores();

    nodeRepositoryStore.setNodes([
      createNodeTemplateWithExtendedPorts({
        id: "node1",
        name: "Node 1",
      }),
      createNodeTemplateWithExtendedPorts({
        id: "node2",
        name: "Node 2",
      }),
    ]);

    nodeRepositoryStore.setTotalNumNodesFound(2);
    nodeRepositoryStore.setTagScrollPosition(100);
    nodeRepositoryStore.setSelectedNode(
      createNodeTemplateWithExtendedPorts({ id: "some-node" }),
    );

    nodeRepositoryStore.setTotalNumFilteredNodesFound(0);

    nodeRepositoryStore.isLoadingSearchResults = false;

    vi.mocked(nodeRepositoryStore.searchNodesNextPage).mockImplementation(
      () => {},
    );

    const wrapper = mount(SidebarSearchResults, {
      props: { displayMode: "icon" },
      global: { plugins: [testingPinia] },
    });

    return { wrapper, nodeRepositoryStore };
  };

  it("passes nodes and query", async () => {
    const { wrapper, nodeRepositoryStore } = doMount();
    nodeRepositoryStore.query = "some query";
    await nextTick();

    let results = wrapper.findComponent(SearchResults);
    expect(results.props("nodes")).toStrictEqual(nodeRepositoryStore.nodes);
    expect(results.props("query")).toStrictEqual(nodeRepositoryStore.query);
  });

  it("updates scroll position", async () => {
    const { wrapper, nodeRepositoryStore } = doMount();

    let results = wrapper.findComponent(SearchResults);
    expect(results.props("searchScrollPosition")).toBe(
      nodeRepositoryStore.searchScrollPosition,
    );

    results.vm.$emit("update:searchScrollPosition", 57);
    await nextTick();

    expect(nodeRepositoryStore.searchScrollPosition).toBe(57);
  });
});
