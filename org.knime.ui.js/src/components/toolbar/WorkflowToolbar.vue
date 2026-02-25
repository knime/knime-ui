<script setup lang="ts">
import { computed, onMounted, useTemplateRef } from "vue";
import { API } from "@api";
import { storeToRefs } from "pinia";

import { type MenuItem, SubMenu, useHint } from "@knime/components";
import {
  KdsButton,
  type KdsButtonProps,
  useKdsDynamicModal,
} from "@knime/kds-components";
import ArrowMoveIcon from "@knime/styles/img/icons/arrow-move.svg";
import { getMetaOrCtrlKey } from "@knime/utils";

import { WorkflowInfo } from "@/api/gateway-api/generated-api";
import AnnotationModeIcon from "@/assets/annotation-mode.svg";
import SelectionModeIcon from "@/assets/selection-mode.svg";
import { useUploadWorkflowToSpace } from "@/composables/useWorkflowUploadToHub";
import { isBrowser } from "@/environment";
import { HINTS } from "@/hints/hints.config";
import { useShortcuts } from "@/plugins/shortcuts";
import type { ShortcutName } from "@/shortcuts";
import { useApplicationStore } from "@/store/application/application";
import {
  type CanvasMode,
  useCanvasModesStore,
} from "@/store/application/canvasModes";
import { useDirtyProjectsTrackingStore } from "@/store/application/dirtyProjectsTracking";
import { useHostContextStore } from "@/store/application/hostContext";
import { useSelectionStore } from "@/store/selection";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { useUIControlsStore } from "@/store/uiControls/uiControls";
import { useDesktopInteractionsStore } from "@/store/workflow/desktopInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { useWorkflowVersionsStore } from "@/store/workflow/workflowVersions";
import { getToastPresets } from "@/toastPresets";
import HelpMenu from "../application/HelpMenu.vue";
import { useCanvasRendererUtils } from "../workflowEditor/util/canvasRenderer";

import AutoSaveButton from "./AutoSyncButton.vue";
import SaveButton from "./SaveButton.vue";
import WorkflowBreadcrumb from "./WorkflowBreadcrumb.vue";
import ZoomMenu from "./ZoomMenu.vue";
import { toolbarButtonTitle } from "./toolbarButtonTitle";

/**
 * A toolbar shown on top of a workflow canvas. Contains action buttons and breadcrumb.
 */
const $shortcuts = useShortcuts();
const uiControls = useUIControlsStore();
const workflowVersionsStore = useWorkflowVersionsStore();
const { activeProjectId, activeProjectOrigin, isUnknownProject } = storeToRefs(
  useApplicationStore(),
);
const { activeWorkflow, isWorkflowEmpty, isActiveWorkflowFixedVersion } =
  storeToRefs(useWorkflowStore());
const { getSelectedNodes: selectedNodes } = storeToRefs(useSelectionStore());
const canvasModesStore = useCanvasModesStore();
const { hasAnnotationModeEnabled, hasPanModeEnabled, hasSelectionModeEnabled } =
  storeToRefs(canvasModesStore);
const { getCommunityHubInfo } = storeToRefs(useSpaceProvidersStore());
const { activeProjectVersionsModeStatus } = storeToRefs(workflowVersionsStore);
const { isDirtyActiveProject } = storeToRefs(useDirtyProjectsTrackingStore());
const { uploadWorkflowAndOpenAsProject } = useUploadWorkflowToSpace();

const isLocalWorkflow = computed(
  () =>
    activeWorkflow.value?.info.providerType ===
    WorkflowInfo.ProviderTypeEnum.LOCAL,
);
const isHubWorkflow = computed(
  () =>
    activeWorkflow.value?.info.providerType ===
    WorkflowInfo.ProviderTypeEnum.HUB,
);

