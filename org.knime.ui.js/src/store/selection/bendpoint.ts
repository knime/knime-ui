import { computed, ref } from "vue";

import type { Connection } from "@/api/gateway-api/generated-api";
import { useWorkflowStore } from "@/store/workflow/workflow";

import { selectionAdder, selectionRemover } from "./utils";

const ID_SEPARATOR = "__" as const;

type BendpointId = `${string}${typeof ID_SEPARATOR}${string}`;

export const useBendpointSelection = () => {
  const workflowStore = useWorkflowStore();

  const selectedBendpoints = ref<Record<string, boolean>>({});
  const selectedBendpointIds = computed(() =>
    Object.keys(selectedBendpoints.value),
  );

  const getBendpointId = (
    connectionId: string,
    bendpointIndex: number,
  ): BendpointId => `${connectionId}${ID_SEPARATOR}${bendpointIndex}`;

  const parseBendpointId = (bendpointId: string) => {
    const [connectionId, bendpointIndex] = bendpointId.split(ID_SEPARATOR);

    return {
      connectionId,
      index: Number(bendpointIndex),
    };
  };

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
    if (Object.keys(selectedBendpoints.value).length > 0) {
      selectedBendpoints.value = {};
    }
  };

  return {
    selectedBendpointIds,
    getSelectedBendpoints,
    getBendpointId,
    isBendpointSelected: (id: string) => Boolean(selectedBendpoints.value[id]),
    selectBendpoints: selectionAdder(selectedBendpoints),
    deselectBendpoints: selectionRemover(selectedBendpoints),
    selectAllBendpointsInConnections,

    internal: {
      deselectAll,
    },
  };
};
