<script setup lang="ts">
import { storeToRefs } from "pinia";

import { useLayoutEditorStore } from "@/store/layoutEditor/layoutEditor";

const layoutEditorStore = useLayoutEditorStore();
const { isDragging } = storeToRefs(layoutEditorStore);
</script>

<template>
  <button class="edit-button" :class="{ hidden: isDragging }" v-bind="$attrs">
    <slot />
  </button>
</template>

<style lang="postcss" scoped>
button {
  margin: 0;
  padding: 0;
  border: 0;
  outline: 0;
  width: 14px;
  height: 14px;
  background-color: var(--knime-silver-sand);
  position: absolute;
  right: 0;
  top: 0;
  cursor: pointer;
  opacity: 1;
  transition: opacity 0.2s;

  &:hover,
  &.active {
    background-color: var(--knime-yellow);
  }

  &.hidden {
    opacity: 0;
  }

  & > * {
    margin: auto;
    display: block;
  }
}
</style>
