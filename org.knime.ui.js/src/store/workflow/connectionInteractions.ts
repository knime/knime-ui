import { API } from "@api";
import { defineStore } from "pinia";

import type { XY } from "@/api/gateway-api/generated-api";

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
      updateConnection({ connectionId, data }) {
        useWorkflowStore().activeWorkflow!.connections[connectionId] = data;
      },

      addVirtualBendpoint({ connectionId, index, position }) {
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

      removeVirtualBendpoint({ connectionId, index }) {
        delete this.virtualBendpoints[connectionId][index];

        if (Object.keys(this.virtualBendpoints[connectionId]).length === 0) {
          delete this.virtualBendpoints[connectionId];
        }
      },

      async addBendpoint({ connectionId, index, position }) {
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
        await useMovingStore().moveObjects();

        this.removeVirtualBendpoint({ connectionId, index });
      },
    },
  },
);
