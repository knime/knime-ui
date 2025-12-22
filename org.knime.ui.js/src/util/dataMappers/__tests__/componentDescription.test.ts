import { describe, expect, it } from "vitest";

import {
  createAvailablePortTypes,
  createComponentNodeDescription,
} from "@/test/factories";
import { componentDescription } from "../componentDescription";

describe("componentDescription data mapper", () => {
  it("adds port information to the component description", () => {
    const availablePortTypes = createAvailablePortTypes();
    const data = createComponentNodeDescription();
    const result =
      componentDescription.toComponentNodeDescriptionWithExtendedPorts(
        availablePortTypes,
      )(data);
    expect(result).toStrictEqual({
      description: {
        contentType: "text/html",
        value: "<p>Awesome description</p>",
      },
      inPorts: [
        {
          color: "#FF4B4B",
          description: "No description available",
          kind: "flowVariable",
          name: "Port 1",
          optional: false,
          type: "flowVariable",
          typeId:
            "org.knime.core.node.port.flowvariable.FlowVariablePortObject",
          typeName: "Flow Variable",
          views: {
            descriptorMapping: {
              configured: [0, 2],
              executed: [1, 2],
            },
            descriptors: [
              {
                isSpecView: true,
                label: "Flow variables",
              },
              {
                label: "Flow variables",
              },
              {
                label: "Statistics",
              },
            ],
          },
        },
        {
          color: "#9B9B9B",
          description: "No description available",
          kind: "generic",
          name: "Port 2",
          optional: false,
          type: "generic",
          typeId: "org.knime.core.node.port.PortObject",
          typeName: "Generic Port",
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
      metadataType: "component",
      name: "Component",
      outPorts: [
        {
          color: "#000000",
          description: "No description available",
          kind: "table",
          name: "Port 1",
          optional: false,
          type: "table",
          typeId: "org.knime.core.node.BufferedDataTable",
          typeName: "Table",
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
          color: "#000000",
          description: "No description available",
          kind: "table",
          name: "Port 2",
          optional: false,
          type: "table",
          typeId: "org.knime.core.node.BufferedDataTable",
          typeName: "Table",
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
    });
  });
});
