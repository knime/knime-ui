<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { KdsToggleButton } from "@knime/kds-components";
import type { KdsIconName } from "@knime/kds-components";

import WorkflowNameBreadcrumb from "@/components/toolbar/WorkflowNameBreadcrumb.vue";
import { TABS, type TabValues, usePanelStore } from "@/store/panel";
import { useUIControlsStore } from "@/store/uiControls/uiControls";
import { useWorkflowStore } from "@/store/workflow/workflow";

type ButtonDef = {
  name: TabValues;
  title: string;
  icon: KdsIconName;
};

const panelStore = usePanelStore();
const uiControls = useUIControlsStore();
const { activeWorkflow } = storeToRefs(useWorkflowStore());
const { isSearchPanelOpen } = storeToRefs(panelStore);

const buttons = computed<ButtonDef[]>(() => [
  ...(uiControls.canAccessSpaceExplorer
    ? [{ name: TABS.SPACE_EXPLORER as TabValues, title: "Explorer", icon: "space" as KdsIconName }]
    : []),
  {
    name: TABS.WORKFLOW_MONITOR,
    title: "Monitor",
    icon: "error-panel" as KdsIconName,
  },
]);

const isActive = (name: TabValues) =>
  panelStore.isTabActive(name) && panelStore.isLeftPanelExpanded;

const handleToggle = (name: TabValues, newValue: boolean) => {
  if (newValue) {
    panelStore.setCurrentProjectActiveTab(name);
    panelStore.isLeftPanelExpanded = true;
    panelStore.closeExtensionPanel();
  } else {
    panelStore.isLeftPanelExpanded = false;
  }
};
</script>

<template>
  <div class="canvas-overlay-top-left">
    <!-- Workflow name / breadcrumb -->
    <div v-if="activeWorkflow" class="breadcrumb-pill">
      <WorkflowNameBreadcrumb :workflow="activeWorkflow" />
    </div>

    <!-- Sidebar panel toggle buttons -->
    <div class="panel-buttons" role="toolbar" aria-label="Panel controls">
      <KdsToggleButton
        v-for="btn in buttons"
        :key="btn.name"
        :model-value="isActive(btn.name)"
        :leading-icon="btn.icon"
        :aria-label="btn.title"
        :title="btn.title"
        variant="transparent"
        size="medium"
        class="toolbar-btn"
        @update:model-value="(v: boolean) => handleToggle(btn.name, v)"
      />
      <KdsToggleButton
        :model-value="isSearchPanelOpen"
        leading-icon="search"
        aria-label="Search workflow (⌘F)"
        title="Search workflow (⌘F)"
        variant="transparent"
        size="medium"
        class="toolbar-btn"
        @update:model-value="(v: boolean) => (panelStore.isSearchPanelOpen = v)"
      />
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.canvas-overlay-top-left {
  position: fixed;
  z-index: v-bind("$zIndices.layerStaticPanelDecorations");
  left: var(--kds-spacing-container-0-75x);
  top: calc(var(--kds-spacing-container-0-75x) + 40px);
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--kds-spacing-container-0-5x);
}

.breadcrumb-pill {
  background-color: var(--kds-color-surface-default);
  border-radius: var(--kds-border-radius-container-0-50x);
  box-shadow: var(--shadow-elevation-1);
  padding: var(--kds-spacing-container-0-25x) var(--kds-spacing-container-0-75x);
  height: 40px;
  display: flex;
  align-items: center;
  font-size: var(--kds-core-font-size-0-87x);
}

.panel-buttons {
  background-color: var(--kds-color-surface-default);
  border-radius: var(--kds-border-radius-container-0-50x);
  box-shadow: var(--shadow-elevation-1);
  padding: var(--kds-spacing-container-0-25x);
  display: flex;
  flex-direction: row;
  gap: var(--kds-spacing-container-0-25x);
  font-size: 14px;
  user-select: none;
}
</style>
