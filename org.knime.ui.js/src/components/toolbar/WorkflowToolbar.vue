<script setup lang="ts">
import { computed, defineComponent, h, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";

import {
  FunctionButton,
  type MenuItem,
  SubMenu,
  ValueSwitch,
  useHint,
} from "@knime/components";
import ArrowMoveIcon from "@knime/styles/img/icons/arrow-move.svg";
import ChartDotsIcon from "@knime/styles/img/icons/chart-dots.svg";
import CloudUploadIcon from "@knime/styles/img/icons/cloud-upload.svg";
import DeploymentIcon from "@knime/styles/img/icons/deployment.svg";
import { sleep } from "@knime/utils";

import { API } from "@/api";
import { WorkflowInfo } from "@/api/gateway-api/generated-api";
import AnnotationModeIcon from "@/assets/annotation-mode.svg";
import SelectionModeIcon from "@/assets/selection-mode.svg";
import ToolbarButton from "@/components/common/ToolbarButton.vue";
import { useConfirmDialog } from "@/composables/useConfirmDialog";
import { useUploadWorkflowToSpace } from "@/composables/useWorkflowUploadToHub";
import { isDesktop } from "@/environment";
import { HINTS } from "@/hints/hints.config";
import { useShortcuts } from "@/plugins/shortcuts";
import type { ShortcutName } from "@/shortcuts";
import { useApplicationStore } from "@/store/application/application";
import {
  type CanvasMode,
  useCanvasModesStore,
} from "@/store/application/canvasModes";
import { useDirtyProjectsTrackingStore } from "@/store/application/dirtyProjectsTracking";
import { useApplicationSettingsStore } from "@/store/application/settings";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useSelectionStore } from "@/store/selection";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { useUIControlsStore } from "@/store/uiControls/uiControls";
import { useDesktopInteractionsStore } from "@/store/workflow/desktopInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { useWorkflowVersionsStore } from "@/store/workflow/workflowVersions";
import { getToastPresets } from "@/toastPresets";
import { reloadApp } from "@/util/devTools";
import {
  type CanvasRendererType,
  canvasRendererUtils,
  useCanvasRendererUtils,
} from "../workflowEditor/util/canvasRenderer";

import FPSMeter from "./FPSMeter.vue";
import ToolbarShortcutButton from "./ToolbarShortcutButton.vue";
import WorkflowBreadcrumb from "./WorkflowBreadcrumb.vue";
import ZoomMenu from "./ZoomMenu.vue";

/**
 * A toolbar shown on top of a workflow canvas. Contains action buttons and breadcrumb.
 */
const $shortcuts = useShortcuts();
const uiControls = useUIControlsStore();
const workflowVersionsStore = useWorkflowVersionsStore();
const { activeProjectId, activeProjectOrigin, isUnknownProject } = storeToRefs(
  useApplicationStore(),
);
const { activeWorkflow, isWorkflowEmpty } = storeToRefs(useWorkflowStore());
const { getSelectedNodes: selectedNodes } = storeToRefs(useSelectionStore());
const canvasModesStore = useCanvasModesStore();
const { hasAnnotationModeEnabled, hasPanModeEnabled, hasSelectionModeEnabled } =
  storeToRefs(canvasModesStore);
const { getCommunityHubInfo } = storeToRefs(useSpaceProvidersStore());
const { activeProjectVersionsModeStatus } = storeToRefs(workflowVersionsStore);
const { isDirtyActiveProject } = storeToRefs(useDirtyProjectsTrackingStore());
const { uploadWorkflowAndOpenAsProject } = useUploadWorkflowToSpace();

const webglCanvasStore = useWebGLCanvasStore();

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

const hideText = computed<Partial<Record<ShortcutName, boolean>>>(() => ({
  save: true,
  saveAs: true,
  undo: true,
  redo: true,
}));

const toolbarDropdowns = computed<
  Partial<Record<ShortcutName, { name: ShortcutName; separator?: boolean }[]>>
>(() => {
  // when the project is unknown we won't show the "save" action, and therefore
  // cannot show the dropdown
  if (activeProjectId.value && isUnknownProject.value(activeProjectId.value)) {
    return {};
  }

  return {
    save: [
      { name: "save" },
      { name: "saveAs", separator: true },
      { name: "export" },
    ],
  };
});

const toolbarButtons = computed<Array<ShortcutName>>(() => {
  if (!activeWorkflow.value || !activeProjectId.value) {
    return [];
  }

  if (!activeWorkflow.value || !uiControls.canEditWorkflow) {
    return [];
  }

  if (activeProjectVersionsModeStatus.value === "active") {
    return ["closeVersionHistory"];
  }

  const hasNodesSelected = selectedNodes.value.length > 0;

  const visibleItems: Partial<Record<ShortcutName, boolean>> = {
    save: !isUnknownProject.value(activeProjectId.value) && isDesktop(),
    saveAs: isUnknownProject.value(activeProjectId.value) && isDesktop(),

    // Always visible
    undo: true,
    redo: true,

    // Workflow
    executeAll: !hasNodesSelected,
    cancelAll: !hasNodesSelected,
    resetAll: !hasNodesSelected,

    // Node execution
    executeSelected: hasNodesSelected,
    cancelSelected: hasNodesSelected,
    resetSelected: hasNodesSelected,

    // Workflow abstraction
    createMetanode: hasNodesSelected,
    createComponent: hasNodesSelected,

    openLayoutEditor: $shortcuts.isEnabled("openLayoutEditor"),
  };

  return Object.entries(visibleItems)
    .filter(([_, visible]) => visible)
    .map(([name]) => name);
});

const onCanvasModeUpdate = (
  _: unknown,
  { metadata: { id } }: { metadata: { id: CanvasMode } },
) => {
  canvasModesStore.switchCanvasMode(id);
};

