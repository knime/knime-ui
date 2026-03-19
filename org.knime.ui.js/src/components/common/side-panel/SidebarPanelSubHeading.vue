<template>
  <h3>
    <slot />
  </h3>
</template>

<style lang="postcss" scoped>
h3 {
  margin: var(--space-16) 0 var(--space-8);
  font-size: 16px;
  font-weight: 500;
  line-height: 36px;
  border-bottom: 1px solid var(--knime-silver-sand);
}
</style>
