import { expect, describe, beforeEach, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";
import { mockVuexStore } from "@/test/utils/mockVuexStore";

import CategoryResults from "../CategoryResults.vue";
import ScrollViewContainer from "../ScrollViewContainer.vue";
import NodeCategory from "../NodeCategory.vue";

describe("CategoryResults", () => {
  let doShallowMount,
    wrapper,
    $store,
    storeState,
    getAllNodesMock,
    setSelectedTagsMock,
    setCategoryScrollPositionMock;

  beforeEach(() => {
    wrapper = null;

    getAllNodesMock = vi.fn();
    setSelectedTagsMock = vi.fn();
    setCategoryScrollPositionMock = vi.fn();

    storeState = {
      nodesPerCategory: [
        { tag: "tag:1", nodes: ["node:1"] },
        { tag: "tag:2", nodes: ["node:1"] },
      ],
      categoryScrollPosition: 100,
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
            setCategoryScrollPosition: setCategoryScrollPositionMock,
          },
        },
      });
      wrapper = shallowMount(CategoryResults, {
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

      expect(setCategoryScrollPositionMock).toHaveBeenCalledWith(
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

  it("renders categories", () => {
    doShallowMount();

    let nodeCategory = wrapper.findAllComponents(NodeCategory);
    expect(nodeCategory.at(0).props()).toStrictEqual({
      tag: "tag:1",
      selectedNode: null,
      showDescriptionForNode: { id: "selected-node-id" },
      displayMode: "icon",
      nodes: ["node:1"],
    });
    expect(nodeCategory.at(1).props()).toStrictEqual({
      tag: "tag:2",
      selectedNode: null,
      showDescriptionForNode: { id: "selected-node-id" },
      displayMode: "icon",
      nodes: ["node:1"],
    });
  });

  it("can select tag", () => {
    doShallowMount();

    let nodeCategory = wrapper.findComponent(NodeCategory);
    nodeCategory.vm.$emit("select-tag", "tag:1");

    expect(setSelectedTagsMock).toHaveBeenCalledWith(expect.anything(), [
      "tag:1",
    ]);
  });
});
