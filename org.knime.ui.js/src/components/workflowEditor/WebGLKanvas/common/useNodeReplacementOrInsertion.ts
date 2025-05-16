/* eslint-disable no-undefined */
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import throttle from "raf-throttle";

import type {
  Connection,
  NodeFactoryKey,
  NodePort,
  XY,
} from "@/api/gateway-api/generated-api";
import { useApplicationStore } from "@/store/application/application";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useNodeTemplatesStore } from "@/store/nodeTemplates/nodeTemplates";
import { useMovingStore } from "@/store/workflow/moving";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { getToastPresets } from "@/toastPresets";
import { checkPortCompatibility } from "@/util/compatibleConnections";
import { isNodeMetaNode } from "@/util/nodeUtil";
import {
  type PortPositions,
  usePortPositions,
} from "../../common/usePortPositions";

import { useNodeCollisionCheck } from "./useNodeCollisionCheck";

type PortContext = {
  inPorts: Array<{ typeId: string }>;
  outPorts: Array<{ typeId: string }>;
};

const canInsertOnConnection = (
  connection: Connection,
  portsOnReplacementNode: PortContext,
): boolean => {
  if (connection.allowedActions?.canDelete === false) {
    return false;
  }

  const { availablePortTypes } = useApplicationStore();
  const nodeInteractionsStore = useNodeInteractionsStore();
  const connectionSourceNode = nodeInteractionsStore.getNodeById(
    connection.sourceNode,
  )!;
  const connectionDestNode = nodeInteractionsStore.getNodeById(
    connection.destNode,
  )!;

  const hasCompatibleSrcPort = portsOnReplacementNode.inPorts.some((toPort) =>
    checkPortCompatibility({
      fromPort: connectionSourceNode.outPorts[connection.sourcePort],
      toPort,
      availablePortTypes,
    }),
  );

  const hasCompatibleDestPort = portsOnReplacementNode.outPorts.some(
    (fromPort) =>
      checkPortCompatibility({
        fromPort,
        toPort: connectionDestNode.inPorts[connection.destPort],
        availablePortTypes,
      }),
  );

  return Boolean(hasCompatibleSrcPort || hasCompatibleDestPort);
};

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

const canCreateMagneticConnection = (
  connection: Connection,
  dragPosition: XY,
) => {
  const { availablePortTypes } = useApplicationStore();
  const nodeInteractionsStore = useNodeInteractionsStore();

  const connectionSourceNode = nodeInteractionsStore.getNodeById(
    connection.sourceNode,
  );

  const connectionDestNode = nodeInteractionsStore.getNodeById(
    connection.destNode,
  );

  if (!connectionSourceNode || !connectionDestNode) {
    return { sourceOutPort: undefined, destInPort: undefined };
  }

  const { portPositions: sourceNodePortPositions } = usePortPositions({
    nodeId: connectionSourceNode.id,
    canAddPort: computed(() => ({ input: false, output: false })),
  });

  const snapPartitions = buildSnapPartitions(sourceNodePortPositions.value).out;
  const relativeY = dragPosition.y - connectionSourceNode.position.y;

  const maxDistance = Math.max(50, connectionSourceNode.outPorts.length * 9);

  if (!snapPartitions || Math.abs(relativeY) >= maxDistance) {
    return { sourceOutPort: undefined, destInPort: undefined };
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
    snapPortIndex = sourceNodePortPositions.value.out.length - 1;
  } else {
    // port index matches partition index
    snapPortIndex = partitionIndex;
  }

  for (const sourceOutPort of connectionSourceNode.outPorts) {
    if (
      (!isNodeMetaNode(connectionSourceNode) && sourceOutPort.index === 0) ||
      sourceOutPort.index < snapPortIndex
    ) {
      continue;
    }

    for (const destInPort of connectionDestNode.inPorts) {
      if (!isNodeMetaNode(connectionDestNode) && sourceOutPort.index === 0) {
        continue;
      }

      const isCompatible = checkPortCompatibility({
        fromPort: sourceOutPort,
        toPort: destInPort,
        availablePortTypes,
      });

      if (isCompatible) {
        return { sourceOutPort, destInPort };
      }
    }
  }

  return { sourceOutPort: undefined, destInPort: undefined };
};

