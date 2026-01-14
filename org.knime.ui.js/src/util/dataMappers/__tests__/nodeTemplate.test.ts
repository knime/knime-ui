import { describe, expect, it } from "vitest";

import { createAvailablePortTypes, createNodeTemplate } from "@/test/factories";
import { nodeTemplate } from "../nodeTemplate";

describe("nodeTemplate data mapper", () => {
  it("extends the port information in a NodeTemplate", () => {
    const availablePortTypes = createAvailablePortTypes();
    const nodeTemplateData = createNodeTemplate();

    const result =
      nodeTemplate.toNodeTemplateWithExtendedPorts(availablePortTypes)(
        nodeTemplateData,
      );
    expect(result).toStrictEqual({
      component: false,
      icon: "data:image/png;base64,xxx",
      id: "org.knime.base.node.preproc.filter.column.DataColumnSpecFilterNodeFactory",
      inPorts: [
        {
          color: "#000000",
          description: "No description available",
          kind: "table",
          name: "Table",
          optional: false,
          type: "table",
          typeId: "org.knime.core.node.BufferedDataTable",
          views: {
            descriptorMapping: {
              configured: [0, 2],
              executed: [1, 2],
            },
            descriptors: [
              {
                isSpecView: true,
                label: "Table",
              },
              {
                label: "Table",
              },
              {
                label: "Statistics",
              },
            ],
          },
        },
      ],
      name: "Column Filter",
      nodeFactory: {
        className:
          "org.knime.base.node.preproc.filter.column.DataColumnSpecFilterNodeFactory",
      },
      outPorts: [
        {
          color: "#000000",
          description: "No description available",
          kind: "table",
          name: "Table",
          optional: false,
          type: "table",
          typeId: "org.knime.core.node.BufferedDataTable",
          views: {
            descriptorMapping: {
              configured: [0, 2],
              executed: [1, 2],
            },
            descriptors: [
              {
                isSpecView: true,
                label: "Table",
              },
              {
                label: "Table",
              },
              {
                label: "Statistics",
              },
            ],
          },
        },
        {
          color: "#FF4B4B",
          description: "No description available",
          kind: "other",
          name: "Table",
          optional: false,
          type: "other",
          typeId: "org.some.otherPorType",
          views: {
            descriptorMapping: {
              configured: [0, 2],
              executed: [1, 2],
            },
            descriptors: [
              {
                isSpecView: true,
                label: "Table",
              },
              {
                label: "Table",
              },
              {
                label: "Statistics",
              },
            ],
          },
        },
      ],
      type: "Manipulator",
    });
  });
});
