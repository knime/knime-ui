<script setup lang="ts"></script>

<template>
  <main ref="main">
    <div class="header-wrapper">
      <slot name="header" />
    </div>

    <div class="toolbar-wrapper">
      <slot name="toolbar" />
    </div>

    <div class="content-wrapper">
      <slot name="content" />
    </div>
  </main>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

main {
  --padding: 30px;

  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--knime-porcelain);
  border-left: 1px solid var(--knime-silver-sand);

  & .header-wrapper {
    padding: var(--padding) var(--padding) 10px;
  }

  & .toolbar-wrapper {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    min-height: 50px;
    padding: 0 var(--padding);
    background-color: var(--knime-gray-ultra-light);
    border-top: 1px solid var(--knime-silver-sand);
    border-bottom: 1px solid var(--knime-silver-sand);
  }

  & .content-wrapper {
    height: 100%;
    padding: var(--padding);
    overflow: hidden auto;
  }
}
</style>
