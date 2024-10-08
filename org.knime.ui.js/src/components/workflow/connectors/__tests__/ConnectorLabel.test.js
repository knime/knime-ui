import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { shallowMount } from "@vue/test-utils";

import { mockVuexStore } from "@/test/utils/mockVuexStore";
import ConnectorLabel from "../ConnectorLabel.vue";

describe("ConnectorLabel.vue", () => {
  let props, $store;

  beforeEach(() => {
    props = {
      id: "",
      sourceNode: "root:1",
      destNode: "root:2",
      sourcePort: 0,
      destPort: 2,
      allowedActions: { canDelete: true },
    };
  });

  describe("check label creation", () => {
    let doMount, wrapper, isNodeSelectedMock;

    beforeEach(() => {
      isNodeSelectedMock = vi.fn().mockReturnValue(() => false);
      $store = mockVuexStore({
        workflow: {
          state: {
            activeWorkflow: {
              nodes: {
                "root:1": { position: { x: 0, y: 0 }, outPorts: [] },
                "root:2": { position: { x: 12, y: 14 }, inPorts: [] },
              },
            },
            movePreviewDelta: { x: 0, y: 0 },
            isDragging: false,
          },
          mutations: {
            setState(state, update = {}) {
              Object.entries(update).forEach(([key, value]) => {
                state[key] = value;
              });
            },
          },
        },
        selection: {
          getters: {
            isNodeSelected: () => isNodeSelectedMock,
          },
        },
      });

      doMount = () => {
        wrapper = shallowMount(ConnectorLabel, {
          props,
          global: { plugins: [$store] },
        });
      };
    });

    it("checks that a streaming label is present", () => {
      props.label = "10";
      doMount();

      expect(wrapper.find(".streaming-label").exists()).toBe(true);
    });

    it("moving node moves label", async () => {
      props.label = "10";
      doMount();

      const initialPosition = wrapper.attributes().transform;
      expect(initialPosition).toBe("translate(-480.25, -33.25)");

      isNodeSelectedMock.mockReturnValue(
        (nodeId) => ({ "root:1": true, "root:2": true })[nodeId],
      );
      $store.commit("workflow/setState", {
        movePreviewDelta: { x: 200, y: 200 },
        isDragging: true,
      });
      await nextTick();

      const endPosition = wrapper.attributes().transform;

      expect(endPosition).toContain("translate");
      expect(endPosition).not.toBe("translate(-480.25, -33.25)");
    });

    it("dragging not connected node does not move label", async () => {
      props.label = "10";
      doMount();

      const initialPosition = wrapper.attributes().transform;
      expect(initialPosition).toBe("translate(-480.25, -33.25)");

      isNodeSelectedMock.mockReturnValue(false);
      $store.commit("workflow/setState", {
        isDragging: true,
        movePreviewDelta: { x: 200, y: 200 },
      });
      await nextTick();

      const endPosition = wrapper.attributes().transform;

      expect(endPosition).toContain("translate");
      expect(endPosition).toBe("translate(-480.25, -33.25)");
    });
  });
});
