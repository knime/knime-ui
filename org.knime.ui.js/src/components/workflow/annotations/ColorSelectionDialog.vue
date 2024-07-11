<script setup lang="ts">
import { FunctionButton } from "@knime/components";

import { annotationColorPresets } from "@/style/colors.mjs";

import ColorIcon from "./ColorIcon.vue";

interface Props {
  activeColor: string | null;
}

const props = defineProps<Props>();

interface Emits {
  (e: "hoverColor", color: string | null): void;
  (e: "selectColor", color: string): void;
}

const emit = defineEmits<Emits>();

const totalColors = Object.keys(annotationColorPresets).length;

const isNone = (color: string) => color === annotationColorPresets.None;

const onSelectColor = (color: string) => {
  emit("selectColor", color);
};

const isActive = (color: string) => {
  if (!props.activeColor) {
    return false;
  }

  return props.activeColor === color;
};
</script>

<template>
  <div class="color-selection-container">
    <FunctionButton
      v-for="(color, name, index) of annotationColorPresets"
      :key="index"
      class="color-button"
      :class="{ none: isNone(color) }"
      :active="isActive(color)"
      :title="isNone(color) ? 'None' : name"
      @mouseenter.stop="emit('hoverColor', color)"
      @mouseleave.stop="emit('hoverColor', null)"
      @click.stop="onSelectColor(color)"
    >
      <ColorIcon :color="color" filled />
    </FunctionButton>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.color-selection-container {
  display: grid;
  grid-template-columns: repeat(calc(v-bind("totalColors") / 3), 1fr);
  height: 100%;
  padding: 10px;
  gap: 4px;
}

.color-button {
  --item-size: 32;

  justify-self: center;
  width: calc(var(--item-size) * 1px);
  height: calc(var(--item-size) * 1px);
  padding: 0;
  justify-content: center;
  align-items: center;

  &.none {
    & svg {
      stroke: var(--knime-cornflower);
    }
  }

  &.active:not(.none) {
    background-color: var(--knime-cornflower);
  }

  &.active.none {
    background-color: white;
    box-shadow: inset 0 0 0 2px var(--knime-cornflower);
  }
}
</style>
