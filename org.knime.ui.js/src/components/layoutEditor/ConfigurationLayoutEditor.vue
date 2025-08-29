<script setup lang="ts">
import { storeToRefs } from "pinia";
import Draggable from "vuedraggable";

import { useLayoutEditorStore } from "@/store/layoutEditor/layoutEditor";

import KnimeView from "./layout/KnimeView.vue";

const layoutEditorStore = useLayoutEditorStore();
const { configurationLayout, configurationNodes } =
  storeToRefs(layoutEditorStore);
</script>

<template>
  <Draggable
    v-if="configurationLayout.rows.length"
    v-model="configurationLayout.rows"
    class="layout"
    item-key="id"
  >
    <template #item="{ element, index }">
      <KnimeView
        :key="index"
        :nodes="configurationNodes"
        :view="element.columns[0].content[0]"
        class="item"
      />
    </template>
  </Draggable>

  <p v-else class="hint">
    This component doesn't contain any configuration nodes.
  </p>
</template>

<style scoped lang="postcss">
.layout {
  height: 100%;
  overflow-y: auto;

  & .item {
    cursor: move;
    margin: 5px 0;
    min-height: 90px !important;
  }
}

.hint {
  height: 50vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
