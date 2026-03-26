import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import SearchResults from "@/components/nodeSearch/SearchResults.vue";
import { createNodeTemplateWithExtendedPorts } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import SidebarNodeSearchResults from "../SidebarNodeSearchResults.vue";

// Prevent promise leak from createUnwrappedPromise
vi.mock("@knime/utils", async () => {
  const actual = await vi.importActual("@knime/utils");
  return {
    ...actual,
    promise: {
      ...(actual as any).promise,
      createUnwrappedPromise: () => ({
        promise: Promise.resolve(null),
        resolve: () => {},
        reject: () => {},
      }),
    },
  };
});

// Prevent promise leak from module-level side effect in useKdsDynamicModal
vi.mock("@knime/kds-components", () => ({
  useKdsDynamicModal: () => ({
    askConfirmation: vi.fn().mockResolvedValue({ confirmed: false }),
  }),
}));

describe("SidebarNodeSearchResults", () => {
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

    vi.mocked(nodeRepositoryStore.searchNodesNextPage).mockImplementation(() =>
      Promise.resolve(),
    );

    const wrapper = mount(SidebarNodeSearchResults, {
      props: { displayMode: "icon" },
      global: { plugins: [testingPinia] },
    });

    return { wrapper, nodeRepositoryStore };
  };

  it("passes nodes and query", async () => {
    const { wrapper, nodeRepositoryStore } = doMount();
    nodeRepositoryStore.query = "some query";
    await nextTick();

    const results = wrapper.findComponent(SearchResults);
    expect(results.props("nodes")).toStrictEqual(nodeRepositoryStore.nodes);
    expect(results.props("query")).toStrictEqual(nodeRepositoryStore.query);
  });

  it("updates scroll position", async () => {
    const { wrapper, nodeRepositoryStore } = doMount();

    const results = wrapper.findComponent(SearchResults);
    expect(results.props("scrollPosition")).toBe(
      nodeRepositoryStore.searchScrollPosition,
    );

    results.vm.$emit("update:searchScrollPosition", 57);
    await nextTick();

    expect(nodeRepositoryStore.searchScrollPosition).toBe(57);
  });
});
