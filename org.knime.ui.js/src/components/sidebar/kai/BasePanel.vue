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
  font-family: "Roboto";
  font-size: 13px;
  line-height: 150%;
  display: flex;
  flex-direction: column;
  padding: 8px 20px 20px;
  height: 100%;

  & .header {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;

    & h2 {
      margin: 0;
      font-weight: 500;
      font-size: 18px;
      line-height: 36px;
    }
  }

  & hr {
    margin: 5px 0 10px 0;
    border: none;
    border-top: 1px solid var(--knime-silver-sand);
  }
}
</style>
