import { afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  createComponentNode,
  createMetanode,
  createNativeNode,
  createWorkflow,
} from "@/test/factories";
import "../worker";

describe("worker", () => {
  let messages: any[] = [];

  beforeAll(() => {
    window.postMessage = (msg) => {
      if (msg) {
        messages.push(msg);
      }
    };
  });

  afterEach(() => {
    messages = [];
  });

  describe("find nearest object", () => {
    const node1 = createNativeNode({
      id: "root:1",
      position: { x: 10, y: 5 },
    });
    const node2 = createComponentNode({
      id: "root:2",
      position: { x: 25, y: 10 },
    });
    const node3 = createMetanode({
      id: "root:3",
      position: { x: 2, y: 15 },
    });
    const node4 = createMetanode({
      id: "root:4",
      position: { x: 10, y: 80 },
    });
    const node5 = createMetanode({
      id: "root:5",
      position: { x: 10, y: -10 },
    });
    const node6 = createMetanode({
      id: "root:6",
      position: { x: -10, y: 5 },
    });
    const node7 = createMetanode({
      id: "root:7",
      position: { x: -10, y: -10 },
    });

    const workflow = createWorkflow({
      nodes: {
        [node1.id]: node1,
        [node2.id]: node2,
        [node3.id]: node3,
        [node4.id]: node4,
        [node5.id]: node5,
        [node6.id]: node6,
        [node7.id]: node7,
      },
      workflowAnnotations: Object.create([]),
    });

    it.each([
      // starting from root:1
      ["root:1", "top", { id: node1.id, ...node1.position }, "root:5"],
      ["root:1", "right", { id: node1.id, ...node1.position }, "root:2"],
      ["root:1", "bottom", { id: node1.id, ...node1.position }, "root:3"],
      ["root:1", "left", { id: node1.id, ...node1.position }, "root:6"],

      // starting from root:2
      ["root:2", "top", { id: node2.id, ...node2.position }, "root:5"],
      ["root:2", "right", { id: node2.id, ...node2.position }, undefined],
      ["root:2", "bottom", { id: node2.id, ...node2.position }, "root:4"],
      ["root:2", "left", { id: node2.id, ...node2.position }, "root:1"],

      // starting from root:3
      ["root:3", "top", { id: node3.id, ...node3.position }, "root:1"],
      ["root:3", "right", { id: node3.id, ...node3.position }, "root:2"],
      ["root:3", "bottom", { id: node3.id, ...node3.position }, "root:4"],
      ["root:3", "left", { id: node3.id, ...node3.position }, "root:6"],

      // starting from root:6
      ["root:6", "top", { id: node6.id, ...node6.position }, "root:7"],
      ["root:6", "right", { id: node6.id, ...node6.position }, "root:3"],
      ["root:6", "bottom", { id: node6.id, ...node6.position }, "root:4"],
      ["root:6", "left", { id: node6.id, ...node6.position }, undefined],
    ])(
      "should find nearest object from reference %s in direction: %s",
      (_, direction, reference, expectedId) => {
        const sendMessage = () => {
          const payload = {
            data: {
              type: "nearest",
              payload: {
                workflow,
                reference,
                direction,
              },
            },
          };

          // @ts-expect-error
          self.onmessage(payload);
        };

        sendMessage();

        expect(messages.at(-1)?.id).toBe(expectedId);
      },
    );
  });

  it("should find nodes", () => {
    const workflow = createWorkflow({
      workflowAnnotations: Object.create([]),
    });

    const sendMessage = (reference: { id: string; x: number; y: number }) => {
      const payload = {
        data: {
          type: "nearest",
          payload: {
            workflow,
            reference,
            direction: "right",
          },
        },
      };

      // @ts-expect-error
      self.onmessage(payload);
    };

    sendMessage({
      id: "root:2",
      x: 40,
      y: 10,
    });

    expect(messages.at(-1).id).toBe("root:3");
    expect(messages.at(-1).type).toBe("node");
  });

  it("should find annotation", () => {
    const workflow = createWorkflow();

    // @ts-expect-error
    self.onmessage({
      data: {
        type: "nearest",
        payload: {
          workflow,
          reference: {
            id: "root:3",
            x: 0,
            y: 10,
          },
          direction: "top",
        },
      },
    });

    expect(messages.at(0).id).toBe("annotation:1");
    expect(messages.at(0).type).toBe("annotation");
  });

  it("should ignore invalid messages", () => {
    // @ts-expect-error
    self.onmessage({ foo: "bar" });

    expect(messages.at(0)).toBe("UNKNOWN MESSAGE EVENT");
  });
});
