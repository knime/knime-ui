<!-- A native button for use inside a toolbar. This is just used for styling. -->
<script setup lang="ts">
interface Props {
  withText?: boolean;
  primary?: boolean;
}

withDefaults(defineProps<Props>(), {
  withText: false,
  primary: false,
});
</script>

<template>
  <button :class="['button', { 'with-text': withText, primary }]" tabindex="0">
    <slot />
  </button>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

button {
  white-space: nowrap;
  display: flex;
  align-items: center;
  height: var(--kds-dimension-component-height-1-75x);
  border-radius: var(
    --kds-legacy-button-border-radius,
    var(--kds-border-radius-container-0-37x)
  );
  border: var(--kds-color-border-transparent);
  color: var(--kds-color-text-and-icon-neutral);
  background: transparent;
  outline: none;
  padding: 0;
  line-height: var(--kds-core-line-height-singleline);
  text-rendering: geometricprecision;

  &.with-text {
    font: var(--kds-font-base-interactive-medium-strong);
    padding-right: var(--kds-spacing-container-0-5x);
    padding-left: var(--kds-spacing-container-0-12x);
  }

  &.primary {
    background: var(--knime-yellow);
    border-color: var(--knime-yellow);
  }

  & :slotted(svg) {
    @mixin kds-svg-icon-size-medium;

    stroke: var(--kds-color-text-and-icon-neutral);
    margin: 0 var(--kds-spacing-container-0-37x) 0
      var(--kds-spacing-container-0-37x);
  }

  &:disabled {
    cursor: default;
    color: var(--kds-color-text-and-icon-disabled);

    & :deep(svg) {
      stroke: var(--kds-color-text-and-icon-disabled);
    }
  }

  &:not(:disabled) {
    cursor: pointer;

    &:focus-visible {
      outline: var(--kds-border-action-focused);
      outline-offset: 1px;

      & :slotted(svg) {
        stroke: var(--kds-color-text-and-icon-neutral);
      }
    }

    &:hover {
      background-color: var(--kds-color-background-neutral-hover);
      border-color: var(--kds-color-background-neutral-hover);
    }

    &:active {
      color: var(--kds-color-text-and-icon-neutral);
      background: var(--kds-color-background-neutral-active);
      border-color: var(--kds-border-action-transparent);
    }

    &:hover:focus {
      border-color: red;
    }
  }
}
</style>