// toggle renderer svg/webgl
const { devMode } = storeToRefs(useApplicationSettingsStore());
const { currentRenderer: currentCanvasRenderer } = useCanvasRendererUtils();

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
  const { show } = useConfirmDialog();
  return show({
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

const uploadButton = ref<InstanceType<typeof ToolbarButton>>();

type CreateHintOptions = Parameters<
  ReturnType<typeof useHint>["createHint"]
>[0];

const ToolbarButtonWithHint = defineComponent(
  (props: { createHintOptions: CreateHintOptions }, ctx) => {
    onMounted(() => {
      // By creating the hint in this wrapper, it's lifecycle is independent of the WorkflowToolbar
      //  (e.g. when switching between two tabs with different ToolbarButtons each)
      useHint().createHint(props.createHintOptions);
    });
    return () => h(ToolbarButton, ctx.attrs, ctx.slots);
  },
  {
    props: ["createHintOptions"] as const,
  },
);

const rendererValueSwitchModel = ref<CanvasRendererType>(
  canvasRendererUtils.getCurrentCanvasRenderer(),
);

const canvasRendererNameMap = { SVG: "Stable", WebGL: "Experimental" };

const requestCanvasRenderToggle = async (nextRenderer: CanvasRendererType) => {
  // just change it in dev mode, no questions asked nor reloaded
  if (devMode.value) {
    currentCanvasRenderer.value = nextRenderer;
    rendererValueSwitchModel.value = nextRenderer;
    return;
  }

  const { show } = useConfirmDialog();
  const result = await show({
    title: "Change canvas rendering engine",
    message:
      "Changing this setting will cause the application to reload, " +
      "and any unsaved changes may be lost. Do you want to proceed?",
    buttons: [
      { type: "cancel", label: "Cancel" },
      { type: "confirm", label: "Reload application", flushRight: true },
    ],
  });

  // update the display model
  rendererValueSwitchModel.value = nextRenderer;

  if (result.confirmed) {
    currentCanvasRenderer.value = nextRenderer;
    reloadApp();
    return;
  }

  // set switch back
  await sleep(0);
  rendererValueSwitchModel.value = nextRenderer === "WebGL" ? "SVG" : "WebGL";
};
</script>

<template>
  <div class="toolbar">
    <transition-group tag="div" name="button-list" class="button-list-wrapper">
      <!--
        setting :key="the list of all visible buttons",
        re-renders the whole list in a new div whenever buttons appear or disappear,
        such that those two lists can be faded
      -->
      <div :key="toolbarButtons.join()" class="button-list">
        <ToolbarShortcutButton
          v-for="button in toolbarButtons"
          :key="button"
          :name="button"
          :with-text="!hideText[button]"
          :dropdown="toolbarDropdowns[button] ?? []"
        />
      </div>
    </transition-group>

    <WorkflowBreadcrumb
      v-if="activeWorkflow"
      :workflow="activeWorkflow"
      class="breadcrumb"
    />

    <div class="control-list">
      <template v-if="devMode">
        <FPSMeter style="margin-right: var(--space-8)" />
        <FunctionButton
          :disabled="currentCanvasRenderer !== 'WebGL'"
          style="margin-right: var(--space-8)"
          class="header-button no-text control"
          aria-label="Toggle canvas debug"
          data-test-id="dev-mode-only"
          title="Toggle canvas debug"
          @click="
            webglCanvasStore.isDebugModeEnabled =
              !webglCanvasStore.isDebugModeEnabled
          "
        >
          <ChartDotsIcon />
        </FunctionButton>
      </template>

      <ValueSwitch
        compact
        style="margin-right: var(--space-16)"
        :model-value="rendererValueSwitchModel"
        :possible-values="
          Object.entries(canvasRendererNameMap).map(([id, text]) => ({
            id,
            text,
          }))
        "
        @update:model-value="requestCanvasRenderToggle"
      />

      <ToolbarButtonWithHint
        v-if="getCommunityHubInfo.isOnlyCommunityHubMounted && isLocalWorkflow"
        ref="uploadButton"
        class="toolbar-button"
        with-text
        title="Upload"
        :create-hint-options="{
          hintId: HINTS.UPLOAD_BUTTON,
          referenceElement: computed(() => uploadButton),
        }"
        @click="onUploadButtonClick"
      >
        <Component :is="CloudUploadIcon" />
        Upload
      </ToolbarButtonWithHint>
      <ToolbarButton
        v-else-if="
          getCommunityHubInfo.isOnlyCommunityHubMounted &&
          isHubWorkflow &&
          !isUnknownProject(activeProjectId)
        "
        class="toolbar-button"
        with-text
        title="Deploy on Hub"
        @click="onDeploymentButtonClick"
      >
        <DeploymentIcon />
        Deploy on Hub
      </ToolbarButton>

      <SubMenu
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
        v-if="activeWorkflow"
        data-test-id="zoom-menu"
        :disabled="isWorkflowEmpty"
        aria-label="Zoom Menu"
      />
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
  padding: 10px;
  background-color: var(--knime-gray-ultra-light);
  border-bottom: 1px solid var(--knime-silver-sand);

  & .button-list-wrapper {
    flex: 1 1;
  }

  & .control-list {
    --z-index-common-menu-items-expanded: v-bind(
      "$zIndices.layerExpandedMenus"
    );

    display: flex;
    justify-content: end;
    align-items: center;
    flex: 1 1;

    & .control {
      margin-right: 5px;
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

.button-list {
  transition: opacity 150ms ease-out;
  flex-shrink: 0;
  display: flex;
  font-size: 14px;
  user-select: none;
}

.breadcrumb {
  display: flex;
  text-align: center;
  white-space: pre;
}
</style>
