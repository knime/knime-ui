<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from "vue";
import { onClickOutside } from "@vueuse/core";

import { SearchInput } from "@knime/components";

import { usePanelStore } from "@/store/panel";
import RecentWorkflowsList from "../homepage/RecentWorkflowsList.vue";

const filterQuery = ref("");

const closePanel = () => {
  usePanelStore().isCommandPanelVisible = false;
};

onMounted(() => {
  const onEscape = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      closePanel();
      window.removeEventListener("keydown", onEscape);
    }
  };

  window.addEventListener("keydown", onEscape);
});

const commandPanelRef = useTemplateRef("commandPanel");
onClickOutside(commandPanelRef, closePanel);

const onSearchboxDown = (event: KeyboardEvent) => {
  if (event.key !== "ArrowDown") {
    return;
  }

  const table = document.querySelector(
    ".command-panel .file-explorer .scroll-container .file-explorer-item",
  );

  if (!table) {
    return;
  }

  (table as HTMLTableElement).focus({ preventScroll: true });
};
</script>

<template>
  <div ref="commandPanel" class="command-panel">
    <SearchInput
      v-model="filterQuery"
      focus-on-mount
      placeholder="Workflow name..."
      @keydown="onSearchboxDown"
    />

    <RecentWorkflowsList
      :filter-query="filterQuery"
      disable-context-menu
      @on-open="closePanel"
    />
  </div>
</template>

<style lang="postcss" scoped>
.command-panel {
  position: fixed;
  top: 100px;
  left: 0;
  right: 0;
  margin: auto;
  width: 50vh;
  aspect-ratio: 16 / 10;
  background: white;
  box-shadow: var(--shadow-elevation-2);
  padding: var(--space-16);
  border-radius: 8px;
  z-index: v-bind("$zIndices.layerFloatingWindows");
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}
</style>
