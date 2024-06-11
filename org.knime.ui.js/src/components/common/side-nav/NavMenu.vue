<script setup lang="ts"></script>

<template>
  <ul v-bind="$attrs" class="sidebar-nav">
    <slot />
  </ul>
</template>

<style lang="postcss" scoped>
/* list style reset */
.sidebar-nav,
.sidebar-nav :deep(ul) {
  margin: 0;
  list-style-type: none;
  padding: 0;
}
</style>