type ReplacementPayload =
  | {
      type: "from-node-instance";
      replacementNodeId: string;
    }
  | {
      type: "from-node-template";
      nodeFactory: NodeFactoryKey;
    };

const getPortsOnReplacementCandidate = async (
  params: ReplacementPayload,
): Promise<PortContext | null> => {
  if (params.type === "from-node-instance") {
    const node = useNodeInteractionsStore().getNodeById(
      params.replacementNodeId,
    );

    return node
      ? {
          inPorts: node.inPorts.map((p: NodePort) => ({ typeId: p.typeId })),
          outPorts: node.outPorts.map((p: NodePort) => ({ typeId: p.typeId })),
        }
      : null;
  }

  if (params.type === "from-node-template") {
    // awaited but should resolve immediately because node template is already cached
    // since you can't drag a node template if it wasn't loaded before
    const nodeTemplate = await useNodeTemplatesStore().getSingleNodeTemplate({
      nodeTemplateId: params.nodeFactory.className,
    });

    if (!nodeTemplate) {
      return null;
    }

    const { inPorts = [], outPorts = [] } = nodeTemplate;

    return {
      inPorts: inPorts.map(({ typeId }) => ({ typeId })),
      outPorts: outPorts.map(({ typeId }) => ({ typeId })),
    };
  }

  return null;
};

const MAGNETIC_CONNECTION_ID = "magnetic__connection";

// keep the dragging state as a singleton outside the composable,
// because the interaction of the drag can start from a different place
// than the handling of a move or a drop (e.g node repository)
const isDragging = ref(false);

/**
 * Composable that handles node replacement and node insertion operations.
 * Both of these operations can be initiated from a node that is:
 * - Already in the canvas
 * - Coming from the node repository
 *
 * Additionally, the operations as defined as:
 *
 * **Replacement**:
 * This refers to the interaction of dropping a node `A` on top of another node `B` with
 * the intent of replacing `B` with `A`.
 *
 * **Insertion**:
 * This refers to the interaction of dropping a node `A` on a connection between nodes `B` and `C`, with the
 * intent of placing `A` in-between `B` and `C`.
 */
