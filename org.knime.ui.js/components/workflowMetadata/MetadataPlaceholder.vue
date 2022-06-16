<script>
export default {
    props: {
        text: {
            type: String,
            default: ''
        },
        padded: {
            type: Boolean,
            default: false
        }
    }
};
</script>

<template>
  <span
    class="placeholder"
    :class="{ padded }"
  >
    {{ text }}
  </span>
</template>

<style lang="postcss" scoped>
.placeholder {
  font-style: italic;
  color: var(--knime-dove-gray);

  &.padded {
    padding-top: 10px;
  }
}
</style>
