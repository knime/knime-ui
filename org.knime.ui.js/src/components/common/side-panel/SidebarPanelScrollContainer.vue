<script setup lang="ts">
import { nextTick, ref } from "vue";

const scrollableContainer = ref<HTMLElement>();

const scrollToBottom = async () => {
  if (!scrollableContainer.value) {
    return;
  }

  await nextTick();
  scrollableContainer.value.scrollTop = scrollableContainer.value.scrollHeight;
};

defineExpose({ scrollToBottom });
</script>

<template>
  <div ref="scrollableContainer" class="scrollable-container">
    <div class="content">
      <slot />
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.scrollable-container {
  --padding: var(--sidebar-panel-padding);

  width: calc(100% + var(--padding));
  flex: 1;
  overflow: hidden auto;

  & .content {
    width: calc(100% - var(--padding));
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
