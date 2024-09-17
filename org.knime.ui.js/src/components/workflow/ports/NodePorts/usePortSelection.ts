import { computed, watch } from "vue";
import { useStore } from "@/composables/useStore";
import type { SelectedPortIdentifier } from "@/util/portSelection";
import type { NativeNode, NodePort } from "@/api/gateway-api/generated-api";
import { useNodeInfo } from "./useNodeInfo";

type UsePortSelectionOptions = {
  nodeId: string;
  isEditable: boolean;
  portGroups: NativeNode["portGroups"] | null;
};

export const usePortSelection = (options: UsePortSelectionOptions) => {
  const store = useStore();

  const { isComponent, isMetanode } = useNodeInfo({ nodeId: options.nodeId });

  const isActiveNodePortsInstance = computed(
    () => store.state.selection.activeNodePorts.nodeId === options.nodeId,
  );

  const isModificationInProgress = computed(
    () => store.state.selection.activeNodePorts.isModificationInProgress,
  );

  const currentlySelectedPort = computed(() => {
    if (isActiveNodePortsInstance.value) {
      return store.state.selection.activeNodePorts.selectedPort;
    }

    return null;
  });

  const updateSelection = (selectedPort: SelectedPortIdentifier) => {
    store.commit("selection/updateActiveNodePorts", {
      nodeId: options.nodeId,
      selectedPort,
    });
  };

  const clearSelection = () => {
    store.commit("selection/updateActiveNodePorts", {
      nodeId: null,
      selectedPort: null,
    });
  };

  const setModificationInProgress = (value: boolean) => {
    store.commit("selection/updateActiveNodePorts", {
      isModificationInProgress: value,
    });
  };

  const selectPort = (
    { index, portGroupId }: NodePort,
    side: "input" | "output",
  ) => {
    if (!options.isEditable) {
      return;
    }

    if (isComponent.value && index !== 0) {
      // all but hidden ports on components (mickey mouse) can be selected
      updateSelection(`${side}-${index}`);
    } else if (isMetanode.value) {
      updateSelection(`${side}-${index}`);
    } else if (options.portGroups && portGroupId) {
      // native node and port is part of a port group
      const portGroup = options.portGroups[portGroupId];
      const [, upperBound] = portGroup[`${side}Range`]!;

      // select last port of group
      updateSelection(`${side}-${upperBound}`);
    }
  };

  const isDragging = computed(() => store.state.workflow.isDragging);

  watch(isDragging, (isDragging, wasDragging) => {
    if (isActiveNodePortsInstance.value && isDragging && !wasDragging) {
      clearSelection();
    }
  });

  return {
    currentlySelectedPort,
    selectPort,
    updateSelection,
    clearSelection,
    portSelectionState: {
      isModificationInProgress,
      setModificationInProgress,
    },
  };
};
