import { API } from "@api";
import { defineStore } from "pinia";

import type { Connection, XY } from "@/api/gateway-api/generated-api";

import { useMovingStore } from "./moving";
import { useWorkflowStore } from "./workflow";

type ConnectionID = string;
type BendpointIndex = number;

type ConnectionInteractionsState = {
  virtualBendpoints: Record<
    ConnectionID,
    Record<BendpointIndex, XY & { currentBendpointCount: number }>
  >;
};

export const useConnectionInteractionsStore = defineStore(
  "connectionInteractions",
  {
    state: (): ConnectionInteractionsState => ({
      virtualBendpoints: {},
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

        // move new bendpoint
        const movingStore = useMovingStore();
        await movingStore.moveObjectsWebGL({ ...movingStore.movePreviewDelta });

        this.removeVirtualBendpoint({ connectionId, index });
      },
    },
  },
);
