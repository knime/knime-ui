<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";

import { ComponentPlaceholder, Node } from "@/api/gateway-api/generated-api";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import { useSelectionStore } from "@/store/selection";
import * as $shapes from "@/style/shapes";
import { getToastPresets } from "@/toastPresets";
import { geometry } from "@/util/geometry";
import NodeSelectionPlane from "../NodeSelectionPlane.vue";
import { useNodeSelectionPlaneMeasures } from "../useNodeSelectionPlaneMeasures";
import { useNodeNameShortening } from "../useTextShortening";

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
const canvasStore = useWebGLCanvasStore();
const { visibleArea, canvasLayers } = storeToRefs(canvasStore);

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

// Adjust so there is no jumping when component is loaded
const adjustedPosition = computed(() => {
  return {
    x: props.placeholder.position.x + 1,
    // eslint-disable-next-line no-magic-numbers
    y: props.placeholder.position.y + 6,
  };
});

const { metrics: nodeNameDimensions } = useNodeNameShortening(
  computed(() => props.placeholder.name ?? ""),
);

const { nodeSelectionMeasures } = useNodeSelectionPlaneMeasures({
  extraHeight: () => nodeNameDimensions.value.height,
  kind: Node.KindEnum.Component,
  width: () => $shapes.nodeNameHorizontalMargin * 2,
});

const renderable = computed(
  () =>
    !geometry.utils.isPointOutsideBounds(
      adjustedPosition.value,
      visibleArea.value,
    ),
);
</script>

<template>
  <NodeSelectionPlane
    v-if="isComponentSelected"
    :layer="canvasLayers.nodeSelectionPlane"
    :anchor-position="adjustedPosition"
    :renderable="renderable"
    :show-selection="true"
    :show-focus="false"
    :measures="nodeSelectionMeasures"
  />

  <ComponentPlaceholderState
    v-if="
      placeholder.state === ComponentPlaceholder.StateEnum.LOADING ||
      placeholder.state === ComponentPlaceholder.StateEnum.ERROR
    "
    :id="placeholder.id"
    :label="`ComponentPlaceholder__${placeholder.id}`"
    :layer="isComponentSelected ? canvasLayers.selectedNodes : null"
    :progress="placeholder.progress"
    :position="adjustedPosition"
    :state="placeholder.state"
    :name="placeholder.name"
  />
</template>
