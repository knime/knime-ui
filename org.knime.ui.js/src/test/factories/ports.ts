import { merge } from "lodash-es";

import type { AvailablePortTypes } from "@/api/custom-types";
import {
  MetaNodePort,
  PortType,
  type NodePort,
  type PortGroup,
  type PortViews,
} from "@/api/gateway-api/generated-api";

import { randomValue } from "./util";
import { PORT_TYPE_IDS, type PortTypeId } from "./common";

export const createPortViews = (data: Partial<PortViews> = {}): PortViews => {
  return merge(
    {
      descriptors: [
        { label: "Table", isSpecView: true },
        { label: "Table" },
        { label: "Statistics" },
      ],
      descriptorMapping: {
        configured: [0, 2],
        executed: [1, 2],
      },
    },
    data,
  );
};

export const createPortType = (data: Partial<PortType> = {}): PortType => {
  return merge(
    {
      kind: PortType.KindEnum.Table,
      name: "Table",
      color: "#000000",
      views: createPortViews(data.views ?? {}),
    },
    data,
  );
};

export const createAvailablePortTypes = (
  data: Partial<AvailablePortTypes> = {},
): AvailablePortTypes => {
  const base: AvailablePortTypes = {
    [PORT_TYPE_IDS.BufferedDataTable]: createPortType(),
    [PORT_TYPE_IDS.FlowVariablePortObject]: createPortType({
      color: "#FF4B4B",
      kind: PortType.KindEnum.FlowVariable,
      name: "Flow Variable",
      views: createPortViews({
        descriptors: [
          { label: "Flow variables", isSpecView: true },
          { label: "Flow variables" },
        ],
        descriptorMapping: {
          configured: [0],
          executed: [1],
        },
      }),
    }),
    [PORT_TYPE_IDS.PortObject]: createPortType({
      kind: PortType.KindEnum.Generic,
      name: "Generic",
      color: "#9B9B9B",
    }),
    [PORT_TYPE_IDS.DatabaseConnectionPortObject]: createPortType({
      kind: PortType.KindEnum.Other,
      name: "Database Connection",
      color: "#FF4B4B",
      compatibleTypes: [PORT_TYPE_IDS.DatabasePortObject],
    }),
    "org.some.otherPorType": createPortType({
      kind: PortType.KindEnum.Other,
      name: "Some other port type",
      color: "#FF4B4B",
    }),
  };

  return merge(base, data);
};

export const createPort = (
  data: Partial<NodePort & { typeId: PortTypeId }> = {},
): NodePort => {
  return {
    index: 0,
    typeId: randomValue(Object.values(PORT_TYPE_IDS)),
    canRemove: true,
    connectedVia: [],
    inactive: false,
    info: "",
    name: "",
    optional: false,
    portContentVersion: 123,
    portGroupId: "",

    ...data,
  };
};

export const createMetanodePort = (
  data: Partial<MetaNodePort & { typeId: PortTypeId }> = {},
): MetaNodePort => {
  const port = createPort(data);
  return {
    ...port,
    nodeState: MetaNodePort.NodeStateEnum.CONFIGURED,

    ...data,
  };
};

export const createPortGroup = (data: Partial<PortGroup> = {}): PortGroup => {
  return {
    canAddInPort: true,
    canAddOutPort: true,
    inputRange: [],
    outputRange: [],
    supportedPortTypeIds: [],

    ...data,
  };
};
