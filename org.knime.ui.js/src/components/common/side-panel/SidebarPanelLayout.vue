<script setup lang="ts">
import { inject } from "vue";

import { FunctionButton } from "@knime/components";
import CloseIcon from "@knime/styles/img/icons/close.svg";

const fpClose = inject<(() => void) | null>("fpClose", null);
</script>

<template>
  <div class="panel-layout">
    <div class="panel-header">
      <slot name="header" />
      <FunctionButton v-if="fpClose" compact class="panel-close-btn" @click="fpClose">
        <CloseIcon />
      </FunctionButton>
    </div>
    <hr />
    <slot />
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

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
    min-height: 36px;

    & :slotted(h2) {
      margin: 0;
      font-weight: 400;
      font-size: 18px;
      line-height: 36px;
      margin-right: auto;

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
