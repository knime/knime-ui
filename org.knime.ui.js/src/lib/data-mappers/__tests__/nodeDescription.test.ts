import { describe, expect, it } from "vitest";

import {
  createAvailablePortTypes,
  createNativeNodeDescription,
} from "@/test/factories";
import { nodeDescription } from "../nodeDescription";

describe("nodeDescription data mapper", () => {
  it("adds port information to the NativeNode description", () => {
    const availablePortTypes = createAvailablePortTypes();
    const data = createNativeNodeDescription();
    const result =
      nodeDescription.toNativeNodeDescriptionWithExtendedPorts(
        availablePortTypes,
      )(data);

    expect(result).toStrictEqual({
      description: "This is a node.",
      dynInPorts: [
        {
          groupDescription: "No description available",
          groupName: "inGroupName",
          types: [
            {
              color: "#000000",
              description: "No description available",
              kind: "table",
              name: "Table",
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
        },
      ],
      dynOutPorts: [
        {
          groupDescription: "This is the description",
          groupName: "outGroupName",
          types: [
            {
              color: "#000000",
              description: "No description available",
              kind: "table",
              name: "Table",
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
        },
      ],
      dynamicInPortGroupDescriptions: [
        {
          identifier: "inGroupName",
          name: "table",
          supportedPortTypes: [
            {
              typeId: "org.knime.core.node.BufferedDataTable",
            },
          ],
        },
      ],
      dynamicOutPortGroupDescriptions: [
        {
          description: "This is the description",
          identifier: "outGroupName",
          name: "table",
          supportedPortTypes: [
            {
              typeId: "org.knime.core.node.BufferedDataTable",
            },
          ],
        },
      ],
      inPorts: [
        {
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
      outPorts: [],
    });
  });
});
