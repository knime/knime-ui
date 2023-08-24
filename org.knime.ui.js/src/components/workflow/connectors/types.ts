import type { Connection, XY } from "@/api/gateway-api/generated-api";

export type PathSegment = {
  start: XY;
  end: XY;
  isStart?: boolean;
  isEnd?: boolean;
};

export interface ConnectorProps extends Connection {
  /**
   * If either destNode or sourceNode is unspecified the connector will be drawn up to this point
   */
  absolutePoint?: [number, number];
  /**
   * Whether the connector can be interacted with or not
   */
  interactive?: boolean;
}
