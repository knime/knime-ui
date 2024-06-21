<script setup lang="ts">
interface Props {
  text?: string;
}

withDefaults(defineProps<Props>(), {
  text: "",
});
</script>

<template>
  <div class="legacy-description">
    {{ text }}
  </div>
</template>

<style lang="postcss" scoped>
.legacy-description {
  width: 100%;
  min-height: 150px;
  line-height: 150%;
  font-size: 13px;
  white-space: break-spaces;
}
</style>
