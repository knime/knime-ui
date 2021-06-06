<template>
  <span class="tag">
    <slot />
  </span>
</template>

<style lang="postcss" scoped>
@import "webapps-common/ui/css/variables";

.tag {
  border: 1px solid var(--knime-masala);
  padding: 2px 6px;
  font-size: 14px;
  line-height: 21px;
  margin-bottom: 10px;
  margin-right: 5px;
  background-color: var(--knime-white);
  color: var(--knime-black);
  cursor: pointer;

  & svg {
    position: relative;
    stroke-width: calc(32px / 14);
    margin-right: -2px;
    height: 9px;
    width: 9px;
    stroke: var(--knime-masala);
  }

  &:hover {
    color: var(--knime-white);
    background-color: var(--knime-masala);
    border-color: var(--knime-masala);

    & svg {
      stroke: var(--knime-white);
    }
  }

  &:active {
    color: var(--knime-white);
    background-color: var(--knime-black);
    border-color: var(--knime-black);

    & svg {
      stroke: var(--knime-white);
    }
  }
}

</style>
