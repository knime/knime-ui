import { type Ref, computed } from "vue";
import { storeToRefs } from "pinia";

import type { NodePort, XY } from "@/api/gateway-api/generated-api";
import { useConnectorPosition } from "@/composables/useConnectorPosition";
import { useSelectionStore } from "@/store/selection";
import { useConnectionInteractionsStore } from "@/store/workflow/connectionInteractions";
import { useMovingStore } from "@/store/workflow/moving";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { getBendpointId } from "@/util/connectorUtil";
import type { PathSegment } from "../types";

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
  absolutePoint: Ref<[number, number] | null>;

  bendpoints: Ref<Array<XY>>;
};

export const useConnectorPathSegments = (
  options: UseConnectorPathSegmentsOptions,
) => {
  const { movePreviewDelta } = storeToRefs(useMovingStore());
  const selectionStore = useSelectionStore();
  const { isMetaNodePortBarSelected, isNodeSelected, isBendpointSelected } =
    selectionStore;
  const { activeWorkflow } = storeToRefs(useWorkflowStore());

  const virtualBendpoints = computed(
    () => useConnectionInteractionsStore().virtualBendpoints[options.id] ?? {},
  );

  const totalVirtualBendpoints = computed(
    () => Object.keys(virtualBendpoints.value).length,
  );

  const hasVirtualBendpoints = computed(() => totalVirtualBendpoints.value > 0);

  const isConnectedToConnectionId = (
    ports: NodePort[] | undefined,
    id: string,
  ) =>
    ports &&
    ports.length > 0 &&
    ports.find((port) => port.connectedVia.includes(id));

  const isMetanodeInPortBarConnection = computed(() =>
    isConnectedToConnectionId(
      activeWorkflow.value!.metaInPorts?.ports,
      options.id,
    ),
  );
  const isMetanodeOutPortBarConnection = computed(() =>
    isConnectedToConnectionId(
      activeWorkflow.value!.metaOutPorts?.ports,
      options.id,
    ),
  );

  const { start: startSegmentPosition, end: endSegmentPosition } =
    useConnectorPosition(options);

  const isSourceNodeSelected = computed(() =>
    isNodeSelected(options.sourceNode.value ?? ""),
  );
  const isDestNodeSelected = computed(() =>
    isNodeSelected(options.destNode.value ?? ""),
  );

  const needToUpdateSourcePosition = computed(() => {
    return (
      isSourceNodeSelected.value ||
      (isMetanodeInPortBarConnection.value && isMetaNodePortBarSelected("in"))
    );
  });

  const needToUpdateDestPosition = computed(() => {
    return (
      isDestNodeSelected.value ||
      (isMetanodeOutPortBarConnection.value && isMetaNodePortBarSelected("out"))
    );
  });

  const pathSegments = computed(() => {
    let startX = startSegmentPosition.value.x;
    let startY = startSegmentPosition.value.y;
    let endX = endSegmentPosition.value.x;
    let endY = endSegmentPosition.value.y;

    if (needToUpdateSourcePosition.value) {
      startX += movePreviewDelta.value.x;
      startY += movePreviewDelta.value.y;
    }
    if (needToUpdateDestPosition.value) {
      endX += movePreviewDelta.value.x;
      endY += movePreviewDelta.value.y;
    }

    // when there are no bendpoints or we have an absolutePoint means we should
    // treat this connector as a single unsegmented path
    if (
      (options.bendpoints.value.length === 0 && !hasVirtualBendpoints.value) ||
      options.absolutePoint.value
    ) {
      return [
        {
          isStart: true,
          isEnd: true,
          start: { x: startX, y: startY },
          end: { x: endX, y: endY },
        },
      ];
    }

    // include the "start" and "end" coordinates as points
    const allPoints: Array<XY & { virtual?: boolean }> = [
      // add "start" coordinate point
      { x: startX, y: startY },

      // add all the points in-between:
      // (1) Consider all real bendpoints (BP) + virtual bendpoints (VBP) (the ones being added)
      ...Array(options.bendpoints.value.length + totalVirtualBendpoints.value)
        .fill(null)
        .flatMap((_, index) => {
          const bendpoint = options.bendpoints.value.at(index)!;
          const virtualBendpoint = virtualBendpoints.value[index];

          // (2) if the current index does not have a VBP associated with it
          // then it's only the BP we need to consider as a point
          if (!virtualBendpoint) {
            return [bendpoint];
          }

          // (3) here we do have a VBP but we still need to make sure that the
          // total amount of BPs matches the one the VBP was aware of at the time it
          // was created. If the amount differs, this means a new and real BP has
          // already been added and so this VBP is now stale and should not be considered
          const shouldAddVirtual =
            virtualBendpoint.currentBendpointCount ===
            options.bendpoints.value.length;

          const result: Array<XY & { virtual?: boolean }> = [
            // @ts-expect-error - because null will be removed by the .filter(Boolean) call
            shouldAddVirtual
              ? { x: virtualBendpoint.x, y: virtualBendpoint.y, virtual: true }
              : null,

            // we always consider the real BP, but only after we add a virtual one.
            // Note that this iteration could go beyond the total amount of BPs
            // (e.g there were no BPs but we're creating one via a VBP)
            // so the `bendpoint` variable could be undefined
            bendpoint,
          ];

          return result;
        })
        .filter(Boolean),

      // add "end" coordinate point
      { x: endX, y: endY },
    ];

    const shouldAddTranslationDelta = (
      bendpointIndex: number,
      isVirtual: boolean,
      isStartOrEnd: boolean,
    ) => {
      const bendpointId = getBendpointId(options.id, bendpointIndex);

      const isSelectedOrVirtual = isBendpointSelected(bendpointId) || isVirtual;

      // translation delta is only added for segments that are NOT the first or last
      // and only if the bendpoint is selected or if it's virtual
      // (since those cannot be selected because they're not real)
      return !isStartOrEnd && isSelectedOrVirtual;
    };

    const segments: Array<PathSegment> = [];
    // create all the segments in-between all the reference points
    for (let i = 0; i < allPoints.length - 1; i++) {
      const isStartSegment = i === 0;
      const isEndSegment = i + 1 === allPoints.length - 1;

      const start = allPoints[i];
      const end = allPoints[i + 1];

      // When a given bendpoint is being dragged:
      // (1) we need to adjust the "start" of the current path segment's position
      // if it's connected to the bendpoint that's being dragged
      const startWithDelta: XY = shouldAddTranslationDelta(
        i - 1,
        Boolean(start.virtual),
        isStartSegment,
      )
        ? {
            x: start.x + movePreviewDelta.value.x,
            y: start.y + movePreviewDelta.value.y,
          }
        : start;

      // (2) and we need to also adjust the "end" of the current path segment
      // if it's connected to the bendpoint that's being dragged
      const endWithDelta: XY = shouldAddTranslationDelta(
        i,
        Boolean(end.virtual),
        isEndSegment,
      )
        ? {
            x: end.x + movePreviewDelta.value.x,
            y: end.y + movePreviewDelta.value.y,
          }
        : end;

      segments.push({
        start: startWithDelta,
        end: endWithDelta,
        isStart: isStartSegment,
        isEnd: isEndSegment,
      });
    }

    return segments;
  });

  return { pathSegments, startSegmentPosition, endSegmentPosition };
};
