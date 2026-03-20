<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<template>
  <div class="page-title">
    <span>{{ title }}</span>
    <slot name="append" />
  </div>
</template>

<style lang="postcss" scoped>
.page-title {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 20px;
  font-size: 20px;
  font-weight: 700;
}
</style>
