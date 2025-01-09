import { computed, watch } from "vue";
import { storeToRefs } from "pinia";

import type { NativeNode, NodePort } from "@/api/gateway-api/generated-api";
import { useSelectionStore } from "@/store/selection";
import { useMovingStore } from "@/store/workflow/moving";
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
    { index, portGroupId }: NodePort,
    side: "input" | "output",
  ) => {
    console.log('options', options);
    console.log('portgoupid', portGroupId);
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
      console.log('true');

      // select last port of group
      updateSelection(`${side}-${index}`);
    }
  };

  const { isDragging } = storeToRefs(useMovingStore());

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
