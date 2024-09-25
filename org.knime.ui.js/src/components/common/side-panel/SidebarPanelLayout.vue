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
.panel-layout {
  --padding: var(--sidebar-panel-padding);

  font-family: Roboto, sans-serif;
  font-size: 13px;
  line-height: 150%;
  display: flex;
  flex-direction: column;
  padding: 8px var(--padding) var(--padding);
  height: 100%;

  & .panel-header {
    display: flex;
    flex-direction: row;
    align-items: center;
    position: relative;
    min-height: 36px;

    & :slotted(h2) {
      margin: 0;
      font-weight: 400;
      font-size: 18px;
      line-height: 36px;
      margin-right: auto;
    }
  }

  & :deep(h3.subheading) {
    font-size: 16px;
    font-weight: 500;
    line-height: 36px;
    margin: var(--space-16) 0 var(--space-8);
    border-bottom: 1px solid var(--knime-silver-sand);
  }

  & hr {
    margin: 5px 0 10px;
    border: none;
    border-top: 1px solid var(--knime-silver-sand);
  }
}
</style>
