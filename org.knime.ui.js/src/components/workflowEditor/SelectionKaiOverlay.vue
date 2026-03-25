<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { KdsButton } from "@knime/kds-components";

import { useIsKaiEnabled } from "@/composables/useIsKaiEnabled";
import { useShortcuts } from "@/services/shortcuts";
import { useAIAssistantStore } from "@/store/ai/aiAssistant";
import { useAiQuickActionsStore } from "@/store/ai/aiQuickActions";
import { QuickActionId } from "@/store/ai/types";
import { usePanelStore } from "@/store/panel";
import { useSelectionStore } from "@/store/selection";
import { useUIControlsStore } from "@/store/uiControls/uiControls";
import { useWorkflowStore } from "@/store/workflow/workflow";

const $shortcuts = useShortcuts();
const { isKaiEnabled } = useIsKaiEnabled();
const { getSelectedNodes } = storeToRefs(useSelectionStore());
const workflowStore = useWorkflowStore();
const panelStore = usePanelStore();
const uiControls = useUIControlsStore();

const hasSelection = computed(() => getSelectedNodes.value.length > 0);

const showKai = computed(
  () => isKaiEnabled.value && uiControls.canAccessKAIPanel,
);

const openKaiCompact = () => {
  panelStore.openKaiCompact();
};

const sendKaiPrompt = async (message: string) => {
  openKaiCompact();
  await useAIAssistantStore().makeAiRequest({ chainType: "qa", message });
};

const canJoinOrMerge = computed(() =>
  getSelectedNodes.value.length > 0 &&
  getSelectedNodes.value.every(
    (n) => n.allowedActions?.canCollapse !== "false",
  ),
);

const canAnnotate = computed(
  () =>
    isKaiEnabled.value &&
    useAiQuickActionsStore().isQuickActionAvailable(
      QuickActionId.GenerateAnnotation,
    ),
);
</script>

<template>
  <div v-if="workflowStore.isWritable" class="selection-kai-overlay">
    <KdsButton
      v-if="showKai"
      leading-icon="ai-general"
      title="Open K-AI"
      variant="outlined"
      size="xsmall"
      class="kai-icon-btn"
      aria-label="Open K-AI"
      @click="openKaiCompact"
    />

    <div v-if="showKai" class="separator" />

    <!-- Nothing selected: workflow-level quick actions -->
    <template v-if="!hasSelection">
      <KdsButton
        v-if="showKai"
        label="Show me around"
        leading-icon="ai-general"
        title="Show me around the KNIME interface"
        variant="outlined"
        size="xsmall"
        @click="sendKaiPrompt('Show me around the KNIME interface')"
      />
      <KdsButton
        v-if="showKai"
        label="Explain workflow"
        leading-icon="ai-general"
        title="Explain the workflow"
        variant="outlined"
        size="xsmall"
        @click="sendKaiPrompt('Explain the workflow')"
      />
      <KdsButton
        v-if="canAnnotate"
        label="Annotate"
        leading-icon="ai-general"
        title="Generate annotation with K-AI"
        variant="outlined"
        size="xsmall"
        @click="$shortcuts.dispatch('generateWorkflowAnnotation')"
      />
    </template>

    <!-- Something selected: selection-specific actions -->
    <template v-else>
      <KdsButton
        v-if="canJoinOrMerge"
        label="Join"
        leading-icon="component"
        title="Create component"
        variant="outlined"
        size="xsmall"
        @click="$shortcuts.dispatch('createComponent')"
      />
      <KdsButton
        v-if="canJoinOrMerge"
        label="Merge"
        leading-icon="metanode-add"
        title="Create metanode"
        variant="outlined"
        size="xsmall"
        @click="$shortcuts.dispatch('createMetanode')"
      />
      <KdsButton
        label="Visualize"
        leading-icon="circle-play"
        title="Execute and open view"
        variant="outlined"
        size="xsmall"
        @click="$shortcuts.dispatch('executeAndOpenView')"
      />
      <KdsButton
        v-if="canAnnotate"
        label="Annotate"
        leading-icon="ai-general"
        title="Generate annotation with K-AI"
        variant="outlined"
        size="xsmall"
        aria-label="Annotate selection with K-AI"
        @click="$shortcuts.dispatch('generateWorkflowAnnotation')"
      />
    </template>
  </div>
</template>

<style lang="postcss" scoped>
.selection-kai-overlay {
  background-color: var(--kds-color-surface-default);
  border-radius: var(--kds-border-radius-container-0-50x);
  box-shadow: var(--shadow-elevation-1);
  padding: var(--kds-spacing-container-0-25x);
  display: flex;
  align-items: center;
  gap: var(--kds-spacing-container-0-25x);
  user-select: none;
}

/* KAI coral brand border from the original center-stage design */
.kai-icon-btn:deep(button) {
  border-color: rgb(252 187 187);
}

.separator {
  width: 1px;
  align-self: stretch;
  background-color: rgb(26 26 26 / 20%);
  flex-shrink: 0;
}
</style>
