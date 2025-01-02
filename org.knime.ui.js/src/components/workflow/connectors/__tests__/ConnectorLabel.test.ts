import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { shallowMount } from "@vue/test-utils";

import { createWorkflow } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import ConnectorLabel from "../ConnectorLabel.vue";

describe("ConnectorLabel.vue", () => {
  describe("check label creation", () => {
    const defaultProps = {
      id: "",
      sourceNode: "root:1",
      destNode: "root:2",
      sourcePort: 0,
      destPort: 2,
      allowedActions: { canDelete: true },
    };

    const isNodeSelectedMock = vi.fn(() => false);

    const doMount = (props = {}) => {
      const mockedStores = mockStores();
      mockedStores.workflowStore.setActiveWorkflow(
        createWorkflow({
          nodes: {
            "root:1": { position: { x: 0, y: 0 }, outPorts: [] },
            "root:2": { position: { x: 12, y: 14 }, inPorts: [] },
          },
        }),
      );
      mockedStores.movingStore.movePreviewDelta = { x: 0, y: 0 };
      mockedStores.movingStore.isDragging = false;
      // @ts-ignore
      mockedStores.selectionStore.isNodeSelected = () => isNodeSelectedMock;

      const wrapper = shallowMount(ConnectorLabel, {
        props: { ...defaultProps, ...props },
        global: { plugins: [mockedStores.testingPinia] },
      });

      return { wrapper, mockedStores };
    };

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("checks that a streaming label is present", () => {
      const { wrapper } = doMount({ label: "10" });

      expect(wrapper.find(".streaming-label").exists()).toBe(true);
    });

    it("moving node moves label", async () => {
      const { wrapper, mockedStores } = doMount({ label: "10" });

      const initialPosition = wrapper.attributes().transform;
      expect(initialPosition).toBe("translate(-480.25, -33.25)");

      isNodeSelectedMock.mockReturnValue(
        // @ts-ignore
        (nodeId) => ({ "root:1": true, "root:2": true })[nodeId],
      );
      mockedStores.movingStore.movePreviewDelta = { x: 200, y: 200 };
      mockedStores.movingStore.isDragging = true;
      await nextTick();

      const endPosition = wrapper.attributes().transform;

      expect(endPosition).toContain("translate");
      expect(endPosition).not.toBe("translate(-480.25, -33.25)");
    });

    it("dragging not connected node does not move label", async () => {
      const { wrapper, mockedStores } = doMount({ label: "10" });

      const initialPosition = wrapper.attributes().transform;
      expect(initialPosition).toBe("translate(-480.25, -33.25)");

      isNodeSelectedMock.mockReturnValue(false);
      mockedStores.movingStore.movePreviewDelta = { x: 200, y: 200 };
      await nextTick();

      const endPosition = wrapper.attributes().transform;

      expect(endPosition).toContain("translate");
      expect(endPosition).toBe("translate(-480.25, -33.25)");
    });
  });
});
