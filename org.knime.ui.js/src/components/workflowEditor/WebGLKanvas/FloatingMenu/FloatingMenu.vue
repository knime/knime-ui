<script setup lang="ts">
defineOptions({ inheritAttrs: false });
</script>

<template>
  <Portal to="canvas-anchored-container">
    <slot />
  </Portal>
</template>

<style lang="postcss" scoped></style>
