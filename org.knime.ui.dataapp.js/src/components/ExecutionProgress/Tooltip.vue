<template>
  <div class="wrapper" tabindex="0">
    <div class="tooltip">
      <slot name="tooltip" />
    </div>
    <slot />
  </div>
</template>

<style lang="postcss" scoped>
.wrapper {
  position: relative;
  display: inline-block;

  & .tooltip,
  &::after {
    opacity: 0;
    transition: opacity 0.3s;
    transition-delay: 0.2s;
    pointer-events: none;
    z-index: 10000;
    position: absolute;
    top: -10px;
    left: 50%;
  }

  & .tooltip {
    white-space: nowrap;
    transform: translateX(-50%) translateY(-100%);
    font-size: 11px;
    line-height: 18px;
    font-weight: normal;
    padding: 4px 6px;
    min-width: 50px;
    background-color: var(--theme-tooltip-background-color);
    color: var(--theme-tooltip-foreground-color);
    box-shadow: 1px 1px 4px 0 var(--knime-gray-dark-semi);
  }

  &::after {
    content: " ";
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-top: 8px solid var(--knime-masala);
  }

  &:focus,
  &:hover {
    &::after,
    & .tooltip {
      opacity: 1;
    }
  }

  &:focus {
    outline: 0;
  }
}
</style>
