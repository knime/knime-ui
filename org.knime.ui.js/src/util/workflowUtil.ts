import type { Bounds } from "@/api/gateway-api/generated-api";
import { metaNodeBarWidth } from "@/style/shapes";

export const mergePortBarBounds = (
  originalBounds: Bounds | null,
  calculatedBounds: Bounds,
) => ({
  ...(originalBounds ?? calculatedBounds),
  width: metaNodeBarWidth,
});
