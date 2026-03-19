<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import {
  KdsButton,
  type KdsButtonProps,
} from "@knime/kds-components";

import AutoSaveButton from "@/components/toolbar/AutoSyncButton.vue";
import SaveButton from "@/components/toolbar/SaveButton.vue";
import { toolbarButtonTitle } from "@/components/toolbar/toolbarButtonTitle";
import { useShortcuts } from "@/services/shortcuts";
import type { ShortcutName } from "@/services/shortcuts";
import { useSelectionStore } from "@/store/selection";
import { useUIControlsStore } from "@/store/uiControls/uiControls";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { useWorkflowVersionsStore } from "@/store/workflow/workflowVersions";

const $shortcuts = useShortcuts();
const uiControls = useUIControlsStore();
const { activeWorkflow } = storeToRefs(useWorkflowStore());
const { getSelectedNodes: selectedNodes } = storeToRefs(useSelectionStore());
const { activeProjectVersionsModeStatus } = storeToRefs(
  useWorkflowVersionsStore(),
);
const { isActiveWorkflowFixedVersion } = storeToRefs(useWorkflowStore());
const { isLocalSaveSupported, isAutoSyncSupported } = useUIControlsStore();

const isVersionModeActive = computed(
  () =>
    activeProjectVersionsModeStatus.value === "active" &&
    isActiveWorkflowFixedVersion.value,
);

const toolbarButtons = computed<Array<{ id: ShortcutName } & KdsButtonProps>>(
  () => {
    if (!activeWorkflow.value || !uiControls.canEditWorkflow) {
      return [];
    }

    const hasNodesSelected = selectedNodes.value.length > 0;
    const variant: KdsButtonProps["variant"] = "transparent";

    const visibleItems: Array<
      { id: ShortcutName; visible: boolean } & KdsButtonProps
    > = [
      {
        id: "undo",
        visible: true,
        leadingIcon: "undo",
        title: toolbarButtonTitle($shortcuts.get("undo")),
        disabled: !$shortcuts.isEnabled("undo"),
        variant,
      },
      {
        id: "redo",
        visible: true,
        leadingIcon: "redo",
        title: toolbarButtonTitle($shortcuts.get("redo")),
        disabled: !$shortcuts.isEnabled("redo"),
        variant,
      },
      {
        id: "executeAll",
        visible: !hasNodesSelected,
        leadingIcon: "execute-all",
        title: toolbarButtonTitle($shortcuts.get("executeAll")),
        disabled: !$shortcuts.isEnabled("executeAll"),
        variant,
      },
      {
        id: "cancelAll",
        visible: !hasNodesSelected,
        leadingIcon: "x-close",
        title: toolbarButtonTitle($shortcuts.get("cancelAll")),
        disabled: !$shortcuts.isEnabled("cancelAll"),
        variant,
      },
      {
        id: "resetAll",
        visible: !hasNodesSelected,
        leadingIcon: "reset-all",
        title: toolbarButtonTitle($shortcuts.get("resetAll")),
        disabled: !$shortcuts.isEnabled("resetAll"),
        variant,
      },
      {
        id: "executeSelected",
        visible: hasNodesSelected,
        leadingIcon: "selected-execution",
        title: toolbarButtonTitle($shortcuts.get("executeSelected")),
        disabled: !$shortcuts.isEnabled("executeSelected"),
        variant,
      },
      {
        id: "cancelSelected",
        visible: hasNodesSelected,
        leadingIcon: "selected-cancel",
        title: toolbarButtonTitle($shortcuts.get("cancelSelected")),
        disabled: !$shortcuts.isEnabled("cancelSelected"),
        variant,
      },
      {
        id: "resetSelected",
        visible: hasNodesSelected,
        leadingIcon: "selected-reset",
        title: toolbarButtonTitle($shortcuts.get("resetSelected")),
        disabled: !$shortcuts.isEnabled("resetSelected"),
        variant,
      },
      {
        id: "openLayoutEditor",
        visible: $shortcuts.isEnabled("openLayoutEditor"),
        leadingIcon: "layout-editor",
        title: toolbarButtonTitle($shortcuts.get("openLayoutEditor")),
        disabled: !$shortcuts.isEnabled("openLayoutEditor"),
        variant,
      },
    ];

    return visibleItems.filter(({ visible }) => visible);
  },
);
</script>

<template>
  <div v-if="activeWorkflow" class="canvas-overlay-center">
    <KdsButton
      v-if="isVersionModeActive"
      label="Close version history"
      leading-icon="chevron-left"
      variant="outlined"
      size="medium"
      @click="$shortcuts.dispatch('closeVersionHistory')"
    />

    <transition-group
      v-else
      tag="div"
      name="button-list"
      class="button-list"
    >
      <SaveButton v-if="isLocalSaveSupported" :key="'save'" />
      <AutoSaveButton v-if="isAutoSyncSupported" :key="'autosave'" />

      <KdsButton
        v-for="button in toolbarButtons"
        :key="button.id"
        v-bind="button"
        size="medium"
        @click="$shortcuts.dispatch(button.id)"
      />
    </transition-group>
  </div>
</template>

<style lang="postcss" scoped>
.canvas-overlay-center {
  display: flex;
  align-items: center;

  background-color: var(--kds-color-surface-default);
  border-radius: var(--kds-border-radius-container-0-50x);
  box-shadow: var(--shadow-elevation-1);
  padding: var(--kds-spacing-container-0-25x);
  gap: var(--kds-spacing-container-0-25x);

  & .button-list {
    display: flex;
    align-items: center;
    gap: var(--kds-spacing-container-0-25x);
    font-size: 14px;
    user-select: none;
  }
}

.button-list-leave-to,
.button-list-enter {
  opacity: 0;
}

.button-list-leave-active {
  position: absolute;
}
</style>
