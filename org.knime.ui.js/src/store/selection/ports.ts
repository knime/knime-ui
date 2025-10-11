/* eslint-disable no-undefined */
import { ref } from "vue";

export const useNodePortSelection = () => {
  const activeNodePorts = ref({
    nodeId: null as string | null,
    selectedPort: null as any,
    isModificationInProgress: false,
  });

  const updateActiveNodePorts = (options: {
    nodeId?: string | null;
    selectedPort?: string | null;
    isModificationInProgress?: boolean;
  }) => {
    if (options.nodeId !== undefined) {
      activeNodePorts.value.nodeId = options.nodeId;
    }
    if (options.selectedPort !== undefined) {
      activeNodePorts.value.selectedPort = options.selectedPort;
    }
    if (options.isModificationInProgress !== undefined) {
      activeNodePorts.value.isModificationInProgress =
        options.isModificationInProgress;
    }
  };

  const deselect = () => {
    activeNodePorts.value = {
      nodeId: null,
      selectedPort: null,
      isModificationInProgress: false,
    };
  };

  return {
    activeNodePorts,
    updateActiveNodePorts,

    internal: {
      deselect,
    },
  };
};
