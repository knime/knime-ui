import {
  MetaNodePort,
  type NodePort,
  type PortGroup,
} from "@/api/gateway-api/generated-api";

import { randomValue } from "./util";

const PORT_TYPE_IDS = [
  "org.knime.core.node.port.flowvariable.FlowVariablePortObject",
  "org.knime.core.node.workflow.capture.WorkflowPortObject",
  "org.knime.core.data.uri.URIPortObject",
  "org.knime.database.port.DBSessionPortObject",
  "org.knime.database.port.DBDataPortObject",
  "org.knime.filehandling.core.port.FileSystemPortObject",
  "org.knime.core.node.port.database.DatabaseConnectionPortObject",
  "org.knime.core.node.port.database.DatabasePortObject",
  "org.knime.base.data.normalize.NormalizerPortObject",
  "org.knime.core.node.BufferedDataTable",
  "org.knime.core.node.port.PortObject",
  "org.knime.core.node.port.image.ImagePortObject",
] as const;

type PortTypeIds =
  | (typeof PORT_TYPE_IDS)[number]
  | Omit<string, (typeof PORT_TYPE_IDS)[number]>;

export const createPort = (
  data: Partial<NodePort & { typeId: PortTypeIds }>
): NodePort => {
  return {
    index: 0,
    typeId: randomValue(PORT_TYPE_IDS),
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
  data: Partial<MetaNodePort>
): MetaNodePort => {
  const port = createPort(data);
  return {
    ...port,
    nodeState: MetaNodePort.NodeStateEnum.CONFIGURED,

    ...data,
  };
};

export const createPortGroup = (data: Partial<PortGroup>): PortGroup => {
  return {
    canAddInPort: true,
    canAddOutPort: true,
    inputRange: [],
    outputRange: [],
    supportedPortTypeIds: [],

    ...data,
  };
};
