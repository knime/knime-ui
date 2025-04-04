import { type Ref, computed, ref } from "vue";
import { storeToRefs } from "pinia";

import type { WorkflowAnnotation } from "@/api/gateway-api/generated-api";
import { useSelectionStore } from "@/store/selection";
import { useMovingStore } from "@/store/workflow/moving";
import { useWorkflowStore } from "@/store/workflow/workflow";

type UseAnnotationSelectionOptions = {
  annotation: Ref<WorkflowAnnotation>;
};

export const useAnnotationSelection = (
  options: UseAnnotationSelectionOptions,
) => {
  const { annotation } = options;
  const selectionPreview = ref<"hide" | "show" | "clear" | null>(null);

  const { isDragging } = storeToRefs(useMovingStore());
  const { isWritable } = storeToRefs(useWorkflowStore());
  const selectionStore = useSelectionStore();
  const {
    selectedNodeIds,
    getSelectedConnections: selectedConnections,
    selectedAnnotationIds,
    shouldHideSelection,
    getFocusedObject,
    isAnnotationSelected,
  } = storeToRefs(selectionStore);

  const isSelected = computed(() =>
    isAnnotationSelected.value(annotation.value.id),
  );

  const showSelectionPlane = computed(() => {
    if (shouldHideSelection.value) {
      return false;
    }

    if (selectionPreview.value === null) {
      return isSelected.value;
    }

    if (isSelected.value && selectionPreview.value === "hide") {
      return false;
    }

    return selectionPreview.value === "show" || isSelected.value;
  });

  const showFocus = computed(
    () => getFocusedObject.value?.id === annotation.value.id,
  );

  const showTransformControls = computed(() => {
    if (isDragging.value || !isWritable.value) {
      return false;
    }

    const isMoreThanOneAnnotationSelected =
      selectedAnnotationIds.value.length > 1;
    const isOneOrMoreNodesSelected = selectedNodeIds.value.length >= 1;
    const isOneOrMoreConnectionsSelected =
      selectedConnections.value.length >= 1;

    const isMoreThanOneItemSelected =
      isMoreThanOneAnnotationSelected ||
      isOneOrMoreNodesSelected ||
      isOneOrMoreConnectionsSelected;

    return (
      isSelected.value && !isMoreThanOneItemSelected && showSelectionPlane.value
    );
  });

  return {
    selectionPreview,
    showFocus,
    showSelectionPlane,
    showTransformControls,
  };
};
