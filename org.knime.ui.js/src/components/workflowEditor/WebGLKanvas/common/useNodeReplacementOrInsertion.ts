/* eslint-disable no-undefined */
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import throttle from "raf-throttle";

import type { Connection, NodePort, XY } from "@/api/gateway-api/generated-api";
import type {
  ComponentNodeTemplateWithExtendedPorts,
  NodeTemplateWithExtendedPorts,
} from "@/lib/data-mappers";
import { workflowDomain } from "@/lib/workflow-domain";
import { getToastPresets } from "@/services/toastPresets";
import { useApplicationStore } from "@/store/application/application";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useMovingStore } from "@/store/workflow/moving";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";

import { pixiGlobals } from "./pixiGlobals";
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
    workflowDomain.port.checkCompatibility({
      fromPort: connectionSourceNode.outPorts[connection.sourcePort],
      toPort,
      availablePortTypes,
    }),
  );

  const hasCompatibleDestPort = portsOnReplacementNode.outPorts.some(
    (fromPort) =>
      workflowDomain.port.checkCompatibility({
        fromPort,
        toPort: connectionDestNode.inPorts[connection.destPort],
        availablePortTypes,
      }),
  );

  return Boolean(hasCompatibleSrcPort || hasCompatibleDestPort);
};

type ReplacementPayload =
  | { type: "from-node-instance"; replacementNodeId: string }
  | { type: "from-node-template"; nodeTemplate: NodeTemplateWithExtendedPorts }
  | {
      type: "from-component-template";
      componentTemplate: ComponentNodeTemplateWithExtendedPorts;
    };

