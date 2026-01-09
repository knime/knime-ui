import { beforeEach, describe, expect, it } from "vitest";

import { port } from "../port";

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
      port.checkCompatibility({
        fromPort,
        toPort,
        availablePortTypes,
      }),
    ).toBeTruthy();

    // matching typeIds should still result in compatibility
    availablePortTypes[
      "org.knime.bigdata.spark.core.port.context.SparkContextPortObject"
    ].compatibleTypes = ["not.compatible.type"];

    expect(
      port.checkCompatibility({
        fromPort,
        toPort,
        availablePortTypes,
      }),
    ).toBeTruthy();
  });
});
