import { beforeEach, describe, expect, it } from "vitest";

/* eslint-disable dot-notation */

import {
  checkPortCompatibility,
  detectConnectionCircle,
} from "../compatibleConnections";

describe("detectConnectionCircle", () => {
  let workflow;

  beforeEach(() => {
    workflow = {
      /**
       * A ----== C ----- E
       *      |       |
       * B ----       --- D
       */
      info: {
        containerType: "workflow",
      },
      nodes: {
        A: {
          inPorts: [{ connectedVia: [] }],
          outPorts: [{ connectedVia: ["AC"] }],
        },
        B: {
          inPorts: [{ connectedVia: [] }],
          outPorts: [{ connectedVia: ["BC"] }],
        },
        C: {
          inPorts: [{ connectedVia: ["AC"] }, { connectedVia: ["BC"] }],
          outPorts: [{ connectedVia: ["CE", "CD"] }],
        },
        D: {
          inPorts: [{ connectedVia: ["CD"] }],
          outPorts: [{ connectedVia: [] }],
        },
        E: {
          inPorts: [{ connectedVia: ["CE"] }],
          outPorts: [{ connectedVia: [] }],
        },
      },
      connections: {
        AC: {
          sourceNode: "A",
          destNode: "C",
        },
        BC: {
          sourceNode: "B",
          destNode: "C",
        },
        CE: {
          sourceNode: "C",
          destNode: "E",
        },
        CD: {
          sourceNode: "C",
          destNode: "D",
        },
      },
    };
  });

  it.each([
    ["A", ["B", "C", "D", "E"]],
    ["B", ["A", "C", "D", "E"]],
    ["C", ["D", "E"]],
    ["D", ["E"]],
    ["E", ["D"]],
  ])("downstream Connection from %s", (startNode, result) => {
    let compatibleNodes = detectConnectionCircle({
      startNode,
      downstreamConnection: true,
      workflow,
    });
    expect([...compatibleNodes]).toStrictEqual(result);
  });

  it.each([
    ["E", ["A", "B", "C", "D"]],
    ["D", ["A", "B", "C", "E"]],
    ["C", ["A", "B"]],
    ["B", ["A"]],
    ["A", ["B"]],
  ])("upstream Connection from %s", (startNode, result) => {
    let compatibleNodes = detectConnectionCircle({
      startNode,
      downstreamConnection: false,
      workflow,
    });
    expect([...compatibleNodes]).toStrictEqual(result);
  });

  describe("metanodes", () => {
    beforeEach(() => {
      workflow.info.containerType = "metanode";
      workflow.info.containerId = "metanode";

      /** |                            |
       *  |   - A ----== C ----- E -   |
       *  |>-|       |       |      |-<|
       *  |   - B ---        --- D -   |
       */
      workflow.connections = {
        ...workflow.connections,
        ">A": {
          sourceNode: "metanode",
          destNode: "A",
        },
        ">B": {
          sourceNode: "metanode",
          destNode: "B",
        },
        "E<": {
          sourceNode: "E",
          destNode: "metanode",
        },
        "D<": {
          sourceNode: "D",
          destNode: "metanode",
        },
      };
      workflow.nodes["A"].inPorts[0].connectedVia.push(">A");
      workflow.nodes["B"].inPorts[0].connectedVia.push(">B");
      workflow.nodes["E"].outPorts[0].connectedVia.push("E<");
      workflow.nodes["D"].outPorts[0].connectedVia.push("D<");
    });

    it.each(["A", "B", "C", "D", "E"])(
      "metanode ports not part of Set for %s",
      (startNode) => {
        let compatibleNodes = detectConnectionCircle({
          startNode,
          downstreamConnection: false,
          workflow,
        });
        expect([...compatibleNodes].includes("metanode")).toBe(false);
      },
    );

    it.each([true, false])(
      "all nodes can connect to metanode bar: downstreamConnection %s",
      (downstreamConnection) => {
        let compatibleNodes = detectConnectionCircle({
          startNode: "metanode",
          downstreamConnection,
          workflow,
        });
        expect([...compatibleNodes]).toStrictEqual(["A", "B", "C", "D", "E"]);
      },
    );
  });
});

describe("Port Compatibility", () => {
  let fromPort, toPort, availablePortTypes;

  beforeEach(() => {
    fromPort = {
      canRemove: false,
      connectedVia: ["root:11_1"],
      index: 1,
      name: "Spark Context",
      typeId:
        "org.knime.bigdata.spark.core.port.context.SparkContextPortObject",
    };
    toPort = {
      canRemove: false,
      connectedVia: ["root:11_1"],
      index: 1,
      name: "Spark context to destroy",
      optional: false,
      typeId:
        "org.knime.bigdata.spark.core.port.context.SparkContextPortObject",
    };

    availablePortTypes = {
      "org.knime.bigdata.spark.core.port.context.SparkContextPortObject": {
        color: "#9B9B9B",
        compatibleTypes: [
          "org.knime.bigdata.spark.core.port.context.SparkContextPortObject",
        ],
        kind: "other",
        name: "Spark Context (legacy com)",
      },
    };
  });

  it("checks compatible ports", () => {
    expect(
      checkPortCompatibility({ fromPort, toPort, availablePortTypes }),
    ).toBeTruthy();

    // matching typeIds should still result in compatibility
    availablePortTypes[
      "org.knime.bigdata.spark.core.port.context.SparkContextPortObject"
    ].compatibleTypes = ["not.compatible.type"];

    expect(
      checkPortCompatibility({ fromPort, toPort, availablePortTypes }),
    ).toBeTruthy();
  });
});
