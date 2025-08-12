<script setup lang="ts">
import { FunctionButton } from "@knime/components";
import CloseIcon from "@knime/styles/img/icons/close.svg";

defineProps<{ title: string }>();
defineEmits<{ close: [] }>();
</script>

<template>
  <div class="header">
    <h1 class="title">{{ title }}</h1>

    <slot name="actions" />

    <FunctionButton
      title="Close panel"
      data-test-id="close-panel-btn"
      compact
      @click="$emit('close')"
    >
      <CloseIcon />
    </FunctionButton>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.header {
  display: flex;
  align-items: center;
  padding: var(--space-4) var(--space-16);
  border-bottom: 1px solid var(--knime-silver-sand);
  height: var(--space-32);
  gap: var(--space-4);

  & .title {
    margin: 0;
    font-weight: 700;
    font-size: 16px;
    line-height: 1.44;
    margin-right: auto;

    @mixin truncate;
  }
}
</style>
