<script setup lang="ts">
import { computed, onMounted, useTemplateRef } from "vue";
import { API } from "@api";
import { storeToRefs } from "pinia";

import { type MenuItem, SubMenu, useHint } from "@knime/components";
import {
  KdsButton,
  KdsToggleButton,
  useKdsDynamicModal,
} from "@knime/kds-components";
import ArrowMoveIcon from "@knime/styles/img/icons/arrow-move.svg";

import { WorkflowInfo } from "@/api/gateway-api/generated-api";
import AnnotationModeIcon from "@/assets/annotation-mode.svg";
import SelectionModeIcon from "@/assets/selection-mode.svg";
import HelpMenu from "@/components/application/HelpMenu.vue";
import ZoomMenu from "@/components/toolbar/ZoomMenu.vue";
import { useCanvasRendererUtils } from "@/components/workflowEditor/util/canvasRenderer";
import { useUploadWorkflowToSpace } from "@/composables/useWorkflowUploadToHub";
import { isBrowser } from "@/environment";
import { HINTS } from "@/hints/hints.config";
import { useShortcuts } from "@/services/shortcuts";
import type { ShortcutName } from "@/services/shortcuts";
import { getToastPresets } from "@/services/toastPresets";
import { useApplicationStore } from "@/store/application/application";
import {
  type CanvasMode,
  useCanvasModesStore,
} from "@/store/application/canvasModes";
import { useDirtyProjectsTrackingStore } from "@/store/application/dirtyProjectsTracking";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { useUIControlsStore } from "@/store/uiControls/uiControls";
import { useDesktopInteractionsStore } from "@/store/workflow/desktopInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { useWorkflowVersionsStore } from "@/store/workflow/workflowVersions";

const $shortcuts = useShortcuts();
const { activeProjectId, activeProjectOrigin, isUnknownProject } = storeToRefs(
  useApplicationStore(),
);
const { activeWorkflow, isWorkflowEmpty, isActiveWorkflowFixedVersion } =
  storeToRefs(useWorkflowStore());
const { getCommunityHubInfo } = storeToRefs(useSpaceProvidersStore());
const uiControls = useUIControlsStore();
const { activeProjectVersionsModeStatus } = storeToRefs(
  useWorkflowVersionsStore(),
);

const onVersionsToggle = async (newValue: boolean) => {
  const versionsStore = useWorkflowVersionsStore();
  try {
    if (newValue) {
      await versionsStore.activateVersionsMode();
    } else {
      await versionsStore.deactivateVersionsMode();
    }
  } catch (error) {
    if (newValue) {
      getToastPresets().toastPresets.versions.activateModeFailed({ error });
    }
  }
};
const { isDirtyActiveProject } = storeToRefs(useDirtyProjectsTrackingStore());
const { uploadWorkflowAndOpenAsProject } = useUploadWorkflowToSpace();

const canvasModesStore = useCanvasModesStore();
const { hasAnnotationModeEnabled, hasPanModeEnabled, hasSelectionModeEnabled } =
  storeToRefs(canvasModesStore);
const { isSVGRenderer } = useCanvasRendererUtils();

const isVersionModeActive = computed(
  () =>
    activeProjectVersionsModeStatus.value === "active" &&
    isActiveWorkflowFixedVersion.value,
);

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

const isDeploymentButtonVisible = computed(
  () =>
    getCommunityHubInfo.value.isOnlyCommunityHubMounted &&
    isHubWorkflow.value &&
    !isUnknownProject.value(activeProjectId.value) &&
    !isActiveWorkflowFixedVersion.value,
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
      typeof shortcut.text === "function" ? shortcut.text() : shortcut.text ?? "";
    return {
      text: shortcutText,
      title: shortcutText,
      hotkeyText: shortcut.hotkeyText,
      disabled: !$shortcuts.isEnabled(shortcutName),
      metadata: { id },
    };
  });
});

const onCanvasModeUpdate = (
  _: unknown,
  { metadata: { id } }: { metadata: { id: CanvasMode } },
) => {
  canvasModesStore.switchCanvasMode(id);
};

const onDeploymentButtonClick = () => {
  if (!activeProjectOrigin.value) {
    consola.warn("Invalid activeProjectOrigin.");
    return;
  }
  const { providerId: spaceProviderId, spaceId, itemId } =
    activeProjectOrigin.value;
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
      { type: "cancel", label: "Cancel" },
      { type: "confirm", label: "Save workflow and continue", autofocus: true },
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

const uploadButton = useTemplateRef<InstanceType<typeof KdsButton>>("uploadButton");
onMounted(() => {
  useHint().createHint({
    hintId: HINTS.UPLOAD_BUTTON,
    referenceElement: uploadButton,
  });
});
</script>

<template>
  <div class="canvas-overlay-top-right">
    <HelpMenu v-if="isBrowser()" class="help-menu" />

    <template v-if="activeWorkflow">
      <KdsToggleButton
        v-if="uiControls.canViewVersions"
        :model-value="activeProjectVersionsModeStatus === 'active'"
        leading-icon="time"
        title="Version history"
        aria-label="Version history"
        variant="transparent"
        size="medium"
        @update:model-value="onVersionsToggle"
      />

      <template v-if="!isVersionModeActive">
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
        v-if="isSVGRenderer"
        data-test-id="zoom-menu"
        :disabled="isWorkflowEmpty"
        aria-label="Zoom Menu"
      />
      </template>
    </template>
  </div>
</template>

<style lang="postcss" scoped>
.canvas-overlay-top-right {
  position: fixed;
  z-index: v-bind("$zIndices.layerStaticPanelDecorations");
  top: calc(var(--kds-spacing-container-0-75x) + 40px);
  right: var(--kds-spacing-container-0-75x);

  display: flex;
  align-items: center;
  gap: var(--kds-spacing-container-0-25x);

  background-color: var(--kds-color-surface-default);
  border-radius: var(--kds-border-radius-container-0-50x);
  box-shadow: var(--shadow-elevation-1);
  padding: var(--kds-spacing-container-0-25x);

  /* z-index for dropdown menus */
  --z-index-common-menu-items-expanded: v-bind(
    "$zIndices.layerExpandedMenus"
  );

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
      & svg { stroke: var(--kds-color-text-and-icon-neutral); }
    }

    &:not(.expanded) svg {
      stroke: var(--kds-color-text-and-icon-neutral);
    }
  }
}
</style>
