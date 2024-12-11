import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { shallowMount } from "@vue/test-utils";

import * as $shapes from "@/style/shapes";
import { mockStores } from "@/test/utils/mockStores";
import NodeLabel from "../NodeLabel.vue";
import NodeLabelEditor from "../NodeLabelEditor.vue";
import NodeLabelText from "../NodeLabelText.vue";

describe("NodeLabel", () => {
  const defaultProps = {
    nodeId: "root:1",
    nodePosition: { x: 15, y: 13 },
    kind: "metanode",
    value: "Test label",
    annotation: {
      text: "Test label",
      textAlign: "center",
      backgroundColor: "rgb(255, 216, 0)",
      styleRanges: [{ fontSize: 22, color: "#000000" }],
    },
  };

  const doShallowMount = ({
    props = {},
    initialLabelEditorNodeId = "root:2",
  } = {}) => {
    const mockedStores = mockStores();
    mockedStores.nodeInteractionsStore.labelEditorNodeId =
      initialLabelEditorNodeId;

    const wrapper = shallowMount(NodeLabel, {
      props: { ...defaultProps, ...props },
      global: {
        plugins: [mockedStores.testingPinia],
        mocks: { $shapes },
      },
    });

    return { wrapper, mockedStores };
  };

  describe("handles text", () => {
    it("should render properly", () => {
      const { wrapper } = doShallowMount();
      expect(wrapper.findComponent(NodeLabelText).exists()).toBe(true);
      expect(wrapper.findComponent(NodeLabelEditor).exists()).toBe(false);
    });

    it("should forward props", () => {
      const { wrapper } = doShallowMount();
      expect(wrapper.findComponent(NodeLabelText).props()).toEqual(
        expect.objectContaining({
          value: defaultProps.value,
          kind: defaultProps.kind,
          nodeId: defaultProps.nodeId,
          annotation: defaultProps.annotation,
        }),
      );
    });

    it("should handle a name change request", () => {
      const { wrapper, mockedStores } = doShallowMount();
      wrapper.findComponent(NodeLabelText).vm.$emit("request-edit");
      expect(
        mockedStores.nodeInteractionsStore.openLabelEditor,
      ).toHaveBeenCalled();
    });

    it("should pass correct port offset based on number of ports", async () => {
      const { wrapper } = doShallowMount();
      await wrapper.setProps({ numberOfPorts: 2 });
      expect(wrapper.vm.portOffset).toBe(0);

      await wrapper.setProps({ numberOfPorts: 5 }); // threshold for max number of ports without offset
      expect(wrapper.vm.portOffset).toBe(27);
    });

    it("should pass correct port offset for metanode based on number of ports", async () => {
      const { wrapper } = doShallowMount();
      await wrapper.setProps({ kind: "metanode" });
      await wrapper.setProps({ numberOfPorts: 2 });
      expect(wrapper.vm.portOffset).toBe(0);

      await wrapper.setProps({ numberOfPorts: 3 }); // threshold for max number of ports without offset
      expect(wrapper.vm.portOffset).toBe(9);
    });
  });

  describe("handles editor", () => {
    it("should render properly", () => {
      const { wrapper } = doShallowMount({
        initialLabelEditorNodeId: "root:1",
      });
      expect(wrapper.findComponent(NodeLabelEditor).exists()).toBe(true);
      expect(wrapper.findComponent(NodeLabelText).exists()).toBe(false);
    });

    it("should portal editor when visible", () => {
      const { wrapper } = doShallowMount({
        initialLabelEditorNodeId: "root:1",
      });

      expect(wrapper.findComponent({ name: "Portal" }).exists()).toBe(true);
    });

    it("should forward props", () => {
      const { wrapper } = doShallowMount({
        initialLabelEditorNodeId: "root:1",
      });

      expect(wrapper.findComponent(NodeLabelEditor).props()).toEqual(
        expect.objectContaining({
          nodeId: defaultProps.nodeId,
          value: defaultProps.annotation.text,
          kind: defaultProps.kind,
          nodePosition: defaultProps.nodePosition,
        }),
      );
    });

    it("should handle saving the label", async () => {
      vi.useFakeTimers();
      const saveEventPayload = { newLabel: "New label" };

      const { wrapper, mockedStores } = doShallowMount({
        initialLabelEditorNodeId: "root:1",
      });

      wrapper.findComponent(NodeLabelEditor).vm.$emit("save", saveEventPayload);
      expect(
        mockedStores.nodeInteractionsStore.renameNodeLabel,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          nodeId: defaultProps.nodeId,
          label: saveEventPayload.newLabel,
        }),
      );

      vi.runAllTimers();
      expect(
        mockedStores.nodeInteractionsStore.closeLabelEditor,
      ).toHaveBeenCalled();

      // emulate editor being closed from store
      mockedStores.nodeInteractionsStore.labelEditorNodeId = null;

      await nextTick();
      expect(wrapper.findComponent(NodeLabelEditor).exists()).toBe(false);
      expect(wrapper.findComponent(NodeLabelText).exists()).toBe(true);
    });

    it("should handle closing the editor", async () => {
      const { wrapper, mockedStores } = doShallowMount({
        initialLabelEditorNodeId: "root:1",
      });

      wrapper.findComponent(NodeLabelEditor).vm.$emit("cancel");

      expect(
        mockedStores.nodeInteractionsStore.closeLabelEditor,
      ).toHaveBeenCalled();

      // emulate editor being closed from store
      mockedStores.nodeInteractionsStore.labelEditorNodeId = null;

      await nextTick();
      expect(wrapper.findComponent(NodeLabelEditor).exists()).toBe(false);
      expect(wrapper.findComponent(NodeLabelText).exists()).toBe(true);
    });
  });
});
