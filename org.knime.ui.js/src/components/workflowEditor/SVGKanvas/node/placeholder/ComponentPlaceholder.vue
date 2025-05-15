<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";

import { ComponentPlaceholder, Node } from "@/api/gateway-api/generated-api";
import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import { useSelectionStore } from "@/store/selection";
import { getToastPresets } from "@/toastPresets";
import NodeSelectionPlane from "../NodeSelectionPlane.vue";

import ComponentPlaceholderState from "./ComponentPlaceholderState.vue";

type Props = {
  placeholder: ComponentPlaceholder;
};

const props = defineProps<Props>();

const { toastPresets } = getToastPresets();
const { getSelectedComponentPlaceholder } = storeToRefs(useSelectionStore());
const { deselectAllObjects } = useSelectionStore();
const {
  selectedNodeIds,
  selectedAnnotationIds,
  selectedConnectionIds,
  selectedBendpointIds,
} = storeToRefs(useSelectionStore());
const { closeContextMenu } = useCanvasAnchoredComponentsStore();

const previousSelection = ref<Set<string>>(new Set());
const getSelection = () =>
  new Set([
    ...selectedNodeIds.value,
    ...selectedAnnotationIds.value,
    ...selectedConnectionIds.value,
    ...selectedBendpointIds.value,
    ...(getSelectedComponentPlaceholder.value?.id ?? []),
  ]);
onMounted(() => {
  previousSelection.value = getSelection();
});

const placeholderState = computed(() => props.placeholder.state);
const isError = computed(
  () => placeholderState.value === ComponentPlaceholder.StateEnum.ERROR,
);
const isSuccessWithWarning = computed(
  () =>
    placeholderState.value ===
    ComponentPlaceholder.StateEnum.SUCCESSWITHWARNING,
);
const isSuccess = computed(
  () => placeholderState.value === ComponentPlaceholder.StateEnum.SUCCESS,
);

watch(placeholderState, async () => {
  const currentSelection = getSelection();
  const isSelectionUnchanged =
    previousSelection.value.size === currentSelection.size &&
    [...previousSelection.value].every((id) => currentSelection.has(id));

  closeContextMenu();

  if (isSelectionUnchanged && (isSuccess.value || isSuccessWithWarning.value)) {
    if (props.placeholder.componentId) {
      await deselectAllObjects([props.placeholder.componentId]);
    }
  }

  if (isSuccessWithWarning.value || isError.value) {
    const toastData = {
      message: props.placeholder.message,
      details: props.placeholder.details,
    };

    if (isError.value) {
      toastPresets.workflow.componentLoadingFailed(toastData);
    } else {
      toastPresets.workflow.componentLoadedWithWarning(toastData);
    }
  }
});

const shouldShowSelection = computed(() => {
  return props.placeholder.id === getSelectedComponentPlaceholder.value?.id;
});

// Adjust so there is no jumping when component is loaded
const adjustedPosition = computed(() => {
  return {
    x: props.placeholder.position.x + 1,
    // eslint-disable-next-line no-magic-numbers
    y: props.placeholder.position.y + 6,
  };
});
</script>

<template>
  <NodeSelectionPlane
    v-show="shouldShowSelection"
    :show-selection="true"
    :position="adjustedPosition"
    :kind="Node.KindEnum.Component"
  />

  <ComponentPlaceholderState
    v-if="
      placeholder.state === ComponentPlaceholder.StateEnum.LOADING ||
      placeholder.state === ComponentPlaceholder.StateEnum.ERROR
    "
    :id="placeholder.id"
    :progress="placeholder.progress"
    :position="adjustedPosition"
    :state="placeholder.state"
    :name="placeholder.name"
  />
</template>
