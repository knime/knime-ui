<script setup lang="ts">
import { FunctionButton } from "@knime/components";
import CircleHelp from "@knime/styles/img/icons/circle-help.svg";

type Props = {
  isSelected: boolean;
  isHovered: boolean;
};

defineProps<Props>();
const emit = defineEmits(["helpIconClick"]);
</script>

<template>
  <FunctionButton
    :class="[
      'description-icon',
      { 'selected-icon': isSelected, 'hovered-icon': isHovered },
    ]"
    @click="emit('helpIconClick')"
    @dblclick.stop
  >
    <CircleHelp class="info-icon" />
  </FunctionButton>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.description-icon {
  display: none;

  --description-button-size: 16;
  --size: calc(var(--description-button-size) * 1px);
  --icon-size: var(--description-button-size);

  &.selected-icon {
    display: flex;
    border-radius: 100%;
    background-color: var(--knime-masala);

    & .info-icon {
      stroke: var(--knime-white);
    }
  }

  &.hovered-icon:not(.selected-icon) {
    display: flex;

    & .info-icon {
      fill: var(--knime-white);
      stroke: var(--knime-masala);

      &:hover {
        fill: var(--theme-button-function-background-color-hover);
        stroke: var(--knime-masala);
      }
    }
  }
}
</style>
