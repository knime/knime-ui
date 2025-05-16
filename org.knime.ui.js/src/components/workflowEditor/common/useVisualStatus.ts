import { type Ref, computed } from "vue";
import { storeToRefs } from "pinia";

import { useSelectionStore } from "@/store/selection";
import { useMovingStore } from "@/store/workflow/moving";
import { useWorkflowStore } from "@/store/workflow/workflow";

const getObjectVisualStatus = (options: {
  id: Ref<string>;
  type: "annotation" | "node";
}) => {
  const { id, type } = options;

  const { isDragging } = storeToRefs(useMovingStore());
  const { isWritable } = storeToRefs(useWorkflowStore());
  const selectionStore = useSelectionStore();
  const { shouldHideSelection, getFocusedObject } = storeToRefs(selectionStore);

  const isSelected = computed(() =>
    type === "annotation"
      ? selectionStore.isAnnotationSelected(id.value)
      : selectionStore.isNodeSelected(id.value),
  );

  const showSelectionPlane = computed(() => {
    if (selectionStore.preselectionMode) {
      return type === "annotation"
        ? selectionStore.isAnnotationPreselected(id.value)
        : selectionStore.isNodePreselected(id.value) && !isDragging.value;
    }
    return isSelected.value && !shouldHideSelection.value;
  });

  const showFocus = computed(() => getFocusedObject.value?.id === id.value);

  const showTransformControls = computed(() => {
    if (
      isDragging.value ||
      !isWritable.value ||
      selectionStore.preselectionMode
    ) {
      return false;
    }
    return (
      isSelected.value &&
      selectionStore.singleSelectedObject !== null &&
      showSelectionPlane.value
    );
  });

  return {
    showFocus,
    showSelectionPlane,
    showTransformControls,
  };
};

export const useNodeVisualStatus = (id: Ref<string>) =>
  getObjectVisualStatus({
    id,
    type: "node",
  });

export const useAnnotationVisualStatus = (id: Ref<string>) =>
  getObjectVisualStatus({
    id,
    type: "annotation",
  });
