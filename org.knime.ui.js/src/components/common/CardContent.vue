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
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    max-width: 100%;
    min-height: 150px;
    background: var(--knime-white);

    &.centered {
      align-items: center;
      justify-content: center;
    }

    &.padded {
      padding: 20px 30px;
    }
  }
}
</style>
