<template>
  <div class="card-content">
    <slot />
  </div>
</template>

<style lang="postcss" scoped>
.card {
  & .card-content {
    min-height: 150px;
    height: calc(100% - 48px);
    background: var(--knime-white);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
}
</style>
