<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";

import { getMetaOrCtrlKey } from "@knime/utils";

import { ComponentPlaceholder, type XY } from "@/api/gateway-api/generated-api";
import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import { useSelectionStore } from "@/store/selection";
import NodeNameText from "../name/NodeNameText.vue";

import ComponentError from "./ComponentError.vue";
import ComponentFloatingOptions from "./ComponentFloatingOptions.vue";
import ComponentLoading from "./ComponentLoading.vue";

type Props = {
  id: string;
  position: XY;
  progress?: number;
  state:
    | ComponentPlaceholder.StateEnum.LOADING
    | ComponentPlaceholder.StateEnum.ERROR;
  name?: string;
};

const props = defineProps<Props>();

const { getSelectedComponentPlaceholder } = storeToRefs(useSelectionStore());
const { selectComponentPlaceholder, deselectComponentPlaceholder } =
  useSelectionStore();
const { toggleContextMenu } = useCanvasAnchoredComponentsStore();

const isHovering = ref(false);
const isComponentPlaceholderSelected = computed(
  () => props.id === getSelectedComponentPlaceholder.value?.id,
);

const onPointerDown = (event: PointerEvent) => {
  const metaOrCtrlKey = getMetaOrCtrlKey();
  const isMultiselect = event.shiftKey || event[metaOrCtrlKey];
  // TODO: NXT-3389 prompt about unsaved changes in node configuration
  if (isComponentPlaceholderSelected.value && isMultiselect) {
    return deselectComponentPlaceholder();
  }
  return selectComponentPlaceholder(props.id);
};

const onContextMenu = async (event) => {
  if (!isComponentPlaceholderSelected.value) {
    await selectComponentPlaceholder(props.id);
  }

  await toggleContextMenu({ event });
};
</script>

<template>
  <g
    :transform="`translate(${position.x}, ${position.y})`"
    :data-placeholder-id="id"
    @mouseenter="isHovering = true"
    @mouseleave="isHovering = false"
    @pointerdown.left.stop="onPointerDown"
    @pointerdown.right.stop="onContextMenu"
  >
    <NodeNameText :editable="false" :value="name" />

    <ComponentLoading
      v-if="state === ComponentPlaceholder.StateEnum.LOADING"
      :progress="progress"
    />

    <ComponentError v-else />

    <!-- Transparent hitbox -->
    <rect
      :x="-10"
      :y="-50"
      :width="$shapes.nodeSize + 20"
      :height="$shapes.nodeSize + 55"
      fill="transparent"
    />

    <ComponentFloatingOptions
      v-if="isHovering"
      :id="id"
      :is-error="state === ComponentPlaceholder.StateEnum.ERROR"
    />
  </g>
</template>
