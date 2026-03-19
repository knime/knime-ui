<script>
export default {
  props: {
    color: {
      type: String,
      default: "default",
      validator: (value) => ["default", "primary", "light"].includes(value),
    },
  },
};
</script>

<template>
  <div
    class="card-header"
    :class="{
      default: color === 'default',
      primary: color === 'primary',
      light: color === 'light',
    }"
  >
    <slot />
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.card {
  & .card-header {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    width: 100%;
    height: 48px;
    padding: 0 30px;
    font-family: Roboto, sans-serif;
    font-size: 18px;
    font-weight: 700;
    line-height: 24px;
    color: var(--knime-white);
    background-color: var(--knime-masala);
    border-radius: 0 0 2px 2px;
    transition: all 150ms ease-out;

    & :slotted(svg) {
      stroke: var(--knime-white);

      @mixin svg-icon-size 20;
    }

    &.primary {
      color: var(--knime-masala);
      background-color: var(--knime-yellow);

      & :slotted(svg) {
        stroke: var(--knime-masala);
      }
    }

    &.light {
      color: var(--knime-masala);
      background-color: hsl(210deg 17% 98% / 100%);

      & :slotted(svg) {
        stroke: var(--knime-masala);
      }
    }
  }

  &:hover {
    & .card-header {
      background-color: var(--knime-black);
    }

    & .card-header.primary {
      color: var(--knime-white);
      background-color: var(--knime-masala);
    }

    & .card-header.light {
      color: var(--knime-white);
      background-color: hsl(210deg 17% 98% / 100%);
    }
  }
}
</style>