const getPortsOnReplacementCandidate = (
  params: ReplacementPayload,
): PortContext => {
  if (params.type === "from-node-instance") {
    const node = useNodeInteractionsStore().getNodeById(
      params.replacementNodeId,
    );

    if (!node) {
      throw new Error("Invalid state, replacement node id is not defined");
    }

    return {
      inPorts: node.inPorts.map((p: NodePort) => ({ typeId: p.typeId })),
      outPorts: node.outPorts.map((p: NodePort) => ({ typeId: p.typeId })),
    };
  }

  const template =
    params.type === "from-node-template"
      ? params.nodeTemplate
      : params.componentTemplate;

  return {
    inPorts: template.inPorts,
    outPorts: template.outPorts,
  };
};

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
  const { activeWorkflow, isWritable } = storeToRefs(useWorkflowStore());
  const connections = computed(() => activeWorkflow.value!.connections);
  const { hasAbortedDrag } = storeToRefs(useMovingStore());

  const canvasStore = useWebGLCanvasStore();

  const tryFindConnectorAtPosition = (position: XY): string | undefined => {
    if (!pixiGlobals.hasApplicationInstance()) {
      return undefined;
    }

    const foundObject = canvasStore.findObjectFromScreenCoordinates(position);

    if (foundObject?.label?.startsWith("ConnectorPathSegmentHoverArea__")) {
      const connectionId = foundObject.label.replace(
        "ConnectorPathSegmentHoverArea__",
        "",
      );
      return connectionId;
    }

    return undefined;
  };

  const onDragStart = () => {
    if (!isWritable.value) {
      isDragging.value = false;
      return;
    }

    isDragging.value = true;
    collisionChecker.init();
  };

  const onDragMove = throttle((position: XY, params: ReplacementPayload) => {
    if (
      !isDragging.value ||
      !isWritable.value ||
      nodeInteractionsStore.isNodeConnected(
        params.type === "from-node-instance" ? params.replacementNodeId : "",
      )
    ) {
      return;
    }

    const id = (() => {
      if (params.type === "from-node-instance") {
        return params.replacementNodeId;
      }

      if (params.type === "from-node-template") {
        return params.nodeTemplate.nodeFactory!.className;
      }

      return params.componentTemplate.id;
    })();

    // favor node detection first, since it's more efficient
    // and has a larger detection zone
    const nodeCandidateId = collisionChecker.check({
      id,
      position,
    });

    if (nodeCandidateId) {
      replacementOperation.value = {
        candidateId: nodeCandidateId,
        type: "node",
      };
      return;
    }

    const connectionCandidateId = tryFindConnectorAtPosition(position);
    const connection = connections.value[connectionCandidateId ?? ""];

    if (connectionCandidateId && connection) {
      const ports = getPortsOnReplacementCandidate(params);
      replacementOperation.value = canInsertOnConnection(connection, ports)
        ? { candidateId: connectionCandidateId, type: "connection" }
        : null;

      return;
    }

    // unset any previous value if current move didn't detect anything
    replacementOperation.value = null;
  });

  const doNodeReplacement = async (
    targetNodeId: string,
    params: ReplacementPayload,
  ) => {
    try {
      switch (params.type) {
        case "from-node-instance": {
          await nodeInteractionsStore.replaceNode({
            targetNodeId,
            replacementNodeId: params.replacementNodeId,
          });

          return { wasReplaced: true };
        }

        case "from-node-template": {
          await nodeInteractionsStore.replaceNode({
            targetNodeId,
            nodeFactory: params.nodeTemplate.nodeFactory,
          });

          return { wasReplaced: true };
        }

        case "from-component-template": {
          await nodeInteractionsStore.addComponentNode({
            componentIdInHub: params.componentTemplate.id,
            componentName: params.componentTemplate.name,
            mode: "replace-node",
            replacementOptions: { targetNodeId },
          });

          return { wasReplaced: true };
        }

        default: {
          return { wasReplaced: false };
        }
      }
    } catch (error) {
      consola.error("Failed to replace node", { error });
      toastPresets.workflow.replacementOperation.replaceNode({ error });
      return { wasReplaced: false };
    }
  };

  const doNodeInsertion = async (
    connectionId: string,
    position: XY,
    params: ReplacementPayload,
  ) => {
    try {
      switch (params.type) {
        case "from-node-instance": {
          await nodeInteractionsStore.insertNode({
            connectionId,
            nodeId: params.replacementNodeId,
            position,
          });

          return { wasReplaced: true };
        }

        case "from-node-template": {
          await nodeInteractionsStore.insertNode({
            connectionId,
            position,
            nodeFactory: params.nodeTemplate.nodeFactory!,
          });

          return { wasReplaced: true };
        }

        case "from-component-template": {
          await nodeInteractionsStore.addComponentNode({
            componentIdInHub: params.componentTemplate.id,
            componentName: params.componentTemplate.name,
            position,
            mode: "insert-on-connection",
            insertionOptions: { connectionId },
          });
          return { wasReplaced: false };
        }

        default: {
          return { wasReplaced: false };
        }
      }
    } catch (error) {
      consola.error("Failed to insert node on connection", { error });
      toastPresets.workflow.replacementOperation.insertOnConnection({
        error,
      });
      return { wasReplaced: false };
    }
  };

  const onDrop = (
    dropPosition: XY,
    params: ReplacementPayload,
  ): Promise<{ wasReplaced: boolean }> => {
    return new Promise((resolve) => {
      if (
        !isWritable.value ||
        hasAbortedDrag.value ||
        !replacementOperation.value
      ) {
        isDragging.value = false;
        replacementOperation.value = null;
        resolve(Promise.resolve({ wasReplaced: false }));
        return;
      }

      try {
        if (replacementOperation.value.type === "node") {
          resolve(
            doNodeReplacement(replacementOperation.value.candidateId, params),
          );
        } else {
          resolve(
            doNodeInsertion(
              replacementOperation.value.candidateId,
              dropPosition,
              params,
            ),
          );
        }
      } finally {
        isDragging.value = false;
        replacementOperation.value = null;
      }
    });
  };

  return { onDragStart, onDragMove, onDrop };
};
