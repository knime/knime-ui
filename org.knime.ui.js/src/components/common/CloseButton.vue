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
    disabled: {
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
  <button
    :disabled="disabled"
    aria-label="Close"
    @click="$emit('close', $event)"
  >
    <DotIcon
      v-if="hasUnsavedChanges && !isHovered"
      aria-hidden="true"
      focusable="false"
      @mouseover="isHovered = !disabled"
    />
    <CloseIcon
      v-else
      aria-hidden="true"
      focusable="false"
      @mouseleave="isHovered = false"
    />
  </button>
</template>

<style scoped>
@import url("@/assets/mixins.css");

button {
  border: none;
  display: flex;
  align-items: center;
  background-color: transparent;

  & svg {
    border: 0;
    border-radius: 50%;
    stroke: var(--knime-dove-gray);

    @mixin svg-icon-size 28;
  }

  &:focus-visible {
    outline: none;

    & svg {
      background-color: var(--knime-silver-sand-semi);
      stroke: var(--knime-masala);
    }
  }

  &:not(:disabled) svg:hover {
    cursor: pointer;
    background-color: var(--knime-silver-sand-semi);
    stroke: var(--knime-masala);
  }
}
</style>
