<script setup lang="ts">
import { Description } from "@knime/components";

type Props = {
  value: string;
};

defineProps<Props>();
</script>

<template>
  <Description class="node-description-html" :text="value" render-as-html />
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

& .node-description-html {
  font-size: 13px;
  line-height: 150%;

  & :deep(h3),
  & :deep(h4) {
    font-size: 13px;
  }

  /* Style refinement for Code */
  & :deep(tt),
  & :deep(pre),
  & :deep(code),
  & :deep(samp) {
    font-size: 11px;
    line-height: 150%;
  }

  /* Style refinement for Tables */
  & :deep(table) {
    width: 100%;
    font-size: 11px;
    border-spacing: 3px 0;
    margin-left: var(--sidebar-panel-padding);

    & th,
    & td {
      padding: 2px 0;
    }
  }
}
</style>
