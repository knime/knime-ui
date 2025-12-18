import { describe, expect, it } from "vitest";

import { PORT_TYPE_IDS, createAvailablePortTypes } from "@/test/factories";
import { ports } from "../ports";

describe("ports data mapper", () => {
  const availablePortTypes = createAvailablePortTypes();

  it("maps to extended port from a single typeId string", () => {
    const typeId = PORT_TYPE_IDS.BufferedDataTable;

    const result = ports.toExtendedPortObject(availablePortTypes)(typeId);
    expect(result).toStrictEqual({
      color: "#000000",
      description: "No description available",
      kind: "table",
      name: "Table",
      type: "table",
      typeId: "org.knime.core.node.BufferedDataTable",
      views: {
        descriptorMapping: {
          configured: [0, 2],
          executed: [1, 2],
        },
        descriptors: [
          { isSpecView: true, label: "Table" },
          { label: "Table" },
          { label: "Statistics" },
        ],
      },
    });
  });

  it("maps to extended port from an object containint a typeId string property", () => {
    const typeId = PORT_TYPE_IDS.BufferedDataTable;

    const result = ports.toExtendedPortObject(availablePortTypes)({ typeId });
    expect(result).toStrictEqual({
      color: "#000000",
      description: "No description available",
      kind: "table",
      name: "Table",
      type: "table",
      typeId: "org.knime.core.node.BufferedDataTable",
      views: {
        descriptorMapping: {
          configured: [0, 2],
          executed: [1, 2],
        },
        descriptors: [
          { isSpecView: true, label: "Table" },
          { label: "Table" },
          { label: "Statistics" },
        ],
      },
    });
  });

  it("can exclude the `type` property", () => {
    const typeId = PORT_TYPE_IDS.BufferedDataTable;

    const result = ports.toExtendedPortObject(
      availablePortTypes,
      false,
    )({ typeId });

    expect(result).toStrictEqual({
      color: "#000000",
      description: "No description available",
      kind: "table",
      name: "Table",
      typeId: "org.knime.core.node.BufferedDataTable",
      views: {
        descriptorMapping: {
          configured: [0, 2],
          executed: [1, 2],
        },
        descriptors: [
          { isSpecView: true, label: "Table" },
          { label: "Table" },
          { label: "Statistics" },
        ],
      },
    });
  });
});
