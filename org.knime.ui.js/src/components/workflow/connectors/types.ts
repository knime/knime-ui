import type { XY } from "@/api/gateway-api/generated-api";

export type PathSegment = {
  start: XY;
  end: XY;
  isStart?: boolean;
  isEnd?: boolean;
};

export interface ConnectorProps {
  /**
   * Connector id
   */
  id: string;
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
  absolutePoint?: [number, number];
  /**
   * Determines whether the connection can be deleted
   */
  allowedActions: { canDelete: boolean };
  /**
   * Determines whether this connector is streamed at the moment
   */
  streaming?: boolean;
  /**
   * Determines whether this connector is rendered in alternative color
   */
  flowVariableConnection?: boolean;
  /**
   * Whether the connector can be interacted with or not
   */
  interactive?: boolean;
  /**
   * List of coordinates of this connector's bendpoints
   */
  bendpoints?: Array<XY>;
}
