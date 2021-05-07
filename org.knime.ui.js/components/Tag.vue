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
}

svg {
  position: relative;
  top: 3px;
  width: 14px;
  height: 14px;
  stroke-width: calc(32px / 14);
  stroke: var(--knime-white);
  margin-right: 3px;
}

@media only screen and (max-width: 900px) {
  .tag {
    font-size: 9px;
    line-height: 15px;
  }
}

</style>
