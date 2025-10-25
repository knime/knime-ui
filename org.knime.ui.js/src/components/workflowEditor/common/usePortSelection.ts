import { computed } from "vue";
import { storeToRefs } from "pinia";

import type { NativeNode, NodePort } from "@/api/gateway-api/generated-api";
import { useSelectionStore } from "@/store/selection";
import type { SelectedPortIdentifier } from "@/util/portSelection";

import { useNodeInfo } from "./useNodeInfo";

type UsePortSelectionOptions = {
  nodeId: string;
  isEditable: boolean;
  portGroups: NativeNode["portGroups"] | null;
};

export const usePortSelection = (options: UsePortSelectionOptions) => {
  const { isComponent, isMetanode } = useNodeInfo({ nodeId: options.nodeId });

  const selectionStore = useSelectionStore();
  const { activeNodePorts } = storeToRefs(selectionStore);

  const isActiveNodePortsInstance = computed(
    () => activeNodePorts.value.nodeId === options.nodeId,
  );

  const isModificationInProgress = computed(
    () => activeNodePorts.value.isModificationInProgress,
  );

  const currentlySelectedPort = computed(() => {
    if (isActiveNodePortsInstance.value) {
      return activeNodePorts.value.selectedPort;
    }

    return null;
  });

  const updateSelection = (selectedPort: SelectedPortIdentifier) => {
    selectionStore.updateActiveNodePorts({
      nodeId: options.nodeId,
      selectedPort,
    });
  };

  const clearSelection = () => {
    selectionStore.updateActiveNodePorts({
      nodeId: null,
      selectedPort: null,
    });
  };

  const setModificationInProgress = (value: boolean) => {
    selectionStore.updateActiveNodePorts({
      isModificationInProgress: value,
    });
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
