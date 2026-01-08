import { computed } from "vue";
import { storeToRefs } from "pinia";

import type { NativeNode, NodePort } from "@/api/gateway-api/generated-api";
import { useSelectionStore } from "@/store/selection";
import type { SelectedPortId } from "@/store/selection/ports";

import { useNodeInfo } from "./useNodeInfo";

type UsePortSelectionOptions = {
  nodeId: string;
  isEditable: boolean;
  portGroups: NativeNode["portGroups"] | null;
};

export const usePortSelection = (options: UsePortSelectionOptions) => {
  const { isComponent, isMetanode } = useNodeInfo({ nodeId: options.nodeId });

  const selectionStore = useSelectionStore();
  const { selectedNodePort: activeNodePorts } = storeToRefs(selectionStore);

  const isActiveNodePortsInstance = computed(
    () => activeNodePorts.value.nodeId === options.nodeId,
  );

  const isModificationInProgress = computed(
    () => activeNodePorts.value.isModificationInProgress,
  );

  const currentlySelectedPort = computed(() => {
    if (isActiveNodePortsInstance.value) {
      return activeNodePorts.value.selectedPortId;
    }

    return null;
  });

  const updateSelection = (selectedPort: SelectedPortId) => {
    selectionStore.updateSelectedNodePort({
      nodeId: options.nodeId,
      selectedPortId: selectedPort,
    });
  };

  const clearSelection = () => {
    selectionStore.deselectNodePort();
  };

  const setModificationInProgress = (value: boolean) => {
    selectionStore.updateSelectedNodePort({ isModificationInProgress: value });
  };

  const selectPort = (
    { index, portGroupId, canRemove }: NodePort,
    side: "input" | "output",
  ) => {
    if (!options.isEditable) {
      return;
    }
    const isSelectableComponentPort = isComponent.value && index !== 0;
    // all but hidden ports on components (mickey mouse) can be selected
    const isSelectableNativePort =
      options.portGroups && portGroupId && canRemove;
    // removable native ports in a port group can be selected
    if (
      isSelectableComponentPort ||
      isMetanode.value ||
      isSelectableNativePort
    ) {
      updateSelection(`${side}-${index}`);
    }
  };

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
