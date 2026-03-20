<script setup lang="ts">
import type { Component } from "vue";

import type { FileExplorerItem } from "@knime/components";

interface Props {
  items: FileExplorerItem[];
  itemIconRenderer: (item: FileExplorerItem) => Component;
}

defineProps<Props>();
</script>

<template>
  <div class="items-to-delete">
    <span>Do you want to delete the following item(s):</span>
    <ul>
      <li v-for="(item, index) of items" :key="index">
        <Component :is="itemIconRenderer(item)" />
        {{ item.name }}
      </li>
    </ul>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.items-to-delete {
  & span {
    font-weight: bold;
  }

  & ul {
    max-height: 300px;
    padding: 8px 0;
    margin: 0;
    overflow-y: auto;
    list-style-type: none;

    & li {
      display: flex;
      gap: 4px;
      align-items: center;

      & svg {
        @mixin svg-icon-size 14;
      }
    }
  }
}
</style>
