import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { shallowMount } from "@vue/test-utils";

import * as selectionStore from "@/store/selection";
import * as $shapes from "@/style/shapes";
import { mockVuexStore } from "@/test/utils";
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

  const doShallowMount = ({ props = {}, $store }) => {
    const wrapper = shallowMount(NodeLabel, {
      props: { ...defaultProps, ...props },
      global: {
        plugins: [$store],
        mocks: { $shapes },
      },
    });

    return wrapper;
  };

  describe("handles text", () => {
    let storeConfig, wrapper;

    beforeEach(() => {
      storeConfig = {
        workflow: {
          state: {
            labelEditorNodeId: "root:2",
          },
          actions: {
            openLabelEditor: vi.fn(),
            closeLabelEditor: vi.fn(),
            renameNodeLabel: vi.fn(),
          },
        },
        selection: selectionStore,
      };

      const $store = mockVuexStore(storeConfig);

      wrapper = doShallowMount({ $store });
    });

    it("should render properly", () => {
      expect(wrapper.findComponent(NodeLabelText).exists()).toBe(true);
      expect(wrapper.findComponent(NodeLabelEditor).exists()).toBe(false);
    });

    it("should forward props", () => {
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
      wrapper.findComponent(NodeLabelText).vm.$emit("request-edit");
      expect(storeConfig.workflow.actions.openLabelEditor).toHaveBeenCalled();
    });

    it("should pass correct port offset based on number of ports", async () => {
      await wrapper.setProps({ numberOfPorts: 2 });
      expect(wrapper.vm.portOffset).toBe(0);

      await wrapper.setProps({ numberOfPorts: 5 }); // threshold for max number of ports without offset
      expect(wrapper.vm.portOffset).toBe(27);
    });

    it("should pass correct port offset for metanode based on number of ports", async () => {
      await wrapper.setProps({ kind: "metanode" });
      await wrapper.setProps({ numberOfPorts: 2 });
      expect(wrapper.vm.portOffset).toBe(0);

      await wrapper.setProps({ numberOfPorts: 3 }); // threshold for max number of ports without offset
      expect(wrapper.vm.portOffset).toBe(9);
    });
  });

  describe("handles editor", () => {
    let storeConfig, wrapper, $store;

    beforeEach(() => {
      storeConfig = {
        workflow: {
          state: {
            labelEditorNodeId: "root:1",
          },
          actions: {
            openLabelEditor: vi.fn(),
            closeLabelEditor: vi.fn(),
            renameNodeLabel: vi.fn(),
          },
        },
        selection: selectionStore,
      };

      $store = mockVuexStore(storeConfig);

      wrapper = doShallowMount({ $store });
    });

    it("should render properly", () => {
      expect(wrapper.findComponent(NodeLabelEditor).exists()).toBe(true);
      expect(wrapper.findComponent(NodeLabelText).exists()).toBe(false);
    });

    it("should portal editor when visible", () => {
      expect(wrapper.findComponent({ name: "Portal" }).exists()).toBe(true);
    });

    it("should forward props", () => {
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

      wrapper.findComponent(NodeLabelEditor).vm.$emit("save", saveEventPayload);
      expect(storeConfig.workflow.actions.renameNodeLabel).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          nodeId: defaultProps.nodeId,
          label: saveEventPayload.newLabel,
        }),
      );

      vi.runAllTimers();
      expect(storeConfig.workflow.actions.closeLabelEditor).toHaveBeenCalled();

      // emulate editor being closed from store
      $store.state.workflow.labelEditorNodeId = null;

      await nextTick();
      expect(wrapper.findComponent(NodeLabelEditor).exists()).toBe(false);
      expect(wrapper.findComponent(NodeLabelText).exists()).toBe(true);
    });

    it("should handle closing the editor", async () => {
      wrapper.findComponent(NodeLabelEditor).vm.$emit("cancel");

      expect(storeConfig.workflow.actions.closeLabelEditor).toHaveBeenCalled();

      // emulate editor being closed from store
      $store.state.workflow.labelEditorNodeId = null;

      await nextTick();
      expect(wrapper.findComponent(NodeLabelEditor).exists()).toBe(false);
      expect(wrapper.findComponent(NodeLabelText).exists()).toBe(true);
    });
  });
});
