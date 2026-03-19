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
@import url("@/assets/mixins.css");

button {
  position: absolute;
  top: 0;
  right: 0;
  width: 16px;
  height: 16px;
  padding: 2px;
  margin: 2px;
  cursor: pointer;
  outline: 0;
  background-color: var(--knime-silver-sand);
  border: 0;
  border-radius: 2px;
  opacity: 1;
  transition: opacity 0.2s;

  &:hover,
  &.active {
    background-color: var(--knime-masala);
  }

  &:hover :slotted(svg),
  &.active :slotted(svg) {
    stroke: var(--knime-white);
  }

  &:focus-visible {
    @mixin focus-outline;
  }

  &.hidden {
    opacity: 0;
  }

  & > * {
    display: block;
    margin: auto;
  }
}
</style>
