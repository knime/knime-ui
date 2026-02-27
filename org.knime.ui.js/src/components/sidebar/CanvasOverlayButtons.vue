<script setup lang="ts">
import { type Component, computed } from "vue";

import { useHint } from "@knime/components";
import AiIcon from "@knime/styles/img/icons/ai-general.svg";
import CubeIcon from "@knime/styles/img/icons/cube.svg";
import PlusIcon from "@knime/styles/img/icons/node-stack.svg";

import MetainfoIcon from "@/assets/metainfo.svg";
import WorkflowMonitorIcon from "@/assets/workflow-monitor-icon.svg";
import { useIsKaiEnabled } from "@/composables/useIsKaiEnabled";
import { HINTS } from "@/hints/hints.config";
import { TABS, type TabValues, usePanelStore } from "@/store/panel";
import { useUIControlsStore } from "@/store/uiControls/uiControls";

type ButtonDef = {
  name: TabValues;
  title: string;
  icon: Component;
  classes?: string[];
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
    icon: MetainfoIcon,
  },
  ...(uiControls.canAccessNodeRepository
    ? [{ name: TABS.NODE_REPOSITORY as TabValues, title: "Nodes", icon: PlusIcon }]
    : []),
  ...(uiControls.canAccessSpaceExplorer
    ? [{ name: TABS.SPACE_EXPLORER as TabValues, title: "Explorer", icon: CubeIcon }]
    : []),
  ...(isKaiEnabled.value && uiControls.canAccessKAIPanel
    ? [{ name: TABS.KAI as TabValues, title: "K-AI", icon: AiIcon, classes: ["k-ai-btn"] }]
    : []),
  {
    name: TABS.WORKFLOW_MONITOR,
    title: "Monitor",
    icon: WorkflowMonitorIcon,
  },
]);

const isActive = (name: TabValues) =>
  panelStore.isTabActive(name) && panelStore.isLeftPanelExpanded;

const handleClick = (name: TabValues) => {
  if (panelStore.isTabActive(name) && panelStore.isLeftPanelExpanded) {
    panelStore.isLeftPanelExpanded = false;
  } else {
    panelStore.setCurrentProjectActiveTab(name);
    panelStore.isLeftPanelExpanded = true;
    panelStore.closeExtensionPanel();
  }
};
</script>

<template>
  <div class="canvas-overlay-buttons">
    <button
      v-for="btn in buttons"
      :key="btn.name"
      :title="btn.title"
      :class="['overlay-btn', ...(btn.classes ?? []), { active: isActive(btn.name) }]"
      :aria-pressed="isActive(btn.name)"
      @click="handleClick(btn.name)"
    >
      <Component :is="btn.icon" class="btn-icon" aria-hidden="true" focusable="false" />
    </button>
  </div>
</template>

<style lang="postcss" scoped>
.canvas-overlay-buttons {
  position: fixed;
  z-index: v-bind("$zIndices.layerStaticPanelDecorations");
  left: var(--space-12, 12px);
  top: calc(var(--app-toolbar-height) + 54px);
  display: flex;
  flex-direction: column;
  gap: var(--space-4, 4px);
}

.overlay-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 48px;
  height: 52px;
  padding: 4px 2px;
  border: 1px solid var(--knime-silver-sand);
  border-radius: 6px;
  background-color: var(--kds-color-surface-default, white);
  cursor: pointer;
  transition: background-color 120ms ease-out, box-shadow 120ms ease-out;
  box-shadow: 0 1px 3px rgb(0 0 0 / 12%);

  & .btn-icon {
    width: 18px;
    height: 18px;
    stroke: var(--knime-masala);
    flex-shrink: 0;
  }

  & .btn-label {
    font-size: 9px;
    font-weight: 500;
    color: var(--knime-masala);
    line-height: 1;
  }

  &:hover {
    background-color: var(--knime-gray-ultra-light);
    box-shadow: 0 2px 6px rgb(0 0 0 / 18%);
  }

  &:focus-visible {
    outline: 2px solid var(--knime-cornflower);
    outline-offset: 2px;
  }

  &.active {
    background-color: var(--knime-cornflower-semi);
    border-color: var(--knime-cornflower);

    & .btn-icon {
      stroke: var(--knime-cornflower-dark);
    }

    & .btn-label {
      color: var(--knime-cornflower-dark);
    }
  }

  &.k-ai-btn {
    &.active {
      background-color: var(--knime-yellow-semi, hsl(51deg 100% 50% / 15%));
      border-color: var(--knime-yellow, hsl(51deg 100% 50%));

      & .btn-icon {
        stroke: var(--knime-masala);
      }
    }
  }
}
</style>
