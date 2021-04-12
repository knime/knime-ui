<!-- A native button for use inside a toolbar. This is just used for styling. -->
<template>
  <button tabindex="1">
    <slot />
  </button>
</template>

<style lang="postcss" scoped>
button {
  --icon-size: 30; /* +2*1px border */

  display: flex;
  align-items: center;
  height: calc((var(--icon-size) + 2) * 1px);
  border-radius: calc((var(--icon-size) + 2) / 2 * 1px);
  border: 1px solid var(--knime-silver-sand);
  color: var(--knime-masala);
  background: transparent;
  outline: none;
  padding: 0;
  margin-right: 5px;

  &.with-text {
    font-size: 13px;
    padding-right: 13px;
    padding-left: 4px;
  }

  & svg {
    width: calc(var(--icon-size) * 1px);
    height: calc(var(--icon-size) * 1px);
    stroke-width: calc(32px / var(--icon-size));
    stroke: var(--knime-masala);
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

      & svg {
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

    &:hover svg,
    &:active svg {
      stroke: var(--knime-white);
    }
  }
}
</style>