const canvasModes = computed<Array<MenuItem>>(() => {
  const canvasModeShortcuts: Array<{
    id: string;
    shortcutName: ShortcutName;
  }> = [
    { id: "selection", shortcutName: "switchToSelectionMode" },
    { id: "annotation", shortcutName: "switchToAnnotationMode" },
    { id: "pan", shortcutName: "switchToPanMode" },
  ];

  return canvasModeShortcuts.flatMap(({ id, shortcutName }) => {
    const shortcut = $shortcuts.get(shortcutName);
    if (!shortcut) {
      return [];
    }

    const shortcutText =
      typeof shortcut.text === "function"
        ? shortcut.text()
        : shortcut.text ?? "";

    return {
      text: shortcutText,
      title: shortcutText,
      hotkeyText: shortcut.hotkeyText,
      disabled: !$shortcuts.isEnabled(shortcutName),
      metadata: { id },
    };
  });
});

const toolbarButtons = computed<Array<{ id: ShortcutName } & KdsButtonProps>>(
  () => {
    if (!activeWorkflow.value || !activeProjectId.value) {
      return [];
    }

    if (!activeWorkflow.value || !uiControls.canEditWorkflow) {
      return [];
    }

    const hasNodesSelected = selectedNodes.value.length > 0;

    const variant: KdsButtonProps["variant"] = "transparent";
    const visibleItems: Array<
      { id: ShortcutName; visible: boolean } & KdsButtonProps
    > = [
      // Always visible
      {
        id: "undo",
        visible: true,
        label: $shortcuts.getText("undo"),
        leadingIcon: "undo",
        title: toolbarButtonTitle($shortcuts.get("undo")),
        disabled: !$shortcuts.isEnabled("undo"),
        variant,
      },
      {
        id: "redo",
        visible: true,
        label: $shortcuts.getText("redo"),
        leadingIcon: "redo",
        title: toolbarButtonTitle($shortcuts.get("redo")),
        disabled: !$shortcuts.isEnabled("redo"),
        variant,
      },

      // Workflow
      {
        id: "executeAll",
        visible: !hasNodesSelected,
        label: $shortcuts.getText("executeAll"),
        leadingIcon: "execute-all",
        title: toolbarButtonTitle($shortcuts.get("executeAll")),
        disabled: !$shortcuts.isEnabled("executeAll"),
        variant,
      },
      {
        id: "cancelAll",
        visible: !hasNodesSelected,
        label: $shortcuts.getText("cancelAll"),
        leadingIcon: "x-close",
        title: toolbarButtonTitle($shortcuts.get("cancelAll")),
        disabled: !$shortcuts.isEnabled("cancelAll"),
        variant,
      },
      {
        id: "resetAll",
        visible: !hasNodesSelected,
        label: $shortcuts.getText("resetAll"),
        leadingIcon: "reset-all",
        title: toolbarButtonTitle($shortcuts.get("resetAll")),
        disabled: !$shortcuts.isEnabled("resetAll"),
        variant,
      },

      // Node execution
      {
        id: "executeSelected",
        visible: hasNodesSelected,
        label: $shortcuts.getText("executeSelected"),
        leadingIcon: "selected-execution",
        title: toolbarButtonTitle($shortcuts.get("executeSelected")),
        disabled: !$shortcuts.isEnabled("executeSelected"),
        variant,
      },
      {
        id: "cancelSelected",
        visible: hasNodesSelected,
        label: $shortcuts.getText("cancelSelected"),
        leadingIcon: "selected-cancel",
        title: toolbarButtonTitle($shortcuts.get("cancelSelected")),
        disabled: !$shortcuts.isEnabled("cancelSelected"),
        variant,
      },
      {
        id: "resetSelected",
        visible: hasNodesSelected,
        label: $shortcuts.getText("resetSelected"),
        leadingIcon: "selected-reset",
        title: toolbarButtonTitle($shortcuts.get("resetSelected")),
        disabled: !$shortcuts.isEnabled("resetSelected"),
        variant,
      },

      {
        id: "openLayoutEditor",
        visible: $shortcuts.isEnabled("openLayoutEditor"),
        label: $shortcuts.getText("openLayoutEditor"),
        leadingIcon: "layout-editor",
        title: toolbarButtonTitle($shortcuts.get("openLayoutEditor")),
        disabled: !$shortcuts.isEnabled("openLayoutEditor"),
        variant,
      },
    ];

    return visibleItems.filter(({ visible }) => visible);
  },
);

