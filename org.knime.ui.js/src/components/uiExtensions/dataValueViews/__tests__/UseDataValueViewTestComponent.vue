<script setup lang="ts">
import { useDataValueView } from "../useDataValueView";

const { open, close, config, element, isDragging, styles } = useDataValueView();

defineExpose({ open, close, styles });
</script>

<template>
  <div
    v-if="config"
    id="data-value-view"
    ref="element"
    :is-dragging="isDragging"
  />
</template>
