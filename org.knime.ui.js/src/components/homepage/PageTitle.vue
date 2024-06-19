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
  justify-content: space-between;
  align-items: center;
  font-weight: 700;
  font-size: 20px;
  padding-bottom: 20px;
  flex-wrap: wrap;
  gap: 4px;
}
</style>
