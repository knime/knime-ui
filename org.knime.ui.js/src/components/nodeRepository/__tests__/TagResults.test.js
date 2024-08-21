import { expect, describe, beforeEach, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";
import { mockVuexStore } from "@/test/utils/mockVuexStore";

import TagResults from "../TagResults.vue";
import ScrollViewContainer from "../ScrollViewContainer.vue";
import NodesGroupedByTags from "../NodesGroupedByTags.vue";

describe("TagResults", () => {
  let doShallowMount,
    wrapper,
    $store,
    storeState,
    getAllNodesMock,
    setSelectedTagsMock,
    setTagScrollPositionMock;

  beforeEach(() => {
    wrapper = null;

    getAllNodesMock = vi.fn();
    setSelectedTagsMock = vi.fn();
    setTagScrollPositionMock = vi.fn();

    storeState = {
      nodesPerTag: [
        { tag: "tag:1", nodes: ["node:1"] },
        { tag: "tag:2", nodes: ["node:1"] },
      ],
      tagScrollPosition: 100,
      showDescriptionForNode: { id: "selected-node-id" },
    };

    doShallowMount = () => {
      $store = mockVuexStore({
        nodeRepository: {
          state: storeState,
          actions: {
            setSelectedTags: setSelectedTagsMock,
            getAllNodes: getAllNodesMock,
          },
          mutations: {
            setTagScrollPosition: setTagScrollPositionMock,
          },
        },
      });
      wrapper = shallowMount(TagResults, {
        global: { plugins: [$store] },
      });
    };
  });

  describe("scroller", () => {
    it("remembers scroll position", () => {
      doShallowMount();

      let scrollViewContainer = wrapper.findComponent(ScrollViewContainer);
      expect(scrollViewContainer.props("initialPosition")).toBe(100);
    });

    it("saves scroll position", () => {
      doShallowMount();

      let scrollViewContainer = wrapper.findComponent(ScrollViewContainer);
      scrollViewContainer.vm.$emit("save-position", 100);

      expect(setTagScrollPositionMock).toHaveBeenCalledWith(
        expect.anything(),
        100,
      );
    });

    it("loads on reaching bottom", () => {
      doShallowMount();

      let scrollViewContainer = wrapper.findComponent(ScrollViewContainer);
      scrollViewContainer.vm.$emit("scroll-bottom");

      expect(getAllNodesMock).toHaveBeenCalledWith(expect.anything(), {
        append: true,
      });
    });
  });

  it("renders tags", () => {
    doShallowMount();

    let nodeTag = wrapper.findAllComponents(NodesGroupedByTags);
    expect(nodeTag.at(0).props()).toStrictEqual({
      tag: "tag:1",
      selectedNode: null,
      showDescriptionForNode: { id: "selected-node-id" },
      displayMode: "icon",
      nodes: ["node:1"],
    });
    expect(nodeTag.at(1).props()).toStrictEqual({
      tag: "tag:2",
      selectedNode: null,
      showDescriptionForNode: { id: "selected-node-id" },
      displayMode: "icon",
      nodes: ["node:1"],
    });
  });

  it("can select tag", () => {
    doShallowMount();

    let nodeTag = wrapper.findComponent(NodesGroupedByTags);
    nodeTag.vm.$emit("select-tag", "tag:1");

    expect(setSelectedTagsMock).toHaveBeenCalledWith(expect.anything(), [
      "tag:1",
    ]);
  });
});
