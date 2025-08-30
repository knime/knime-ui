<script setup lang="ts">
import { Button } from "@knime/components";

import type { MenuItemWithHandler } from "../common/types";

type Props = {
  item: MenuItemWithHandler;
  disabled?: boolean;
};

defineProps<Props>();
</script>

<template>
  <Button
    :id="item.metadata?.id"
    :title="item.text"
    :aria-label="item.text"
    class="action-button"
    compact
    :aria-disabled="disabled || null"
    :disabled="disabled"
    @click="item.metadata?.handler?.()"
  >
    <Component
      :is="item.icon"
      class="icon"
      aria-hidden="true"
      focusable="false"
    />
    <span class="text">{{ item.text }}</span>
  </Button>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.button.action-button {
  margin-left: var(--space-4);
  border: 1px solid var(--knime-silver-sand);
  padding: var(--space-4) 14px;
  color: var(--knime-masala);

  --theme-button-function-foreground-color-hover: var(--knime-white);
  --theme-button-function-background-color-hover: var(--knime-masala);

  & .text {
    margin-left: var(--space-4);
  }

  & svg {
    @mixin svg-icon-size 18;

    stroke: var(--knime-masala);
  }

  &:hover,
  &:active,
  &:focus,
  &.expanded {
    cursor: pointer;
    border-color: var(--theme-button-function-background-color-hover);
    color: var(--theme-button-function-foreground-color-hover);
    background-color: var(--theme-button-function-background-color-hover);

    & svg {
      stroke: var(--knime-white);
    }
  }

  &[aria-disabled] {
    cursor: default;
    opacity: 0.6;

    &:hover,
    &:active,
    &:focus {
      border-color: var(--knime-silver-sand-semi);
      color: var(--knime-masala);
      background-color: transparent;
      cursor: default;
    }

    & svg.icon {
      stroke: var(--knime-masala);
    }
  }
}
</style>
