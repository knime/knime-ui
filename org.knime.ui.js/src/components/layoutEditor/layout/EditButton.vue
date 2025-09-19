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
  margin: 2px;
  padding: 2px;
  border: 0;
  outline: 0;
  width: 16px;
  height: 16px;
  background-color: var(--knime-silver-sand);
  position: absolute;
  right: 0;
  top: 0;
  cursor: pointer;
  opacity: 1;
  transition: opacity 0.2s;
  border-radius: 2px;

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
    margin: auto;
    display: block;
  }
}
</style>
