<script>
import CloseIcon from '@/assets/cancel.svg';

export default {
    components: {
        CloseIcon
    },
    props: {
        size: {
            type: Number,
            default: 28
        }
    }
};
</script>

<template>
  <button
    :style="`--size: ${size}`"
    @click="$emit('close', $event)"
  >
    <CloseIcon />
  </button>
</template>

<style scoped>
button {
  border: none;
  display: flex;
  align-items: center;
  background-color: transparent;

  & svg {
    border: 0;
    border-radius: calc(var(--size) * 1px);
    stroke: var(--knime-dove-gray);
    width: calc(var(--size) * 1px);
    height: calc(var(--size) * 1px);

    &:hover {
      cursor: pointer;
      background-color: var(--knime-silver-sand-semi);
      stroke: var(--knime-masala);
    }
  }
}
</style>
