<template>
  <div class="card">
    <slot name="header" />

    <slot name="content" />
  </div>
</template>

<style lang="postcss" scoped>
.card {
  min-width: 300px;
  padding: 0;
  background-color: var(--knime-gray-ultra-light);
  border: 0;
  box-shadow: 0 0 4px var(--knime-gray-dark-semi);
  transition: all 150ms ease-out;
  height: 100%;

  &:hover {
    box-shadow: 0 2px 10px 0 var(--knime-gray-dark-semi);
    cursor: pointer;

    & .icon svg {
      stroke: var(--knime-masala);
    }
  }
}
</style>
