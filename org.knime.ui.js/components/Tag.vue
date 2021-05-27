<template>
  <span class="tag">
    <slot />
  </span>
</template>

<style lang="postcss" scoped>
@import "webapps-common/ui/css/variables";

.tag {
  border: 1px solid var(--knime-dove-gray);
  margin-right: 5px;
  margin-bottom: 5px;
  padding: 0 6px;
  font-size: 10px;
  line-height: 17px;
  display: inline-block;
  font-weight: 500;
  color: var(--knime-dove-gray);
  cursor: pointer;

  & svg {
    position: relative;
    stroke-width: calc(32px / 14);
    margin-right: -3px;
    height: 7px;
    width: 7px;
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

@media only screen and (max-width: 900px) {
  .tag {
    font-size: 9px;
    line-height: 15px;
  }
}

</style>
