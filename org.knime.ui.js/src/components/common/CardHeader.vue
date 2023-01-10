<script>

export default {
    props: {
        color: {
            type: String,
            default: 'default',
            validator: (value) => ['default', 'primary', 'light'].includes(value)
        }
    }
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
@import "@/assets/mixins.css";

.card {
  & .card-header {
    background-color: var(--knime-masala);
    color: var(--knime-white);
    font-family: Roboto, sans-serif;
    font-size: 18px;
    font-weight: 700;
    line-height: 24px;
    border-radius: 0 0 2px 2px;
    transition: all 150ms ease-out;
    height: 48px;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: 0 30px;

    &.primary {
      background-color: var(--knime-yellow);
      color: var(--knime-masala);

      & svg {
        stroke: var(--knime-masala)
      }
    }
    
    &.light {
      background-color: hsla(210, 17%, 98%, 1);
      color: var(--knime-masala);

      & svg {
        stroke: var(--knime-masala)
      }
    }

    & svg {
      stroke: var(--knime-white);

      @mixin svg-icon-size 20;
    }
  }
  
  &:hover {
    & .card-header {
      background-color: var(--knime-black);
    }

    & .card-header.primary {
      background-color: var(--knime-masala);
      color: var(--knime-white);
    }
    
    & .card-header.light {
      background-color: hsla(210, 17%, 98%, 1);
      color: var(--knime-white);
    }
  }
}
</style>
