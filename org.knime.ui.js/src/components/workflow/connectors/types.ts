import type { XY } from "@/api/gateway-api/generated-api";

export type PathSegment = {
  start: XY;
  end: XY;
  isStart?: boolean;
  isEnd?: boolean;
};
