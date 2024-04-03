<script>
import CloseIcon from "@/assets/cancel.svg";
import DotIcon from "@/assets/dot.svg";

export default {
  components: {
    CloseIcon,
    DotIcon,
  },
  props: {
    hasUnsavedChanges: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["close"],
  data() {
    return {
      isHovered: false,
    };
  },
};
</script>

<template>
  <button @click="$emit('close', $event)">
    <DotIcon
      v-if="hasUnsavedChanges && !isHovered"
      @mouseover="isHovered = true"
    />
    <CloseIcon v-else @mouseleave="isHovered = false" />
  </button>
</template>

<style scoped>
@import url("@/assets/mixins.css");

button {
  border: none;
  display: flex;
  align-items: center;
  background-color: transparent;

  &:not([disabled]) svg {
    border: 0;
    border-radius: 50%;
    stroke: var(--knime-dove-gray);

    @mixin svg-icon-size 28;

    &:hover {
      cursor: pointer;
      background-color: var(--knime-silver-sand-semi);
      stroke: var(--knime-masala);
    }
  }

  &:focus-visible {
    outline: none;

    & svg {
      background-color: var(--knime-silver-sand-semi);
      stroke: var(--knime-masala);
    }
  }
}
</style>
