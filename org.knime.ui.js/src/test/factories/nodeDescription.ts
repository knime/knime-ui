import { merge } from "lodash-es";

import type { ComponentNodeDescription } from "@/api/custom-types";
import {
  type NativeNodeDescription,
  TypedText,
} from "@/api/gateway-api/generated-api";

import { PORT_TYPE_IDS } from "./common";

export const createNativeNodeDescription = (
  data?: Partial<NativeNodeDescription>,
): NativeNodeDescription => {
  const base: NativeNodeDescription = {
    description: "This is a node.",
    inPorts: [{ typeId: "org.knime.core.node.BufferedDataTable" }],
    outPorts: [],
    dynamicInPortGroupDescriptions: [
      {
        name: "table",
        identifier: "inGroupName",
        supportedPortTypes: [
          { typeId: "org.knime.core.node.BufferedDataTable" },
        ],
      },
    ],
    dynamicOutPortGroupDescriptions: [
      {
        name: "table",
        identifier: "outGroupName",
        description: "This is the description",
        supportedPortTypes: [
          { typeId: "org.knime.core.node.BufferedDataTable" },
        ],
      },
    ],
  };

  return merge(base, data);
};

export const createComponentNodeDescription = (
  data?: Partial<ComponentNodeDescription>,
): ComponentNodeDescription => {
  const base: ComponentNodeDescription = {
    name: "Component",
    description: {
      value: "<p>Awesome description</p>",
      contentType: TypedText.ContentTypeEnum.Html,
    },
    inPorts: [
      {
        name: "Port 1",
        typeName: "Flow Variable",
        typeId: PORT_TYPE_IDS.FlowVariablePortObject,
        optional: false,
      },
      {
        name: "Port 2",
        typeName: "Generic Port",
        typeId: PORT_TYPE_IDS.PortObject,
        optional: false,
      },
    ],
    outPorts: [
      {
        name: "Port 1",
        typeName: "Table",
        typeId: PORT_TYPE_IDS.BufferedDataTable,
        description: "No description available",
        optional: false,
      },
      {
        name: "Port 2",
        typeName: "Table",
        typeId: PORT_TYPE_IDS.BufferedDataTable,
        optional: false,
      },
    ],
  };

  return merge(base, data);
};
