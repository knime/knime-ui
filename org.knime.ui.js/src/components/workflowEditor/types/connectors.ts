import type { Connection, XY } from "@/api/gateway-api/generated-api";

export type PathSegment = {
  start: XY;
  end: XY;
  isStart?: boolean;
  isEnd?: boolean;
};

export type AbsolutePointXY = XY | null;
export type AbsolutePointTuple = [number, number] | null;
type AbsolutePoint = AbsolutePointTuple | AbsolutePointXY;

export type ConnectorProps<TAbsolutePoint extends AbsolutePoint> = Omit<
  Connection,
  "sourceNode" | "sourcePort" | "destNode" | "destPort"
> & {
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
  absolutePoint?: TAbsolutePoint;
  /**
   * Whether the connector can be interacted with or not
   */
  interactive?: boolean;
};

export type ConnectorPathSegmentProps = {
  connectionId: string;
  segment: PathSegment;
  isFlowvariableConnection: boolean;
  isHighlighted: boolean;
  isDraggedOver: boolean;
  suggestDelete: boolean;
  isConnectionHovered: boolean;
  index: number;
  isLastSegment: boolean;
  isReadonly?: boolean;
  isSelected?: boolean;
  interactive?: boolean;
  streaming?: boolean;
};

export type ConnectorBendpointProps = {
  position: XY;
  connectionId: string;
  index: number;
  isFlowVariableConnection: boolean;
  isSelected: boolean;
  isDragging: boolean;
  interactive?: boolean;
  virtual?: boolean;
  isVisible?: boolean;
};
