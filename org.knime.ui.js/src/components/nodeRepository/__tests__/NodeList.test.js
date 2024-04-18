import { expect, describe, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

import NodeTemplate from "../NodeTemplate/NodeTemplate.vue";
import NodeList from "../NodeList.vue";

describe("NodeList", () => {
  const defaultProps = {
    hasMoreNodes: false,
    nodes: [
      { id: "node1" },
      { id: "node2" },
      { id: "node3" },
      { id: "node4" },
      { id: "node5" },
      { id: "node6" },
    ],
    selectedNode: { id: "node1" },
  };

  const doMount = (props = {}) =>
    mount(NodeList, { props: { ...defaultProps, ...props } });

  it("show-more button", async () => {
    const wrapper = doMount({ hasMoreNodes: true });

    const showMoreButton = wrapper.find(".show-more");
    expect(showMoreButton.isVisible()).toBe(true);

    await showMoreButton.trigger("click");
    expect(wrapper.emitted("showMore")).toBeTruthy();
  });

  it("renders nodes", () => {
    const wrapper = doMount();
    let nodeTemplates = wrapper.findAllComponents(NodeTemplate);
    expect(nodeTemplates.at(0).props("nodeTemplate")).toStrictEqual({
      id: "node1",
    });
    expect(nodeTemplates.at(1).props("nodeTemplate")).toStrictEqual({
      id: "node2",
    });
  });

  it("emits enter event for nodes", async () => {
    const wrapper = doMount();

    await wrapper.findAll("li").at(2).trigger("keydown.enter");
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("enterKey")).toStrictEqual([[{ id: "node3" }]]);
  });

  it("sets dom focus if selected node changes and is in our list", async () => {
    const wrapper = doMount();

    const listItems = wrapper.findAll("li");
    expect(listItems.length).toBe(7);

    const focusMock = vi.fn();
    listItems.at(3).element.focus = focusMock;

    const wrongFocusMock = vi.fn();
    [0, 1, 2, 4, 5].forEach((index) => {
      listItems.at(index).element.focusMock = wrongFocusMock;
    });

    await wrapper.setProps({ selectedNode: { id: "node4" } });
    await wrapper.vm.$nextTick();

    expect(focusMock).toBeCalled();
    expect(wrongFocusMock).toBeCalledTimes(0);
  });

  describe("keyboard navigation", () => {
    it.each([
      ["down", "ArrowDown", "node1", "node4"],
      ["up", "ArrowUp", "node6", "node3"],
      ["left", "ArrowLeft", "node5", "node4"],
      ["right", "ArrowRight", "node3", "node4"],
    ])("navigates %s", async (_name, key, startId, id) => {
      const wrapper = doMount({ selectedNode: { id: startId } });

      await wrapper.find("ul").trigger("keydown", { key });
      await wrapper.vm.$nextTick();

      expect(wrapper.emitted("update:selectedNode")).toStrictEqual([[{ id }]]);
    });

    it.each([
      ["ArrowUp", "node2"],
      ["ArrowLeft", "node1"],
    ])("emits event if nav reached top for %s key", async (key, id) => {
      const wrapper = doMount({
        selectedNode: { id },
      });

      await wrapper.find("ul").trigger("keydown", { key });
      await wrapper.vm.$nextTick();

      expect(wrapper.emitted("navReachedTop")).toBeTruthy();
    });

    it.each([
      ["ArrowDown", "node4"],
      ["ArrowRight", "node6"],
    ])("emits event if nav reached bottom for %s key", async (key, id) => {
      const wrapper = doMount({ selectedNode: { id } });

      await wrapper.find("ul").trigger("keydown", { key });
      await wrapper.vm.$nextTick();

      expect(wrapper.emitted("navReachedEnd")).toBeTruthy();
    });
  });
});
