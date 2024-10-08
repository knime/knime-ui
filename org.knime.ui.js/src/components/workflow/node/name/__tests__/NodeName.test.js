import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { shallowMount } from "@vue/test-utils";

import { mockVuexStore } from "@/test/utils";
import NodeName from "../NodeName.vue";
import NodeNameEditor from "../NodeNameEditor.vue";
import NodeNameText from "../NodeNameText.vue";

describe("NodeName", () => {
  const defaultProps = {
    nodeId: "root:1",
    nodePosition: { x: 15, y: 13 },
    editable: true,
    value: "Test Name",
  };

  const doShallowMount = ({ props = {}, $store }) => {
    const wrapper = shallowMount(NodeName, {
      props: { ...defaultProps, ...props },
      global: {
        plugins: [$store],
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
            nameEditorNodeId: "editNodeId",
          },
          actions: {
            openNameEditor: vi.fn(),
            closeNameEditor: vi.fn(),
            renameContainerNode: vi.fn(),
          },
        },
      };

      const $store = mockVuexStore(storeConfig);

      wrapper = doShallowMount({ $store });
    });

    it("should render properly", () => {
      expect(wrapper.findComponent(NodeNameText).exists()).toBe(true);
      expect(wrapper.findComponent(NodeNameEditor).exists()).toBe(false);
    });

    it("should forward props", () => {
      expect(wrapper.findComponent(NodeNameText).props()).toEqual(
        expect.objectContaining({
          value: defaultProps.value,
          editable: defaultProps.editable,
        }),
      );
    });

    it.each([
      ["widthChange", 100],
      ["heightChange", 100],
      ["mouseenter", { mock: "mock" }],
      ["mouseleave", { mock: "mock" }],
    ])("should emit a (%s) event", (eventName, payload) => {
      wrapper.findComponent(NodeNameText).vm.$emit(eventName, payload);

      expect(wrapper.emitted(eventName)[0][0]).toEqual(payload);
    });

    it("should handle a name change request", () => {
      wrapper.findComponent(NodeNameText).vm.$emit("request-edit");
      expect(storeConfig.workflow.actions.openNameEditor).toHaveBeenCalled();
    });

    it("should handle a name change requests triggered via the store (e.g. F2 key)", async () => {
      wrapper.vm.$store.state.workflow.nameEditorNodeId =
        wrapper.props("nodeId");
      await nextTick();
      expect(wrapper.emitted("editStart")).toBeDefined();
    });
  });

  describe("handles editor", () => {
    let storeConfig, wrapper, $store;

    beforeEach(() => {
      storeConfig = {
        workflow: {
          state: {
            nameEditorNodeId: defaultProps.nodeId,
          },
          actions: {
            openNameEditor: vi.fn(),
            closeNameEditor: vi.fn(),
            renameContainerNode: vi.fn(),
          },
        },
      };

      $store = mockVuexStore(storeConfig);

      wrapper = doShallowMount({ $store });
    });

    it("should render properly", () => {
      expect(wrapper.findComponent(NodeNameEditor).exists()).toBe(true);
      expect(wrapper.findComponent(NodeNameText).exists()).toBe(false);
    });

    it("should portal editor when visible", () => {
      expect(wrapper.findComponent({ name: "Portal" }).exists()).toBe(true);
    });

    it("should forward props", () => {
      expect(wrapper.findComponent(NodeNameEditor).props()).toEqual(
        expect.objectContaining({
          nodeId: defaultProps.nodeId,
          value: defaultProps.value,
          nodePosition: defaultProps.nodePosition,
        }),
      );
    });

    it.each([
      ["widthChange", 100],
      ["heightChange", 100],
    ])("should emit a (%s) event", (eventName, payload) => {
      wrapper.findComponent(NodeNameEditor).vm.$emit(eventName, payload);

      expect(wrapper.emitted(eventName)[0][0]).toEqual(payload);
    });

    it("should handle saving the name", async () => {
      vi.useFakeTimers();
      const saveEventPayload = {
        newName: "This is new",
        dimensionsOnClose: {
          width: 200,
          height: 100,
        },
      };

      wrapper.findComponent(NodeNameEditor).vm.$emit("save", saveEventPayload);
      expect(
        storeConfig.workflow.actions.renameContainerNode,
      ).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          nodeId: defaultProps.nodeId,
          name: saveEventPayload.newName,
        }),
      );

      vi.runAllTimers();
      expect(storeConfig.workflow.actions.closeNameEditor).toHaveBeenCalled();

      // emulate editor being closed from store
      $store.state.workflow.nameEditorNodeId = null;

      await nextTick();
      expect(wrapper.findComponent(NodeNameEditor).exists()).toBe(false);
      expect(wrapper.findComponent(NodeNameText).exists()).toBe(true);
    });

    it("should handle closing the editor", async () => {
      wrapper.findComponent(NodeNameEditor).vm.$emit("cancel");

      expect(storeConfig.workflow.actions.closeNameEditor).toHaveBeenCalled();

      // emulate editor being closed from store
      $store.state.workflow.nameEditorNodeId = null;

      await nextTick();
      expect(wrapper.findComponent(NodeNameEditor).exists()).toBe(false);
      expect(wrapper.findComponent(NodeNameText).exists()).toBe(true);
    });

    it("should pass the initial dimensions to an editor that is opened a second time", async () => {
      const saveEventPayload = {
        newName: "This is new",
        dimensionsOnClose: {
          width: 200,
          height: 100,
        },
      };

      expect(
        wrapper.findComponent(NodeNameEditor).props("startWidth"),
      ).toBeNull();
      expect(
        wrapper.findComponent(NodeNameEditor).props("startHeight"),
      ).toBeNull();

      wrapper.findComponent(NodeNameEditor).vm.$emit("save", saveEventPayload);

      // emulate close and re-open editor
      await nextTick();

      expect(wrapper.findComponent(NodeNameEditor).props("startWidth")).toBe(
        saveEventPayload.dimensionsOnClose.width,
      );
      expect(wrapper.findComponent(NodeNameEditor).props("startHeight")).toBe(
        saveEventPayload.dimensionsOnClose.height,
      );
    });
  });
});
