import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import { createNodeTemplateWithExtendedPorts } from "@/test/factories";
import NodeTemplate from "../../NodeTemplate/NodeTemplate.vue";
import NodeList from "../NodeList.vue";

describe("NodeList", () => {
  const defaultProps = {
    hasMoreNodes: false,
    nodes: [
      createNodeTemplateWithExtendedPorts({ id: "node1" }),
      createNodeTemplateWithExtendedPorts({ id: "node2" }),
      createNodeTemplateWithExtendedPorts({ id: "node3" }),
      createNodeTemplateWithExtendedPorts({ id: "node4" }),
      createNodeTemplateWithExtendedPorts({ id: "node5" }),
      createNodeTemplateWithExtendedPorts({ id: "node6" }),
    ],
    selectedNode: createNodeTemplateWithExtendedPorts({ id: "node1" }),
  };

  const doMount = (props = {}, opts = {}) =>
    mount(NodeList, {
      props: { ...defaultProps, ...props },
      attachTo: document.body,
      ...opts,
    });

  it("show-more button", async () => {
    const wrapper = doMount({ hasMoreNodes: true });

    const showMoreButton = wrapper.find(".show-more");
    expect(showMoreButton.isVisible()).toBe(true);

    await showMoreButton.trigger("click");
    expect(wrapper.emitted("showMore")).toBeTruthy();

    await showMoreButton.trigger("keydown.enter");
    expect(wrapper.emitted("showMore")).toBeTruthy();
  });

  it("renders nodes", () => {
    const wrapper = doMount();
    const nodeTemplates = wrapper.findAllComponents(NodeTemplate);
    expect(nodeTemplates.at(0)?.props("nodeTemplate")).toStrictEqual(
      expect.objectContaining({
        id: "node1",
      }),
    );
    expect(nodeTemplates.at(1)?.props("nodeTemplate")).toStrictEqual(
      expect.objectContaining({
        id: "node2",
      }),
    );
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
      await nextTick();

      expect(wrapper.emitted("update:selectedNode")).toStrictEqual([
        [expect.objectContaining({ id })],
      ]);
    });

    it.each([
      ["ArrowUp", "node2"],
      ["ArrowLeft", "node1"],
    ])("emits event if nav reached top for %s key", async (key, id) => {
      const wrapper = doMount({
        selectedNode: { id },
      });

      await wrapper.find("ul").trigger("keydown", { key });
      await nextTick();

      expect(wrapper.emitted("navReachedTop")).toBeTruthy();
    });

    it.each([
      ["ArrowDown", "node4"],
      ["ArrowRight", "node6"],
    ])("emits event if nav reached bottom for %s key", async (key, id) => {
      const wrapper = doMount({ selectedNode: { id } });

      await wrapper.find("ul").trigger("keydown", { key });
      await nextTick();

      expect(wrapper.emitted("navReachedEnd")).toBeTruthy();
    });

    it("emits enter event for nodes", async () => {
      const wrapper = doMount();

      await wrapper.findAll("li").at(2)?.trigger("keydown.enter");
      await nextTick();

      expect(wrapper.emitted("enterKey")).toStrictEqual([
        [expect.objectContaining({ id: "node3" })],
      ]);
    });

    it("emits help event if `i` is pressed", async () => {
      const wrapper = doMount();

      await wrapper.find("ul > li").trigger("keydown.i");
      await nextTick();

      expect(wrapper.emitted("helpKey")).toBeTruthy();
    });
  });

  describe("focus and selection", () => {
    it("sets dom focus if selected node changes and is in our list", async () => {
      const wrapper = doMount();

      const listItems = wrapper.findAll("li");
      expect(listItems.length).toBe(7);

      const focusMock = vi.fn();
      listItems.at(3)!.element.focus = focusMock;

      const wrongFocusMock = vi.fn();
      [0, 1, 2, 4, 5].forEach((index) => {
        // @ts-expect-error
        listItems.at(index)!.element.focusMock = wrongFocusMock;
      });

      await wrapper.setProps({
        selectedNode: createNodeTemplateWithExtendedPorts({ id: "node4" }),
      });
      await nextTick();

      expect(focusMock).toBeCalled();
      expect(wrongFocusMock).toBeCalledTimes(0);
    });

    it("deselect item on lost focus", async () => {
      const wrapper = doMount({}, { attachTo: document.body });

      const div = document.createElement("div");
      div.setAttribute("tabindex", "0");
      document.body.appendChild(div);
      div.focus();

      await nextTick();

      expect(wrapper.emitted("update:selectedNode")).toStrictEqual([[null]]);
    });

    it("select first item on focus", async () => {
      const wrapper = doMount(
        { selectedNode: null },
        { attachTo: document.body },
      );

      // keyboard focus
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
      // trigger focus
      const ul = wrapper.find("ul").element;
      ul.focus();

      await nextTick();

      expect(wrapper.emitted("update:selectedNode")).toStrictEqual([
        [expect.objectContaining({ id: "node1" })],
      ]);
    });

    it("focus first item via exposed method", () => {
      const wrapper = doMount({ selectedNode: null });
      wrapper.vm.focusFirst();

      expect(wrapper.emitted("update:selectedNode")).toStrictEqual([
        [expect.objectContaining({ id: "node1" })],
      ]);
    });

    it("does not focus item if a node is selected", () => {
      const wrapper = doMount({ selectedNode: { id: "node2" } });
      wrapper.vm.focusFirst();

      expect(wrapper.emitted("update:selectedNode")).not.toStrictEqual([
        [expect.objectContaining({ id: "node1" })],
      ]);
    });

    it("focus last item via exposed method", () => {
      const wrapper = doMount({ selectedNode: null });
      wrapper.vm.focusLast();

      expect(wrapper.emitted("update:selectedNode")).toStrictEqual([
        [expect.objectContaining({ id: "node6" })],
      ]);
    });

    it("focusLast puts focus on show-more button if we have one", () => {
      const wrapper = doMount(
        { hasMoreNodes: true },
        { attachTo: document.body },
      );
      wrapper.vm.focusLast();

      const showMoreButton = wrapper.find(".show-more");

      expect(wrapper.emitted("update:selectedNode")).toBeFalsy();
      expect(document.activeElement).toBe(showMoreButton.element);
    });
  });
});
