import { computed, ref } from "vue";

import { useWorkflowStore } from "@/store/workflow/workflow";

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

  const deselectAll = () => {
    if (Object.keys(selectedConnections.value).length > 0) {
      selectedConnections.value = {};
    }

    if (Object.keys(selectedBendpoints.value).length > 0) {
      selectedBendpoints.value = {};
    }
  };

  return {
    selectedConnectionIds,
    getSelectedConnections,

    isConnectionSelected: (id: string) =>
      Boolean(selectedConnections.value[id]),

    selectConnections: selectionAdder(selectedConnections),
    deselectConnections: selectionRemover(selectedConnections),

    internal: {
      deselectAll,
    },
  };
};
