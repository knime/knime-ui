import type { Bounds, XY } from "@/api/gateway-api/generated-api";

export const createXY = (data: Partial<XY>): XY => ({ x: 0, y: 0, ...data });
export const createBounds = (data: Partial<Bounds>): Bounds => ({
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  ...data,
});

export const PORT_TYPE_IDS = {
  FlowVariablePortObject:
    "org.knime.core.node.port.flowvariable.FlowVariablePortObject",
  WorkflowPortObject: "org.knime.core.node.workflow.capture.WorkflowPortObject",
  URIPortObject: "org.knime.core.data.uri.URIPortObject",
  DBSessionPortObject: "org.knime.database.port.DBSessionPortObject",
  DBDataPortObject: "org.knime.database.port.DBDataPortObject",
  FileSystemPortObject: "org.knime.filehandling.core.port.FileSystemPortObject",
  DatabaseConnectionPortObject:
    "org.knime.core.node.port.database.DatabaseConnectionPortObject",
  DatabasePortObject: "org.knime.core.node.port.database.DatabasePortObject",
  NormalizerPortObject: "org.knime.base.data.normalize.NormalizerPortObject",
  BufferedDataTable: "org.knime.core.node.BufferedDataTable",
  PortObject: "org.knime.core.node.port.PortObject",
  ImagePortObject: "org.knime.core.node.port.image.ImagePortObject",
} as const;

type DefinedTypeId = (typeof PORT_TYPE_IDS)[keyof typeof PORT_TYPE_IDS];

export type PortTypeId = DefinedTypeId | Omit<string, DefinedTypeId>;
