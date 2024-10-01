<script setup lang="ts">
import { activeOverlayConfig, useAppDropTarget } from ".";
import { computed, watch } from "vue";

useAppDropTarget();

const width = computed(() => activeOverlayConfig.value?.width ?? 0);
const height = computed(() => activeOverlayConfig.value?.height ?? 0);
const x = computed(() => activeOverlayConfig.value?.position.x ?? 0);
const y = computed(() => activeOverlayConfig.value?.position.y ?? 0);

watch(activeOverlayConfig, (next) => {
  if (!next) {
    console.log("hiding :>> ");
  }
});
</script>

<template>
  <div v-if="activeOverlayConfig" class="drop-target-overlay" @dragover.prevent>
    <span class="drop text">Drop here</span>
  </div>
</template>

<style lang="postcss" scoped>
.drop-target-overlay {
  pointer-events: none;

  /* background-color: var(--knime-cornflower-semi); */
  border: 2px dashed var(--knime-cornflower);
  border-radius: 4px;
  position: fixed;
  left: calc(v-bind("x") * 1px);
  top: calc(v-bind("y") * 1px);
  z-index: 99;
  width: calc(v-bind("width") * 1px);
  height: calc(v-bind("height") * 1px);
  display: flex;
  justify-content: center;
  align-items: center;

  background: rgba(209, 231, 248, 0.8);

  & .drop-text {
    color: var(--knime-silver-sand);
  }
}
</style>
