import { expect, describe, it, vi } from "vitest";
import * as Vue from "vue";
import { shallowMount } from "@vue/test-utils";
import { mockVuexStore } from "@/test/utils";
import * as $shapes from "@/style/shapes";

import { dropNode, KnimeMIME } from "../dropNode";

describe("Drop Node Mixin", () => {
  const doMount = ({ isWritable = true } = {}) => {
    Event.prototype.preventDefault = vi.fn();

    const dummyEvent = {
      clientX: 0,
      clientY: 1,
      dataTransfer: {
        dropEffect: "",
        types: ["text/plain"],
        getData: vi
          .fn()
          .mockReturnValue(JSON.stringify({ className: "sampleClassName" })),
      },
      preventDefault: vi.fn(),
    };
    const addNodeMock = vi.fn(() => ({ newNodeId: "mock-new-node" }));

    const kanvasElement = {
      scrollLeft: 5,
      scrollTop: 5,
      offsetLeft: 5,
      offsetTop: 5,
    };

    const dropNodeTarget = {
      template: `
                <div
                    @drop.stop="onDrop"
                    @dragover.stop="onDragOver"
                />`,
      mixins: [dropNode],
    };

    const $store = mockVuexStore({
      workflow: {
        actions: {
          addNode: addNodeMock,
        },
        getters: {
          isWritable() {
            return isWritable;
          },
        },
      },
      canvas: {
        getters: {
          screenToCanvasCoordinates:
            () =>
            ([x, y]) => [x - 10, y - 10],
        },
      },
    });

    document.getElementById = (id) => (id === "kanvas" ? kanvasElement : null);

    const wrapper = shallowMount(dropNodeTarget, {
      global: { plugins: [$store], mocks: { $shapes } },
    });

    return { wrapper, dummyEvent, addNodeMock, $store };
  };

  it("doesnt allow normal drag & drop", () => {
    const { wrapper, dummyEvent } = doMount();

    wrapper.trigger("dragover", dummyEvent);

    expect(dummyEvent.dataTransfer.dropEffect).not.toBe("copy");

    // drop target NOT enabled
    expect(Event.prototype.preventDefault).not.toHaveBeenCalled();
  });

  it("allows drag & drop from node repo", () => {
    const { wrapper, dummyEvent } = doMount();
    dummyEvent.dataTransfer.types.push(KnimeMIME);

    wrapper.trigger("dragover", dummyEvent);

    expect(dummyEvent.dataTransfer.dropEffect).toBe("copy");
  });

  it("calls the addNode api with the correct position to add the node", async () => {
    const { wrapper, dummyEvent, addNodeMock } = doMount();

    wrapper.trigger("drop", dummyEvent);

    expect(addNodeMock).toHaveBeenCalledWith(expect.anything(), {
      nodeFactory: { className: "sampleClassName" },
      position: {
        x: -10 + dummyEvent.clientX - $shapes.nodeSize / 2,
        y: -10 + dummyEvent.clientY - $shapes.nodeSize / 2,
      },
    });

    await Vue.nextTick();
    await Vue.nextTick();
    expect(Event.prototype.preventDefault).toHaveBeenCalledTimes(1);
  });

  it("does not call addNode if data in dataTransfer is not set", () => {
    const { wrapper, addNodeMock } = doMount();
    const dummyEvent = {
      clientX: 0,
      clientY: 1,
      dataTransfer: {
        dropEffect: "",
        types: ["text/plain"],
        getData: vi.fn().mockReturnValue(null),
      },
    };

    wrapper.trigger("drop", dummyEvent);

    expect(addNodeMock).not.toHaveBeenCalledWith(expect.anything(), {
      nodeFactory: { className: "sampleClassName" },
      position: {
        x: -10 + dummyEvent.clientX - $shapes.nodeSize / 2,
        y: -10 + dummyEvent.clientY - $shapes.nodeSize / 2,
      },
    });
  });

  it("does not allow drag and drop in write-protected workflow", () => {
    const { wrapper, dummyEvent, addNodeMock } = doMount({ isWritable: false });

    wrapper.trigger("dragover", dummyEvent);
    expect(dummyEvent.dataTransfer.dropEffect).toBe("");

    wrapper.trigger("drop", dummyEvent);
    expect(addNodeMock).not.toHaveBeenCalled();
    expect(Event.prototype.preventDefault).toHaveBeenCalledTimes(1);
  });
});
