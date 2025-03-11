/* eslint-disable no-undefined */
import { computed, ref } from "vue";
import type { Ref } from "vue";
import { storeToRefs } from "pinia";
import throttle from "raf-throttle";

import type { KnimeNode, NodePortGroups } from "@/api/custom-types";
import type { NodePort, XY } from "@/api/gateway-api/generated-api";
import type { PortPositions } from "@/components/workflowEditor/common/usePortPositions";
import { useApplicationStore } from "@/store/application/application";
import { useWorkflowStore } from "@/store/workflow/workflow";
import * as $shapes from "@/style/shapes";
import {
  type Direction,
  checkCompatibleConnectionAndPort,
  generateValidPortGroupsForPlaceholderPort,
} from "@/util/compatibleConnections";
import { isNativeNode } from "@/util/nodeUtil";

import {
  type FloatingConnector,
  type SnapTarget,
  type SnappedPlaceholderPort,
} from "./types";
import { usePortSnappingEventPublisher } from "./usePortSnappingEventPublisher";

/**
 * Builds snap partitions based on the port positions of a node. For example,
 * imagine the node below with 2 input connectors. The snap partitions will define
 * coordinates in the Y axis (described by the =) which represent values that, when
 * crossed over by a mouse movement, indicate a change to another partition and thus
 * a new port that can be selected as a target for snapping.
 *
 * ===|¯¯¯¯¯¯¯¯¯|
 *  |>|         |
 * ===|         |
 *  |>|_________|
 */
const buildSnapPartitions = (referencePositions: PortPositions) => {
  const makePartitions = (positions: number[]): number[] | null => {
    if (!positions.length) {
      return null;
    }

    const partitions: number[] = [];
    for (let i = 0; i < positions.length - 1; i++) {
      partitions.push((positions[i] + positions[i + 1]) / 2);
    }
    return partitions;
  };

  const partitions: {
    in: number[] | null;
    out: number[] | null;
  } = {
    in: null,
    out: null,
  };

  if (referencePositions.in) {
    partitions.in = makePartitions(referencePositions.in.map(([, y]) => y));
  }

  if (referencePositions.out) {
    partitions.out = makePartitions(referencePositions.out.map(([, y]) => y));
  }

  return partitions;
};

