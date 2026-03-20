<template>
  <div class="panel-layout">
    <div class="panel-header">
      <slot name="header" />
    </div>
    <hr />
    <slot />
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.panel-layout {
  --padding: var(--sidebar-panel-padding);

  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 8px var(--padding) var(--padding);
  font-family: Roboto, sans-serif;
  font-size: 13px;
  line-height: 150%;

  & .panel-header {
    display: flex;
    flex-direction: row;
    align-items: center;
    min-height: 36px;

    & :slotted(h2) {
      margin: 0;
      margin-right: auto;
      font-size: 18px;
      font-weight: 400;
      line-height: 36px;

      @mixin truncate;
    }
  }

  & hr {
    margin: 5px 0 10px;
    border: none;
    border-top: 1px solid var(--knime-silver-sand);
  }
}
</style>
