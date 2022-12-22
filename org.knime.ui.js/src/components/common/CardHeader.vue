<script>

export default {
    props: {
        primary: {
            type: Boolean,
            default: false
        }
    }
};
</script>

<template>
  <div
    class="card-header"
    :class="{ primary }"
  >
    <slot />
  </div>
</template>

<style lang="postcss" scoped>
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
  }
}
</style>
