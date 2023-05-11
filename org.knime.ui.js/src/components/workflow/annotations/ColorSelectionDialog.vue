<script setup lang="ts">
import * as knimeColors from 'webapps-common/ui/colors/knimeColors.mjs';
import FunctionButton from 'webapps-common/ui/components/FunctionButton.vue';

import ColorIcon from './ColorIcon.vue';

const colors = [
    'none',
    knimeColors.Avocado,
    knimeColors.Carrot,
    knimeColors.Coral,
    knimeColors.Meadow,
    knimeColors.Petrol,
    knimeColors.CornflowerLight,
    knimeColors.Cornflower,
    knimeColors.CornflowerDark,
    knimeColors.LavenderLight,
    knimeColors.Lavender,
    knimeColors.HibiscusLight,
    knimeColors.Hibiscus,
    knimeColors.Wood,
    knimeColors.SilverSand
];

interface Props {
    activeColor: string | null;
}

defineProps<Props>();

interface Emits {
    (e: 'hover-color', color: string): void;
    (e: 'select-color', color: string): void;
}

const emit = defineEmits<Emits>();

</script>

<template>
  <div class="color-selection-container">
    <FunctionButton
      v-for="(color, index) of colors"
      :key="index"
      class="color-button"
      :class="{ none: color === 'none' }"
      :active="activeColor === color"
      @mouseenter.stop="emit('hover-color', color)"
      @mouseleave.stop="emit('hover-color', null)"
      @click.stop="emit('select-color', color)"
    >
      <ColorIcon
        :color="color"
        filled
      />
    </FunctionButton>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.color-selection-container {
  display: grid;
  grid-template-columns: repeat(calc(v-bind("colors.length") / 3), 1fr);
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
