<script>
import CloseIcon from '@/assets/cancel.svg';

export default {
    components: {
        CloseIcon
    },

    emits: ['close']
};
</script>

<template>
  <button @click="$emit('close', $event)">
    <CloseIcon />
  </button>
</template>

<style scoped>
@import "@/assets/mixins.css";

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

    &:hover {
      cursor: pointer;
      background-color: var(--knime-silver-sand-semi);
      stroke: var(--knime-masala);
    }
  }
}
</style>
