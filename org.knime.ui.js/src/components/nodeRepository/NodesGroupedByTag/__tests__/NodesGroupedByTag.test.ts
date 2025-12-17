import { describe, expect, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";

import { sleep } from "@knime/utils";

import NodeList from "@/components/common/NodeList/NodeList.vue";
import ScrollViewContainer from "@/components/common/ScrollViewContainer/ScrollViewContainer.vue";
import { createNodeTemplateWithExtendedPorts } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import TagResults from "../NodesGroupedByTag.vue";

vi.mock("@/api/utils");

const groupedNodes = [
  {
    tag: "tag:1",
    nodes: [createNodeTemplateWithExtendedPorts({ id: "node1" })],
  },
  {
    tag: "tag:2",
    nodes: [createNodeTemplateWithExtendedPorts({ id: "node2" })],
  },
];

describe("NodesGroupedByTag.vue", () => {
  const doShallowMount = () => {
    const { nodeRepositoryStore, testingPinia } = mockStores();

    nodeRepositoryStore.setNodesPerTags({ groupedNodes, append: false });
    nodeRepositoryStore.setTagScrollPosition(100);
    const selectedNode = createNodeTemplateWithExtendedPorts({
      id: "selected-node-id",
    });
    nodeRepositoryStore.setShowDescriptionForNode(selectedNode);

    vi.mocked(nodeRepositoryStore.getAllNodes).mockImplementation(() =>
      Promise.resolve(),
    );

    const wrapper = shallowMount(TagResults, {
      global: { plugins: [testingPinia] },
    });

    return { wrapper, nodeRepositoryStore, selectedNode };
  };

  describe("scroller", () => {
    it("remembers scroll position", () => {
      const { wrapper } = doShallowMount();

      const scrollViewContainer = wrapper.findComponent(ScrollViewContainer);
      expect(scrollViewContainer.props("initialPosition")).toBe(100);
    });

    it("saves scroll position", () => {
      const { wrapper, nodeRepositoryStore } = doShallowMount();

      const scrollViewContainer = wrapper.findComponent(ScrollViewContainer);
      scrollViewContainer.vm.$emit("save-position", 120);

      expect(nodeRepositoryStore.tagScrollPosition).toBe(120);
    });

    it("loads on reaching bottom", () => {
      const { wrapper, nodeRepositoryStore } = doShallowMount();

      const scrollViewContainer = wrapper.findComponent(ScrollViewContainer);
      scrollViewContainer.vm.$emit("scroll-bottom");

      expect(nodeRepositoryStore.getAllNodes).toHaveBeenCalledWith({
        append: true,
      });
    });
  });

  it("renders tags", () => {
    const { wrapper, selectedNode } = doShallowMount();

    const nodeList = wrapper.findAllComponents(NodeList);
    expect(nodeList.at(0)?.props()).toEqual(
      expect.objectContaining({
        selectedNode,
        showDescriptionForNode: expect.objectContaining({
          id: "selected-node-id",
        }),
        displayMode: "icon",
        nodes: [expect.objectContaining({ id: "node1" })],
      }),
    );
    expect(nodeList.at(1)?.props()).toEqual(
      expect.objectContaining({
        selectedNode,
        showDescriptionForNode: expect.objectContaining({
          id: "selected-node-id",
        }),
        displayMode: "icon",
        nodes: [expect.objectContaining({ id: "node2" })],
      }),
    );
  });

  it("can select tag", async () => {
    const { wrapper, nodeRepositoryStore } = doShallowMount();

    const nodeList = wrapper.findComponent(NodeList);
    nodeList.vm.$emit("show-more", "tag:1");

    await sleep(0);

    expect(nodeRepositoryStore.selectedTags).toStrictEqual(["tag:1"]);
  });
});
