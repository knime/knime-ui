import { type Ref, computed } from "vue";
import { storeToRefs } from "pinia";

import type { XY } from "@/api/gateway-api/generated-api";
import { useConnectorPosition } from "@/composables/useConnectorPosition";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { geometry } from "@/util/geometry";
import { getBezier } from "../../util/connectorPath";

type UseConnectorCullingOptions = {
  /**
   * Node ID of the connector's source node
   */
  sourceNode: Ref<string | null>;
  /**
   * Node ID of the connector's target node
   */
  destNode: Ref<string | null>;
  /**
   * Index of the source node's output port that this connector is attached to
   */
  sourcePort: Ref<number | null>;
  /**
   * Index of the target node's input port that this connector is attached to
   */
  destPort: Ref<number | null>;
  /**
   * If either destNode or sourceNode is unspecified the connector will be drawn up to this point
   */
  absolutePoint: Ref<[number, number] | null>;
};

const getBoundingBox = (start: XY, ctrl1: XY, ctrl2: XY, end: XY) => {
  const minX = Math.min(start.x, ctrl1.x, ctrl2.x, end.x);
  const maxX = Math.max(start.x, ctrl1.x, ctrl2.x, end.x);
  const minY = Math.min(start.y, ctrl1.y, ctrl2.y, end.y);
  const maxY = Math.max(start.y, ctrl1.y, ctrl2.y, end.y);

  return {
    left: minX,
    top: minY,
    width: maxX - minX,
    // make sure height is at least 1, otherwise it'd be 0 for straight lines
    height: Math.max(maxY - minY, 1),
  };
};

export const useConnectorCulling = (options: UseConnectorCullingOptions) => {
  const { visibleArea } = storeToRefs(useWebGLCanvasStore());

  // use a connector without bendpoints by just creating a bezier from start to end
  const { start, end } = useConnectorPosition(options);

  const boundingBox = computed(() => {
    const bezier = getBezier(
      start.value.x,
      start.value.y,
      end.value.x,
      end.value.y,
    );

    return getBoundingBox(
      bezier.start,
      bezier.control1,
      bezier.control2,
      bezier.end,
    );
  });

  // the connector will be culled based on a simple intersection check between
  // the visible area of the WF and an AABB that was created based on the points of the
  // bezier curve that describe the connector
  const renderable = computed(() => {
    const intersect = geometry.utils.rectangleIntersection(boundingBox.value, {
      left: visibleArea.value.x,
      top: visibleArea.value.y,
      width: visibleArea.value.width,
      height: visibleArea.value.height,
    });

    return Boolean(intersect);
  });

  return { renderable };
};
