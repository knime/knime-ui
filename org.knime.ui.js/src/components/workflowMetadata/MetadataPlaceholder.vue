<script>
export default {
  props: {
    text: {
      type: String,
      default: "",
    },
    padded: {
      type: Boolean,
      default: false,
    },
  },
};
</script>

<template>
  <div class="placeholder" :class="{ padded }">
    {{ text }}
  </div>
</template>

<style lang="postcss" scoped>
.placeholder {
  font-style: italic;
  color: var(--knime-dove-gray);

  &.padded {
    margin-top: 10px;
    font-size: 13px;
  }
}
</style>
