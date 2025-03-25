<script setup lang="ts">
import type { FunctionalComponent, SVGAttributes } from "vue";

import type { FileExplorerItem } from "@knime/components";

interface Props {
  items: FileExplorerItem[];
  itemIconRenderer: (
    item: FileExplorerItem,
  ) => FunctionalComponent<SVGAttributes>;
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
    margin: 0;
    padding: 8px 0;
    list-style-type: none;
    max-height: 300px;
    overflow-y: auto;

    & li {
      display: flex;
      align-items: center;
      gap: 4px;

      & svg {
        @mixin svg-icon-size 14;
      }
    }
  }
}
</style>
