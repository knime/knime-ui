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
  --icon-size: 18;
  --icon-margin: 6;
  --icon-box-size: calc(var(--icon-size) + var(--icon-margin) * 2);

  display: flex;
  align-items: center;
  height: calc((var(--icon-box-size) + 2) * 1px);
  border-radius: calc((var(--icon-box-size) + 2) / 2 * 1px);
  border: 1px solid var(--knime-silver-sand);
  color: var(--knime-masala);
  background: transparent;
  outline: none;
  padding: 0;
  margin-right: 5px;
  line-height: 1;

  &.with-text {
    font-size: 13px;
    padding-right: 9px;
    padding-left: 2px;
  }

  &.primary {
    background: var(--knime-yellow);
    border-color: var(--knime-yellow);
  }

  & :slotted(svg) {
    @mixin svg-icon-size var(--icon-size);

    stroke: var(--knime-masala);
    margin: calc(var(--icon-margin) * 1px);
  }

  &:disabled {
    opacity: 0.25;
    cursor: default;
  }

  &:not(:disabled) {
    cursor: pointer;

    &:focus {
      background: var(--knime-white);
      color: var(--knime-black);
      border-color: var(--knime-black);

      & :slotted(svg) {
        stroke: var(--knime-black);
      }
    }

    &:hover {
      color: var(--knime-white);
      background: var(--knime-masala);
      border-color: var(--knime-masala);
    }

    &:active {
      color: var(--knime-white);
      background: var(--knime-black);
      border-color: var(--knime-black);
    }

    &:hover:focus {
      border-color: var(--knime-black);
    }

    &:hover :slotted(svg),
    &:active :slotted(svg) {
      stroke: var(--knime-white);
    }
  }
}
</style>
