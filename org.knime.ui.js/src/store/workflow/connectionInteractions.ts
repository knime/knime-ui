import { API } from "@api";
import { defineStore } from "pinia";

import type { ComponentPlaceholderConnection } from "@/api/custom-types";
import {
  AddNodeCommand,
  type Connection,
  type XY,
} from "@/api/gateway-api/generated-api";
import { canvasRendererUtils } from "@/components/workflowEditor/util/canvasRenderer";

import { useMovingStore } from "./moving";
import { useWorkflowStore } from "./workflow";

type ConnectionID = string;
type BendpointIndex = number;

type ConnectionInteractionsState = {
  virtualBendpoints: Record<
    ConnectionID,
    Record<BendpointIndex, XY & { currentBendpointCount: number }>
  >;
  componentPlaceholderConnections: Record<
    string,
    ComponentPlaceholderConnection
  >;
};

export const useConnectionInteractionsStore = defineStore(
  "connectionInteractions",
  {
    state: (): ConnectionInteractionsState => ({
      virtualBendpoints: {},
      componentPlaceholderConnections: {},
    }),
    actions: {
      updateConnection({
        connectionId,
        data,
      }: {
        connectionId: string;
        data: Connection;
      }) {
        useWorkflowStore().activeWorkflow!.connections[connectionId] = data;
      },

      addVirtualBendpoint({
        connectionId,
        index,
        position,
      }: {
        connectionId: string;
        index: number;
        position: XY;
      }) {
        const currentBendpointCount =
          useWorkflowStore().activeWorkflow!.connections[connectionId]
            .bendpoints?.length ?? 0;

        this.virtualBendpoints = {
          ...this.virtualBendpoints,
          [connectionId]: {
            ...this.virtualBendpoints[connectionId],
            [index]: { ...position, currentBendpointCount },
          },
        };
      },

      removeVirtualBendpoint({
        connectionId,
        index,
      }: {
        connectionId: string;
        index: number;
      }) {
        delete this.virtualBendpoints[connectionId][index];

        if (Object.keys(this.virtualBendpoints[connectionId]).length === 0) {
          delete this.virtualBendpoints[connectionId];
        }
      },

      async addBendpoint({
        connectionId,
        index,
        position,
      }: {
        connectionId: string;
        index: number;
        position: XY;
      }) {
        const { projectId, workflowId } =
          useWorkflowStore().getProjectAndWorkflowIds;

        await API.workflowCommand.AddBendpoint({
          projectId,
          workflowId,
          connectionId,
          position: {
            x: position.x,
            y: position.y,
          },
          index,
        });

        const movingStore = useMovingStore();
        if (canvasRendererUtils.isWebGLRenderer()) {
          // move new bendpoint
          await movingStore.moveObjectsWebGL({
            ...movingStore.movePreviewDelta,
          });
        }

        this.removeVirtualBendpoint({ connectionId, index });
      },

      addComponentPlaceholderConnection(
        origin: {
          type: AddNodeCommand.NodeRelationEnum;
          nodeId: string;
          portIndex: number;
        },
        componentPlaceholderId: string,
      ) {
        const willConnectToSuccessor =
          origin.type === AddNodeCommand.NodeRelationEnum.SUCCESSORS;

        const sourceNode = willConnectToSuccessor
          ? origin.nodeId
          : componentPlaceholderId;
        const sourcePort = willConnectToSuccessor ? origin.portIndex : 1;

        const destNode = willConnectToSuccessor
          ? componentPlaceholderId
          : origin.nodeId;
        const destPort = willConnectToSuccessor ? 1 : origin.portIndex;

        const connection: ComponentPlaceholderConnection = {
          id: componentPlaceholderId,
          sourceNode,
          sourcePort,
          destNode,
          destPort,
          placeholderType: willConnectToSuccessor
            ? "placeholder-in"
            : "placeholder-out",
        };

        this.componentPlaceholderConnections[componentPlaceholderId] =
          connection;
      },

      removeComponentPlaceholderConnection(componentPlaceholderId: string) {
        if (this.componentPlaceholderConnections[componentPlaceholderId]) {
          delete this.componentPlaceholderConnections[componentPlaceholderId];
        }
      },
    },
  },
);
