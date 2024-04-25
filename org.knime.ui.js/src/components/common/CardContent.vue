<script>
export default {
  props: {
    centered: {
      type: Boolean,
      default: true,
    },

    padded: {
      type: Boolean,
      default: false,
    },
  },
};
</script>

<template>
  <div class="card-content" :class="{ centered, padded }">
    <slot />
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.card {
  & .card-content {
    min-height: 150px;
    background: var(--knime-white);
    display: flex;
    flex-direction: column;
    max-width: 100%;

    &.centered {
      justify-content: center;
      align-items: center;
    }

    &.padded {
      padding: 20px 30px;
    }

    justify-content: flex-start;
    align-items: flex-start;
  }
}
</style>
