<script setup lang="ts">
import { computed } from "vue";

import { useHint } from "@knime/components";
import { KdsToggleButton } from "@knime/kds-components";
import type { KdsIconName } from "@knime/kds-components";

import { useIsKaiEnabled } from "@/composables/useIsKaiEnabled";
import { HINTS } from "@/hints/hints.config";
import { TABS, type TabValues, usePanelStore } from "@/store/panel";
import { useUIControlsStore } from "@/store/uiControls/uiControls";

type ButtonDef = {
  name: TabValues;
  title: string;
  icon: KdsIconName;
};

const panelStore = usePanelStore();
const uiControls = useUIControlsStore();
const { isKaiEnabled } = useIsKaiEnabled();
const { createHint } = useHint();

createHint({
  hintId: HINTS.K_AI,
  isVisibleCondition: computed(() => !panelStore.isTabActive(TABS.KAI)),
});

const buttons = computed<ButtonDef[]>(() => [
  {
    name: TABS.CONTEXT_AWARE_DESCRIPTION,
    title: "Info",
    icon: "circle-info",
  },
  ...(uiControls.canAccessNodeRepository
    ? [{ name: TABS.NODE_REPOSITORY as TabValues, title: "Nodes", icon: "node-stack" as KdsIconName }]
    : []),
  ...(uiControls.canAccessSpaceExplorer
    ? [{ name: TABS.SPACE_EXPLORER as TabValues, title: "Explorer", icon: "space" as KdsIconName }]
    : []),
  ...(isKaiEnabled.value && uiControls.canAccessKAIPanel
    ? [{ name: TABS.KAI as TabValues, title: "K-AI", icon: "ai-general" as KdsIconName }]
    : []),
  {
    name: TABS.WORKFLOW_MONITOR,
    title: "Monitor",
    icon: "workflow",
  },
]);

const isActive = (name: TabValues) =>
  panelStore.isTabActive(name) && panelStore.isLeftPanelExpanded;

const handleToggle = (name: TabValues, newValue: boolean) => {
  if (!newValue) {
    panelStore.isLeftPanelExpanded = false;
  } else {
    panelStore.setCurrentProjectActiveTab(name);
    panelStore.isLeftPanelExpanded = true;
    panelStore.closeExtensionPanel();
  }
};
</script>

<template>
  <div class="canvas-overlay-toolbar" role="toolbar" aria-label="Panel controls">
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
      :class="{ 'k-ai-btn': btn.name === TABS.KAI }"
      @update:model-value="(v) => handleToggle(btn.name, v)"
    />
  </div>
</template>

<style lang="postcss" scoped>
.canvas-overlay-toolbar {
  position: fixed;
  z-index: v-bind("$zIndices.layerStaticPanelDecorations");
  left: var(--kds-spacing-container-0-75x);
  top: calc(var(--app-toolbar-height) + var(--kds-spacing-container-3x) + var(--kds-spacing-container-0-37x));
  display: flex;
  flex-direction: column;

  /* Group buttons inside a single bordered pill */
  background-color: var(--kds-color-surface-default);
  border-radius: var(--kds-border-radius-container-0-50x);
  box-shadow: var(--shadow-elevation-1);
  overflow: hidden;
  padding: var(--kds-spacing-container-0-25x);
  gap: var(--kds-spacing-container-0-25x);
}

</style>