export const useNodeReplacementOrInsertion = () => {
  const { collisionChecker } = useNodeCollisionCheck();
  const { toastPresets } = getToastPresets();

  const nodeInteractionsStore = useNodeInteractionsStore();
  const { replacementOperation } = storeToRefs(nodeInteractionsStore);
  const { activeWorkflow } = storeToRefs(useWorkflowStore());
  const connections = computed(() => activeWorkflow.value!.connections);
  const { hasAbortedDrag, dragInitiatorId } = storeToRefs(useMovingStore());

  const canvasStore = useWebGLCanvasStore();
  const { pixiApplication } = storeToRefs(canvasStore);

  const tryFindConnectorAtPosition = (position: XY): string | undefined => {
    if (!pixiApplication.value) {
      return undefined;
    }

    const foundObject = canvasStore.findObjectFromScreenCordinates(position);

    if (
      foundObject &&
      foundObject.label.startsWith("ConnectorPathSegmentHoverArea__")
    ) {
      const connectionId = foundObject.label.replace(
        "ConnectorPathSegmentHoverArea__",
        "",
      );
      return connectionId;
    }

    return undefined;
  };

  const clearState = () => {
    replacementOperation.value = null;
    delete activeWorkflow.value!.connections[MAGNETIC_CONNECTION_ID];
  };

  const onDragStart = () => {
    isDragging.value = true;
    collisionChecker.init();
  };

  const onDragMove = throttle(
    async (position: XY, params: ReplacementPayload) => {
      if (!isDragging.value) {
        return;
      }

      // favor node detection first, since it's more efficient
      // and has a larger detection zone
      const nodeCandidateId = collisionChecker.check({
        id:
          params.type === "from-node-instance"
            ? params.replacementNodeId
            : params.nodeFactory.className,
        position,
      });

      if (nodeCandidateId && dragInitiatorId.value) {
        const magneticConnection: Connection = {
          allowedActions: { canDelete: false },
          destNode: dragInitiatorId.value,
          destPort: -Infinity, // unknown yet
          id: MAGNETIC_CONNECTION_ID,
          sourceNode: nodeCandidateId,
          sourcePort: -Infinity, // unknown yet
          flowVariableConnection: true,
        };

        const { sourceOutPort, destInPort } = canCreateMagneticConnection(
          magneticConnection,
          position,
        );

        if (sourceOutPort && destInPort) {
          activeWorkflow.value!.connections[MAGNETIC_CONNECTION_ID] = {
            ...magneticConnection,
            destPort: destInPort.index,
            sourcePort: sourceOutPort.index,
          };

          return;
        }
      }

      // if (nodeCandidateId) {
      //   replacementOperation.value = {
      //     candidateId: nodeCandidateId,
      //     type: "node",
      //   };
      //   return;
      // }

      const connectionCandidateId = tryFindConnectorAtPosition(position);
      const connection = connections.value[connectionCandidateId ?? ""];

      if (connectionCandidateId && connection) {
        const ports = await getPortsOnReplacementCandidate(params);

        replacementOperation.value =
          ports && canInsertOnConnection(connection, ports)
            ? { candidateId: connectionCandidateId, type: "connection" }
            : null;

        return;
      }

      // unset any previous value if current move didn't detect anything
      clearState();
    },
  );

  const doNodeReplacement = async (
    targetNodeId: string,
    params: ReplacementPayload,
  ) => {
    const replacementNodeId =
      params.type === "from-node-instance"
        ? params.replacementNodeId
        : undefined;

    const nodeFactory =
      params.type === "from-node-template" ? params.nodeFactory : undefined;

    try {
      await nodeInteractionsStore.replaceNode({
        targetNodeId,
        replacementNodeId,
        nodeFactory,
      });

      return { wasReplaced: true };
    } catch (error) {
      consola.error("Failed to replace node", { error });
      toastPresets.workflow.replacementOperation.replaceNode({ error });
      return { wasReplaced: false };
    } finally {
      clearState();
    }
  };

  const doNodeInsertion = async (
    connectionId: string,
    position: XY,
    params: ReplacementPayload,
  ) => {
    const replacementNodeId =
      params.type === "from-node-instance"
        ? params.replacementNodeId
        : undefined;

    const nodeFactory =
      params.type === "from-node-template" ? params.nodeFactory : undefined;

    const connection = connections.value[connectionId];
    const ports = await getPortsOnReplacementCandidate(params);

    if (!ports || !canInsertOnConnection(connection, ports)) {
      return Promise.resolve({ wasReplaced: false });
    }

    try {
      await nodeInteractionsStore.insertNode({
        connectionId,
        nodeId: replacementNodeId,
        position,
        nodeFactory,
      });
      return { wasReplaced: true };
    } catch (error) {
      consola.error("Failed to insert node on connection", { error });
      toastPresets.workflow.replacementOperation.insertOnConnection({
        error,
      });
      return { wasReplaced: false };
    } finally {
      clearState();
    }
  };

  const onDrop = (dropPosition: XY, params: ReplacementPayload) => {
    if (hasAbortedDrag.value) {
      clearState();
      return Promise.resolve({ wasReplaced: false });
    }

    if (!replacementOperation.value) {
      return Promise.resolve({ wasReplaced: false });
    }

    try {
      if (replacementOperation.value.type === "node") {
        return doNodeReplacement(
          replacementOperation.value.candidateId,
          params,
        );
      } else {
        return doNodeInsertion(
          replacementOperation.value.candidateId,
          dropPosition,
          params,
        );
      }
    } finally {
      // update the drag state in raf so that it's in sync with the move handler
      // which is throttled
      requestAnimationFrame(() => (isDragging.value = false));
    }
  };

  return { onDragStart, onDragMove, onDrop };
};
