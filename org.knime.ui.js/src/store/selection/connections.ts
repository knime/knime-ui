import { computed, ref } from "vue";

import type { Connection } from "@/api/gateway-api/generated-api";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { getBendpointId, parseBendpointId } from "@/util/connectorUtil";

import { selectionAdder, selectionRemover } from "./utils";

export const useConnectionSelection = () => {
  const workflowStore = useWorkflowStore();
  const selectedConnections = ref<Record<string, boolean>>({});
  const getSelectedConnections = computed(() => {
    const { activeWorkflow } = workflowStore;

    return activeWorkflow
      ? Object.keys(selectedConnections.value)
          .map((id) => activeWorkflow.connections[id])
          .filter(Boolean)
      : [];
  });

  const selectedConnectionIds = computed(() =>
    getSelectedConnections.value.map(({ id }) => id),
  );

  const selectedBendpoints = ref<Record<string, boolean>>({});
  const selectedBendpointIds = computed(() =>
    Object.keys(selectedBendpoints.value),
  );

  const getSelectedBendpoints = computed(() => {
    if (!workflowStore.activeWorkflow) {
      return {};
    }

    const result: Record<string, number[]> = {};
    Object.keys(selectedBendpoints.value).forEach((bendpointId) => {
      const { connectionId, index } = parseBendpointId(bendpointId);
      if (!result[connectionId]) {
        result[connectionId] = [];
      }
      result[connectionId].push(index);
    });

    return result;
  });

  const selectAllBendpointsInConnections = (connections: Connection[]) => {
    connections.forEach((conn) => {
      const bendpoints = Array(conn.bendpoints?.length ?? 0)
        .fill(null)
        .map((_, i) => getBendpointId(conn.id, i));
      selectionAdder(selectedBendpoints)(bendpoints);
    });
  };

  const deselectAll = () => {
    if (Object.keys(selectedConnections.value).length > 0) {
      selectedConnections.value = {};
    }

    if (Object.keys(selectedBendpoints.value).length > 0) {
      selectedBendpoints.value = {};
    }
  };

  return {
    selectedBendpointIds,
    getSelectedBendpoints,
    selectedConnectionIds,
    getSelectedConnections,

    isConnectionSelected: (id: string) =>
      Boolean(selectedConnections.value[id]),
    isBendpointSelected: (id: string) => Boolean(selectedBendpoints.value[id]),

    selectBendpoints: selectionAdder(selectedBendpoints),
    deselectBendpoints: selectionRemover(selectedBendpoints),

    selectConnections: selectionAdder(selectedConnections),
    deselectConnections: selectionRemover(selectedConnections),
    selectAllBendpointsInConnections,

    internal: {
      deselectAll,
    },
  };
};
