<script setup lang="ts">
import { computed } from "vue";

import WorkflowIcon from "@knime/styles/img/icons/workflow.svg";

type Props = {
  openedItemNames: string[];
  isCopy: boolean;
};

const props = defineProps<Props>();

const copyOrMove = computed(() => (props.isCopy ? "copy" : "move"));
</script>

<template>
  <div>
    <p>The following items are currently open:</p>
    <ul>
      <li v-for="(name, index) in openedItemNames" :key="index">
        <WorkflowIcon />
        {{ name }}
      </li>
    </ul>
    <!-- avoid whitespace at beginning of text -->
    <!-- prettier-ignore -->
    <p>To {{ copyOrMove }} the selected items, these have to be closed first.</p>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

ul {
  padding-left: var(--space-24);

  & li {
    font-size: 13px;

    & svg {
      @mixin svg-icon-size 14;
    }
  }
}
</style>
