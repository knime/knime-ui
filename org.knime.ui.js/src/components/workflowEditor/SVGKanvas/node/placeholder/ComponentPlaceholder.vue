<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";

import type { Toast } from "@knime/components";

import { ComponentPlaceholder, Node } from "@/api/gateway-api/generated-api";
import { getToastsProvider } from "@/plugins/toasts";
import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import { useSelectionStore } from "@/store/selection";
import NodeSelectionPlane from "../NodeSelectionPlane.vue";

import ComponentPlaceholderState from "./ComponentPlaceholderState.vue";

type Props = {
  placeholder: ComponentPlaceholder;
};

const props = defineProps<Props>();

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
const isComponentSelected = computed(() => {
  return props.placeholder.id === getSelectedComponentPlaceholder.value?.id;
});

const $toast = getToastsProvider();

watch(placeholderState, async () => {
  const currentSelection = getSelection();
  const isSelectionUnchanged =
    previousSelection.value.size === currentSelection.size &&
    [...previousSelection.value].every((id) => currentSelection.has(id));

  closeContextMenu();

  if (isSelectionUnchanged && (isSuccess.value || isSuccessWithWarning.value)) {
    if (props.placeholder.componentId && isComponentSelected.value) {
      await deselectAllObjects([props.placeholder.componentId]);
    }
  }

  if (isSuccessWithWarning.value || isError.value) {
    const toastData: Toast = {
      headline: props.placeholder.message,
      message: props.placeholder.details,
      type: isError.value ? "error" : "warning",
      autoRemove: !isError.value,
    };

    $toast.show(toastData);
  }
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
    v-show="isComponentSelected"
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
