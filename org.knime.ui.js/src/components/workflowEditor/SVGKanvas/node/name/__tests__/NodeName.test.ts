import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { shallowMount } from "@vue/test-utils";

import { mockStores } from "@/test/utils/mockStores";
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

  const doShallowMount = ({
    props = {},
    initialNameEditorNodeId = "editNodeId",
  } = {}) => {
    const mockedStores = mockStores();
    mockedStores.nodeInteractionsStore.nameEditorNodeId =
      initialNameEditorNodeId;

    const wrapper = shallowMount(NodeName, {
      props: { ...defaultProps, ...props },
      global: {
        plugins: [mockedStores.testingPinia],
      },
    });

    return { wrapper, mockedStores };
  };

  describe("handles text", () => {
    it("should render properly", () => {
      const { wrapper } = doShallowMount();
      expect(wrapper.findComponent(NodeNameText).exists()).toBe(true);
      expect(wrapper.findComponent(NodeNameEditor).exists()).toBe(false);
    });

    it("should forward props", () => {
      const { wrapper } = doShallowMount();
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
      const { wrapper } = doShallowMount();
      wrapper.findComponent(NodeNameText).vm.$emit(eventName, payload);

      expect(wrapper.emitted(eventName)?.[0][0]).toEqual(payload);
    });

    it("should handle a name change request", () => {
      const { wrapper, mockedStores } = doShallowMount();
      wrapper.findComponent(NodeNameText).vm.$emit("request-edit");
      expect(
        mockedStores.nodeInteractionsStore.openNameEditor,
      ).toHaveBeenCalled();
    });

    it("should handle a name change requests triggered via the store (e.g. F2 key)", async () => {
      const { wrapper, mockedStores } = doShallowMount();
      mockedStores.nodeInteractionsStore.nameEditorNodeId =
        wrapper.props("nodeId");

      await nextTick();
      expect(wrapper.emitted("editStart")).toBeDefined();
    });
  });

  describe("handles editor", () => {
    it("should render properly", () => {
      const { wrapper } = doShallowMount({
        initialNameEditorNodeId: defaultProps.nodeId,
      });

      expect(wrapper.findComponent(NodeNameEditor).exists()).toBe(true);
      expect(wrapper.findComponent(NodeNameText).exists()).toBe(false);
    });

    it("should portal editor when visible", () => {
      const { wrapper } = doShallowMount({
        initialNameEditorNodeId: defaultProps.nodeId,
      });
      expect(wrapper.findComponent({ name: "Portal" }).exists()).toBe(true);
    });

    it("should forward props", () => {
      const { wrapper } = doShallowMount({
        initialNameEditorNodeId: defaultProps.nodeId,
      });
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
      const { wrapper } = doShallowMount({
        initialNameEditorNodeId: defaultProps.nodeId,
      });
      wrapper.findComponent(NodeNameEditor).vm.$emit(eventName, payload);

      expect(wrapper.emitted(eventName)?.[0][0]).toEqual(payload);
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
      const { wrapper, mockedStores } = doShallowMount({
        initialNameEditorNodeId: defaultProps.nodeId,
      });

      wrapper.findComponent(NodeNameEditor).vm.$emit("save", saveEventPayload);
      expect(
        mockedStores.nodeInteractionsStore.renameContainerNode,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          nodeId: defaultProps.nodeId,
          name: saveEventPayload.newName,
        }),
      );

      vi.runAllTimers();
      expect(
        mockedStores.nodeInteractionsStore.closeNameEditor,
      ).toHaveBeenCalled();

      // emulate editor being closed from store
      mockedStores.nodeInteractionsStore.nameEditorNodeId = null;

      await nextTick();
      expect(wrapper.findComponent(NodeNameEditor).exists()).toBe(false);
      expect(wrapper.findComponent(NodeNameText).exists()).toBe(true);
    });

    it("should handle closing the editor", async () => {
      const { wrapper, mockedStores } = doShallowMount({
        initialNameEditorNodeId: defaultProps.nodeId,
      });
      wrapper.findComponent(NodeNameEditor).vm.$emit("cancel");

      expect(
        mockedStores.nodeInteractionsStore.closeNameEditor,
      ).toHaveBeenCalled();

      // emulate editor being closed from store
      mockedStores.nodeInteractionsStore.nameEditorNodeId = null;

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
      const { wrapper } = doShallowMount({
        initialNameEditorNodeId: defaultProps.nodeId,
      });

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
