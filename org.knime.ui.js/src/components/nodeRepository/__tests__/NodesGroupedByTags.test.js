import { expect, describe, beforeEach, it } from "vitest";
import { shallowMount } from "@vue/test-utils";

import NodesGroupedByTag from "../NodesGroupedByTag.vue";
import NodeList from "../NodeList.vue";

describe("NodesGroupedByTag", () => {
  let doShallowMount, wrapper, props;

  beforeEach(() => {
    wrapper = null;
    props = {
      tag: "tag",
      nodes: [
        { id: "node:1" },
        { id: "node:2" },
        { id: "node:3" },
        { id: "node:4" },
        { id: "node:5" },
      ],
      selectedNode: {
        id: "some-node",
      },
    };
    doShallowMount = () => {
      wrapper = shallowMount(NodesGroupedByTag, { props });
    };
  });

  it("renders node list and tag", () => {
    doShallowMount();

    expect(wrapper.findComponent(NodeList).props("nodes")).toStrictEqual([
      { id: "node:1" },
      { id: "node:2" },
      { id: "node:3" },
      { id: "node:4" },
      { id: "node:5" },
    ]);
    expect(wrapper.find(".tag-title").text()).toMatch("tag");
  });

  it("has no more nodes", () => {
    doShallowMount();
    expect(wrapper.findComponent(NodeList).props("hasMoreNodes")).toBe(false);
  });

  it("has more nodes", () => {
    props.nodes.push({ id: "node:6" });
    props.nodes.push({ id: "node:7" });
    props.nodes.push({ id: "node:8" });
    doShallowMount();

    expect(wrapper.findComponent(NodeList).props("hasMoreNodes")).toBe(true);
  });

  describe("select tag", () => {
    it("tag can be selected", async () => {
      doShallowMount();

      await wrapper.find(".tag-title").trigger("click");
      expect(wrapper.emitted("selectTag")).toStrictEqual([["tag"]]);
    });

    it("tag can be selected through button", async () => {
      doShallowMount();

      await wrapper.findComponent(NodeList).vm.$emit("show-more");
      expect(wrapper.emitted("selectTag")).toStrictEqual([["tag"]]);
    });
  });
});