const onCanvasModeUpdate = (
  _: unknown,
  { metadata: { id } }: { metadata: { id: CanvasMode } },
) => {
  canvasModesStore.switchCanvasMode(id);
};

const isDeploymentButtonVisible = computed(
  () =>
    getCommunityHubInfo.value.isOnlyCommunityHubMounted &&
    isHubWorkflow.value &&
    !isUnknownProject.value(activeProjectId.value) &&
    !isActiveWorkflowFixedVersion.value,
);

const onDeploymentButtonClick = () => {
  if (!activeProjectOrigin.value) {
    consola.warn("Invalid activeProjectOrigin.");
    return;
  }

  const {
    providerId: spaceProviderId,
    spaceId,
    itemId,
  } = activeProjectOrigin.value;

  API.desktop.openInBrowser({
    spaceProviderId,
    spaceId,
    itemId,
    queryString: "show-deployment=true",
  });
};

const showUploadDirtyWorkflowPrompt = () => {
  const { askConfirmation } = useKdsDynamicModal();
  return askConfirmation({
    title: "Upload unsaved workflow",
    message:
      "To upload a workflow, you need to save it first. " +
      "Would you like to save the workflow and continue with the upload?",
    buttons: [
      {
        type: "cancel",
        label: "Cancel",
      },
      {
        type: "confirm",
        label: "Save workflow and continue",
        autofocus: true,
      },
    ],
  });
};

const onUploadButtonClick = async () => {
  if (!activeProjectOrigin.value?.itemId) {
    consola.warn("Item id not found for active project");
    return;
  }

  if (!isDirtyActiveProject.value) {
    uploadWorkflowAndOpenAsProject(activeProjectOrigin.value.itemId);
    return;
  }

  const result = await showUploadDirtyWorkflowPrompt();
  if (!result.confirmed) {
    return;
  }
  try {
    await useDesktopInteractionsStore().saveProject();
    uploadWorkflowAndOpenAsProject(activeProjectOrigin.value.itemId);
  } catch (e) {
    getToastPresets().toastPresets.app.saveProjectFailed({ error: e });
  }
};

const uploadButton =
  useTemplateRef<InstanceType<typeof KdsButton>>("uploadButton");

onMounted(() => {
  useHint().createHint({
    hintId: HINTS.UPLOAD_BUTTON,
    referenceElement: uploadButton,
  });
});

const { isSVGRenderer } = useCanvasRendererUtils();

const { isLocalSaveSupported, isAutoSyncSupported } = useUIControlsStore();

const isVersionModeActive = computed(
  () =>
    activeProjectVersionsModeStatus.value === "active" &&
    isActiveWorkflowFixedVersion.value,
);

const handleNavigateToHubHome = (event: MouseEvent) => {
  const openInNewTab = event[getMetaOrCtrlKey()];
  useHostContextStore().navigateHome(openInNewTab);
};
</script>

