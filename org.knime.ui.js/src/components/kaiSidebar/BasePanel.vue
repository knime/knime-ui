<template>
  <div class="kai-base-panel">
    <div class="header">
      <h2>KNIME AI Assistant</h2>
      <slot name="headerControls" />
    </div>
    <hr />
    <slot />
  </div>
</template>

<style lang="postcss" scoped>
.kai-base-panel {
  font-family: Roboto, sans-serif;
  font-size: 13px;
  line-height: 150%;
  display: flex;
  flex-direction: column;
  padding: 8px 20px 20px;
  height: 100%;

  & .header {
    display: flex;
    flex-direction: row;
    align-items: center;

    & h2 {
      margin: 0;
      font-weight: 400;
      font-size: 18px;
      line-height: 36px;
      margin-right: auto;
    }
  }

  & hr {
    margin: 5px 0 10px;
    border: none;
    border-top: 1px solid var(--knime-silver-sand);
  }
}
</style>