export const usePortSnapping = (options: {
  /**
   * Reference to the current state of the floating drag connector; if any
   */
  floatingConnector: Ref<FloatingConnector | undefined>;
  /**
   * Absolute coordinates of the mouse cursor as the connector is dragged.
   *
   * An independent value is needed (aside from the floatingConnector.absolutePoint)
   * because a connection snap will enforce unchanging coordinates on the
   * `floatingConnector.absolutePoint` property (aka a "snap"), which means we wouldn't
   * receive mouse movement updates and thus leaving the connector in a permanent snap
   */
  pointerMoveAbsoluteCoords: Ref<XY | undefined>;
}) => {
  const { activeWorkflow } = storeToRefs(useWorkflowStore());
  const { availablePortTypes } = storeToRefs(useApplicationStore());
  const connections = computed(() => activeWorkflow.value!.connections);
  const { floatingConnector, pointerMoveAbsoluteCoords } = options;

  /**
   * For a given port match and determine whether a snap can happen
   * based on port compatibility checks.
   *
   * Additionally, in the case of a dynamic connection attempt
   * (aka connecting to an optional port), this function  will return the
   * possibly valid port groups (if any) that can be connected to, depending on
   * the connection source and the target node's optional port groups.
   */
  const shouldPortSnap = ({
    sourcePort,
    targetPort,
    targetPortDirection,
    targetPortGroups,
  }: {
    sourcePort: NodePort;
    targetPort: NodePort | { isPlaceHolderPort: true };
    targetPortDirection: Direction;
    targetPortGroups: NodePortGroups | null;
  }) => {
    let isCompatible: boolean = false;
    let validPortGroups: NodePortGroups | null = null;

    if ("isPlaceHolderPort" in targetPort) {
      validPortGroups = generateValidPortGroupsForPlaceholderPort({
        fromPort: sourcePort,
        availablePortTypes: availablePortTypes.value,
        targetPortDirection,
        targetPortGroups,
      });
      isCompatible = validPortGroups !== null;
    } else {
      isCompatible = checkCompatibleConnectionAndPort({
        fromPort: sourcePort,
        toPort: targetPort,
        availablePortTypes: availablePortTypes.value,
        targetPortDirection,
        connections: connections.value,
      });
    }

    return { isCompatible, validPortGroups };
  };

  let lastHitTarget:
    | {
        node: KnimeNode;
        targetPortDirection: Direction;
        snapIndex: number;
      }
    | undefined;

  type ConnectionSnapCandidateDetails = {
    referenceNode: KnimeNode;
    parentNodePortPositions: PortPositions;
  };

  const activeSnapPosition = ref<XY>();
  const snapTarget = ref<SnapTarget | undefined>();
  const didDragToCompatibleTarget = computed(() => Boolean(snapTarget.value));
  const isInsideSnapRegion = ref(false);

  const resetState = () => {
    lastHitTarget = undefined;
    activeSnapPosition.value = undefined;
    snapTarget.value = undefined;
    consola.debug("floatingConnector::usePortSnapping - resetting snap state");
  };

  const isOutsideConnectorHoverRegion = (
    x: number,
    y: number,
    targetPortDirection: Direction,
  ) => {
    const upperBound = -15;

    return (
      y < upperBound ||
      (targetPortDirection === "in" && x > $shapes.nodeSize) ||
      (targetPortDirection === "out" && x < 0)
    );
  };

  /**
   * Function that evaluates a port connection snap candidate (e.g: a node or metanode portbar)
   * based on the position of the global drag connector, the node ports, etc.
   * This function will determine whether the user's mouse movement over a candidate's
   * hover area will produce a snap interaction as it approaches a snap target.
   */
  const onMoveOverConnectionSnapCandidate = throttle(
    (details: ConnectionSnapCandidateDetails) => {
      if (!floatingConnector.value || !pointerMoveAbsoluteCoords.value) {
        return;
      }

      consola.debug("Enter connection snap candidate", details);
      isInsideSnapRegion.value = true;

      const targetPortDirection =
        floatingConnector.value.context.origin === "out" ? "in" : "out";
      const { referenceNode, parentNodePortPositions } = details;

      const { position: nodePosition } = referenceNode;

      const snapPartitions = buildSnapPartitions(parentNodePortPositions)[
        targetPortDirection
      ];

      const portPositions = parentNodePortPositions[targetPortDirection];

      // no port, no snap. assumes partitions don't change while dragging connector
      if (!snapPartitions) {
        return;
      }

      // find mouse position relative to container position on workflow
      const relativeX = pointerMoveAbsoluteCoords.value.x - nodePosition.x;
      const relativeY = pointerMoveAbsoluteCoords.value.y - nodePosition.y;

      // leave snapped state when leaving hover area
      if (
        isOutsideConnectorHoverRegion(relativeX, relativeY, targetPortDirection)
      ) {
        resetState();
        return;
      }

      // find index of port to snap to
      const partitionIndex = snapPartitions.findIndex(
        (boundary) => relativeY <= boundary,
      );

      let snapPortIndex: number;

      if (snapPartitions.length === 0) {
        // only one port
        snapPortIndex = 0;
      } else if (partitionIndex === -1) {
        // below last partition boundary, select last port
        snapPortIndex = portPositions.length - 1;
      } else {
        // port index matches partition index
        snapPortIndex = partitionIndex;
      }

      const [relPortX, relPortY] = portPositions[snapPortIndex];
      const absolutePortPosition: XY = {
        x: relPortX + nodePosition.x,
        y: relPortY + nodePosition.y,
      };

      const possibleTargetPorts = referenceNode[`${targetPortDirection}Ports`];

      let targetPortCandidate: NodePort | { isPlaceHolderPort: true };

      // If the snapPortIndex is smaller than the port list then a regular port is being targeted,
      // otherwise it’s most likely the placeholder port that is being targeted
      if (snapPortIndex < possibleTargetPorts.length) {
        targetPortCandidate = possibleTargetPorts[snapPortIndex];
      } else {
        targetPortCandidate = { isPlaceHolderPort: true };
      }

      const { isCompatible, validPortGroups } = shouldPortSnap({
        sourcePort: floatingConnector.value.context.portInstance,
        targetPort: targetPortCandidate,
        targetPortDirection,
        targetPortGroups: isNativeNode(referenceNode)
          ? referenceNode.portGroups ?? null
          : null,
      });

      const maybeNextSnapTarget: SnapTarget =
        "isPlaceHolderPort" in targetPortCandidate
          ? ({
              isPlaceHolderPort: true,
              validPortGroups,
              typeId: floatingConnector.value.context.portInstance.typeId,
              parentNodeId: referenceNode.id,
              side: targetPortDirection,
            } satisfies SnappedPlaceholderPort)
          : ({
              ...targetPortCandidate,
              parentNodeId: referenceNode.id,
              side: targetPortDirection,
            } satisfies SnapTarget);

      // skip needless updates if already on the same target
      // (e.g: same node, direction and snapIndex -- there has been no change)
      if (
        lastHitTarget &&
        lastHitTarget.node.id === referenceNode.id &&
        lastHitTarget.targetPortDirection === targetPortDirection &&
        lastHitTarget.snapIndex === snapPortIndex
      ) {
        return;
      }

      if (!isCompatible) {
        resetState();
        return;
      }

      // if a compatible target was found, then a new snap position is set, which
      // will override the absolutePoint of the floatingConnector and thus make it "snap"
      activeSnapPosition.value = { ...absolutePortPosition };

      lastHitTarget = {
        node: referenceNode,
        targetPortDirection,
        snapIndex: snapPortIndex,
      };

      consola.debug(
        "floatingConnector::usePortSnapping - setting snap target",
        { snapTarget: maybeNextSnapTarget },
      );
      snapTarget.value = maybeNextSnapTarget;
    },
  );

  /**
   * Function that indicates that a snap connection candidate (e.g: a node or metanode portbar)
   * is now not hovered anymore by the user and thus cannot be considered anymore.
   */
  const onLeaveConnectionSnapCandidate = throttle(
    (details: ConnectionSnapCandidateDetails) => {
      consola.debug("Leaving connection snap candidate", details);

      resetState();
      // only reset when completely leaving snap region
      isInsideSnapRegion.value = false;
    },
  );

  usePortSnappingEventPublisher(snapTarget);

  return {
    isInsideSnapRegion,
    activeSnapPosition,
    didDragToCompatibleTarget,
    snapTarget,
    onMoveOverConnectionSnapCandidate,
    onLeaveConnectionSnapCandidate,
    resetSnappingState: resetState,
  };
};