<template>
  <div class="toolbar">
    <div
      v-if="uiControls.shouldShowCloudHomeButton && !isVersionModeActive"
      class="home-navigation"
    >
      <KdsButton
        leading-icon="home"
        variant="transparent"
        @click="handleNavigateToHubHome"
      />
    </div>

    <transition-group tag="div" name="button-list">
      <KdsButton
        v-if="isVersionModeActive"
        label="Close version history"
        leading-icon="chevron-left"
        variant="outlined"
        @click="$shortcuts.dispatch('closeVersionHistory')"
      />

      <!--
        setting :key="the list of all visible buttons",
        re-renders the whole list in a new div whenever buttons appear or disappear,
        such that those two lists can be faded
      -->
      <div
        v-else
        :key="toolbarButtons.map(({ id }) => id).join()"
        class="button-list"
      >
        <SaveButton v-if="isLocalSaveSupported" />
        <AutoSaveButton v-if="isAutoSyncSupported" />

        <KdsButton
          v-for="button in toolbarButtons"
          :key="button.id"
          v-bind="button"
          @click="$shortcuts.dispatch(button.id)"
        />
      </div>
    </transition-group>

    <WorkflowBreadcrumb
      v-if="activeWorkflow"
      :workflow="activeWorkflow"
      class="breadcrumb"
    />

    <div class="toolbar-end">
      <KdsButton
        v-if="getCommunityHubInfo.isOnlyCommunityHubMounted && isLocalWorkflow"
        ref="uploadButton"
        label="Upload"
        leading-icon="cloud-upload"
        variant="transparent"
        @click="onUploadButtonClick"
      />

      <KdsButton
        v-else-if="isDeploymentButtonVisible"
        label="Deploy on Hub"
        leading-icon="deploy"
        variant="transparent"
        @click="onDeploymentButtonClick"
      />

      <SubMenu
        v-if="isSVGRenderer"
        class="control"
        :items="canvasModes"
        data-test-id="canvas-modes-selector"
        orientation="left"
        button-title="Canvas mode"
        aria-label="Canvas mode"
        @item-click="onCanvasModeUpdate"
      >
        <SelectionModeIcon
          v-if="hasSelectionModeEnabled"
          aria-hidden="true"
          focusable="false"
        />
        <AnnotationModeIcon
          v-else-if="hasAnnotationModeEnabled"
          aria-hidden="true"
          focusable="false"
        />
        <ArrowMoveIcon
          v-else-if="hasPanModeEnabled"
          aria-hidden="true"
          focusable="false"
        />
      </SubMenu>

      <ZoomMenu
        v-if="activeWorkflow && isSVGRenderer"
        data-test-id="zoom-menu"
        :disabled="isWorkflowEmpty"
        aria-label="Zoom Menu"
      />

      <HelpMenu v-if="isBrowser()" class="help-menu" />
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.toolbar {
  display: flex;
  align-items: center;
  height: var(--app-toolbar-height);
  max-width: 100vw;
  flex: 0 0 auto;

  & .button-list {
    transition: opacity 150ms ease-out;
    flex-shrink: 0;
    display: flex;
    font-size: 14px;
    user-select: none;
    gap: var(--kds-spacing-container-0-25x);
  }

  & .home-navigation {
    min-width: 40px;
    margin: 0 var(--kds-spacing-container-0-25x);
    border-right: var(--kds-border-base-muted);
  }

  & .breadcrumb {
    flex: 1 1;
    display: flex;
    text-align: center;
    white-space: pre;
  }

  & .toolbar-end {
    --z-index-common-menu-items-expanded: v-bind(
      "$zIndices.layerExpandedMenus"
    );

    display: flex;
    justify-content: end;
    align-items: center;
    flex: 0 0;
    gap: var(--kds-spacing-container-0-25x);

    & button {
      white-space: nowrap;
    }

    & :deep(.submenu-toggle) {
      border-radius: var(
        --kds-legacy-button-border-radius,
        var(--kds-border-radius-container-0-37x)
      );

      & svg {
        stroke-width: 3.5px;
        width: 12px;
        height: 12px;
      }

      &.expanded {
        background-color: var(--kds-color-background-neutral-active);

        & svg {
          stroke: var(--kds-color-text-and-icon-neutral);
        }
      }

      &:not(.expanded) svg {
        stroke: var(--kds-color-text-and-icon-neutral);
      }

      &:focus-visible {
        outline: var(--kds-border-action-focused);
        outline-offset: 1px;
        background-color: transparent;

        & svg {
          stroke: var(--kds-color-text-and-icon-neutral);
        }

        &:hover {
          background-color: var(--kds-color-background-neutral-hover);
          border-color: var(--kds-color-background-neutral-hover);
        }

        &:active {
          stroke: var(--kds-color-background-neutral);
        }
      }
    }

    & .help-menu:deep(.function-button) {
      width: var(--kds-dimension-component-width-1-75x);
      height: var(--kds-dimension-component-height-1-75x);

      & svg {
        stroke: var(--kds-color-text-and-icon-neutral);
      }
    }

    & .help-menu:deep(.function-button.active) {
      background: var(--kds-color-background-neutral-active);
    }
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
