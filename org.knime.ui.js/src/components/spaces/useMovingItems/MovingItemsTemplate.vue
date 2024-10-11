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
    <p>Following workflows are opened:</p>
    <ul>
      <li v-for="(name, index) in openedItemNames" :key="index">
        <WorkflowIcon />
        {{ name }}
      </li>
    </ul>
    <p>To {{ copyOrMove }} your selected items, they have to be closed first</p>
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
