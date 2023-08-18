import type { XY } from "@/api/gateway-api/generated-api";
import { useConnectorPosition } from "@/composables/useConnectorPosition";
import { useStore } from "@/composables/useStore";
import { computed, type Ref } from "vue";
import type { PathSegment } from "./types";
import { getBendpointId } from "@/util/connectorUtil";

type UseConnectorPathSegmentsOptions = {
  id: string;
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
  absolutePoint: Ref<[number, number]>;

  bendpoints: Ref<Array<XY>>;
};

export const useConnectorPathSegments = (
  options: UseConnectorPathSegmentsOptions,
) => {
  const store = useStore();
  const isDragging = computed(() => store.state.workflow.isDragging);
  const movePreviewDelta = computed(
    () => store.state.workflow.movePreviewDelta,
  );
  const isNodeSelected = computed(
    () => store.getters["selection/isNodeSelected"],
  );
  const isBendpointSelected = computed(
    () => store.getters["selection/isBendpointSelected"],
  );

  const { start: startSegmentPosition, end: endSegmentPosition } =
    useConnectorPosition(options);

  const pathSegments = computed(() => {
    let x1 = startSegmentPosition.value.x;
    let y1 = startSegmentPosition.value.y;
    let x2 = endSegmentPosition.value.x;
    let y2 = endSegmentPosition.value.y;

    // Update position of source or destination node is being moved
    if (isDragging.value) {
      if (isNodeSelected.value(options.sourceNode.value)) {
        x1 += movePreviewDelta.value.x;
        y1 += movePreviewDelta.value.y;
      }
      if (isNodeSelected.value(options.destNode.value)) {
        x2 += movePreviewDelta.value.x;
        y2 += movePreviewDelta.value.y;
      }
    }

    // when there are no bendpoints or we have an absolutePoint means we should
    // treat this connector as a single unsegmented path
    if (options.bendpoints.value.length === 0 || options.absolutePoint.value) {
      return [
        {
          isStart: true,
          isEnd: true,
          start: { x: x1, y: y1 },
          end: { x: x2, y: y2 },
        },
      ];
    }

    // include the "start" and "end" coordinates as points
    const allPoints: Array<XY> = [
      { x: x1, y: y1 },
      ...options.bendpoints.value,
      { x: x2, y: y2 },
    ];

    const segments: Array<PathSegment> = [];
    // then create all the segments in-between those points
    for (let i = 0; i < allPoints.length - 1; i++) {
      const isStart = i === 0;
      const isEnd = i + 1 === allPoints.length - 1;

      const start = allPoints[i];
      const end = allPoints[i + 1];

      // when a given bendpoint is being dragged,
      // we need to adjust the "start" of the current path segment's position
      const startWithDelta: XY =
        !isStart && isBendpointSelected.value(getBendpointId(options.id, i - 1))
          ? {
              x: start.x + movePreviewDelta.value.x,
              y: start.y + movePreviewDelta.value.y,
            }
          : start;

      // and we also need to adjust the "end" of the previous path segment
      const endWithDelta: XY =
        !isEnd && isBendpointSelected.value(getBendpointId(options.id, i))
          ? {
              x: end.x + movePreviewDelta.value.x,
              y: end.y + movePreviewDelta.value.y,
            }
          : end;

      segments.push({
        start: startWithDelta,
        end: endWithDelta,
        isStart,
        isEnd,
      });
    }

    return segments;
  });

  return { pathSegments, startSegmentPosition, endSegmentPosition };
};
