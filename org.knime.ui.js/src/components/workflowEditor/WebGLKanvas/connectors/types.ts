import type { Connection, XY } from "@/api/gateway-api/generated-api";

export type PathSegment = {
  start: XY;
  end: XY;
  isStart?: boolean;
  isEnd?: boolean;
};

export interface ConnectorProps
  extends Omit<
    Connection,
    "sourceNode" | "sourcePort" | "destNode" | "destPort"
  > {
  /**
   * Node ID of the connector's source node
   */
  sourceNode?: string | null;
  /**
   * Index of the source node's output port that this connector is attached to
   */
  sourcePort?: number | null;
  /**
   * Node ID of the connector's target node
   */
  destNode?: string | null;
  /**
   * Index of the target node's input port that this connector is attached to
   */
  destPort?: number | null;
  /**
   * If either destNode or sourceNode is unspecified the connector will be drawn up to this point
   */
  absolutePoint?: XY | null;
  /**
   * Whether the connector can be interacted with or not
   */
  interactive?: boolean;
}

export type BezierPoints = {
  start: XY;
  control1: XY;
  control2: XY;
  end: XY;
};
