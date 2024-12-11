import { describe, expect, it } from "vitest";

import {
  createConnection,
  createNativeNode,
  createWorkflow,
  createWorkflowAnnotation,
} from "@/test/factories";
import { findObjectsForSelection } from "../findObjectsForSelection";

describe("findObjectsForSelection", () => {
  const setup = () => {
    const workflow = createWorkflow({
      nodes: {
        "up-left": createNativeNode({
          id: "up-left",
          position: {
            x: 0,
            y: 0,
          },
        }),
        "down-left": createNativeNode({
          id: "down-left",
          position: {
            x: 0,
            y: 50,
          },
        }),
        "down-right": createNativeNode({
          id: "down-right",
          position: {
            x: 50,
            y: 50,
          },
        }),
        "up-right": createNativeNode({
          id: "up-right",
          position: {
            x: 50,
            y: 0,
          },
        }),
      },
      connections: {
        connection1: createConnection({
          id: "connection1",
          bendpoints: [
            { x: 10, y: 0 },
            { x: 100, y: 0 },
          ],
        }),
      },
      workflowAnnotations: [
        createWorkflowAnnotation({
          id: "ann1",
          bounds: {
            x: 50,
            y: 0,
            width: 10,
            height: 10,
          },
        }),
        createWorkflowAnnotation({
          id: "ann2",
          bounds: {
            x: 0,
            y: 50,
            width: 10,
            height: 10,
          },
        }),
        createWorkflowAnnotation({
          id: "ann3",
          bounds: {
            x: 50,
            y: 50,
            width: 10,
            height: 10,
          },
        }),
      ],
    });

    return { workflow };
  };

  it("include all from outside", () => {
    const p1 = { x: -5, y: -5 }; // node size + 1 off
    const p2 = { x: 75, y: 75 }; // node position - 1 off
    const { workflow } = setup();

    // forwards
    expect(
      findObjectsForSelection({ startPos: p1, endPos: p2, workflow }),
    ).toEqual(
      expect.objectContaining({
        nodesInside: ["up-left", "down-left", "down-right", "up-right"],
        nodesOutside: [],
        annotationsInside: ["ann1", "ann2", "ann3"],
        annotationsOutside: [],
        bendpointsInside: ["connection1__0"],
        bendpointsOutside: ["connection1__1"],
      }),
    );

    // backwards
    expect(
      findObjectsForSelection({ startPos: p2, endPos: p1, workflow }),
    ).toEqual(
      expect.objectContaining({
        nodesInside: ["up-left", "down-left", "down-right", "up-right"],
        nodesOutside: [],
        annotationsInside: ["ann1", "ann2", "ann3"],
        annotationsOutside: [],
        bendpointsInside: ["connection1__0"],
        bendpointsOutside: ["connection1__1"],
      }),
    );
  });

  it("exclude all by 1 px", () => {
    const p1 = { x: 33, y: 33 }; // node size + 1 off
    const p2 = { x: 49, y: 49 }; // node position - 1 off
    const { workflow } = setup();

    // forwards
    expect(
      findObjectsForSelection({ startPos: p1, endPos: p2, workflow }),
    ).toEqual(
      expect.objectContaining({
        nodesInside: [],
        nodesOutside: ["up-left", "down-left", "down-right", "up-right"],
        annotationsInside: [],
        annotationsOutside: ["ann1", "ann2", "ann3"],
        bendpointsInside: [],
        bendpointsOutside: ["connection1__0", "connection1__1"],
      }),
    );

    // backwards
    expect(
      findObjectsForSelection({ startPos: p2, endPos: p1, workflow }),
    ).toEqual(
      expect.objectContaining({
        nodesInside: [],
        nodesOutside: ["up-left", "down-left", "down-right", "up-right"],
        annotationsInside: [],
        annotationsOutside: ["ann1", "ann2", "ann3"],
        bendpointsInside: [],
        bendpointsOutside: ["connection1__0", "connection1__1"],
      }),
    );
  });

  it("include all by 1 px", () => {
    const p1 = { x: 32, y: 32 }; // node size + 1 off
    const p2 = { x: 50, y: 50 }; // node position - 1 off
    const { workflow } = setup();

    // forwards
    expect(
      findObjectsForSelection({ startPos: p1, endPos: p2, workflow }),
    ).toEqual(
      expect.objectContaining({
        nodesInside: ["up-left", "down-left", "down-right", "up-right"],
        nodesOutside: [],
        annotationsInside: ["ann3"],
        annotationsOutside: ["ann1", "ann2"],
        bendpointsInside: [],
        bendpointsOutside: ["connection1__0", "connection1__1"],
      }),
    );

    // backwards
    expect(
      findObjectsForSelection({ startPos: p2, endPos: p1, workflow }),
    ).toEqual(
      expect.objectContaining({
        nodesInside: ["up-left", "down-left", "down-right", "up-right"],
        nodesOutside: [],
        annotationsInside: ["ann3"],
        annotationsOutside: ["ann1", "ann2"],
        bendpointsInside: [],
        bendpointsOutside: ["connection1__0", "connection1__1"],
      }),
    );
  });

  it("excludes annotation that the selection started in", () => {
    const p1 = { x: 51, y: 1 }; // annotation + 1 off
    const p2 = { x: 54, y: 8 }; // annotation - 1 off
    const { workflow } = setup();

    // forwards
    expect(
      findObjectsForSelection({ startPos: p1, endPos: p2, workflow }),
    ).toEqual(
      expect.objectContaining({
        nodesInside: ["up-right"],
        nodesOutside: ["up-left", "down-left", "down-right"],
        annotationsInside: [],
        annotationsOutside: ["ann1", "ann2", "ann3"],
      }),
    );

    // backwards
    expect(
      findObjectsForSelection({ startPos: p2, endPos: p1, workflow }),
    ).toEqual(
      expect.objectContaining({
        nodesInside: ["up-right"],
        nodesOutside: ["up-left", "down-left", "down-right"],
        annotationsInside: [],
        annotationsOutside: ["ann1", "ann2", "ann3"],
      }),
    );
  });
});
