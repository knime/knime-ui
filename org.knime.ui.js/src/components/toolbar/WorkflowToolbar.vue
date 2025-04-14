<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
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

import AnnotationModeIcon from "@/assets/annotation-mode.svg";
import SelectionModeIcon from "@/assets/selection-mode.svg";
import ToolbarButton from "@/components/common/ToolbarButton.vue";
import { useUploadToSpace } from "@/composables/useUploadToSpace";
import { isDesktop } from "@/environment";
import { HINTS } from "@/hints/hints.config";
import { useShortcuts } from "@/plugins/shortcuts";
import type { ShortcutName } from "@/shortcuts";
import { useApplicationStore } from "@/store/application/application";
import {
  type CanvasMode,
  useCanvasModesStore,
} from "@/store/application/canvasModes";
import { useApplicationSettingsStore } from "@/store/application/settings";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useSelectionStore } from "@/store/selection";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { isLocalProvider } from "@/store/spaces/util";
import { useUIControlsStore } from "@/store/uiControls/uiControls";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { useCanvasRendererUtils } from "../workflowEditor/util/canvasRenderer";

import FPSMeter from "./FPSMeter.vue";
import ToolbarShortcutButton from "./ToolbarShortcutButton.vue";
import WorkflowBreadcrumb from "./WorkflowBreadcrumb.vue";
import ZoomMenu from "./ZoomMenu.vue";

/**
 * A toolbar shown on top of a workflow canvas. Contains action buttons and breadcrumb.
 */
const { createHint } = useHint();
const $shortcuts = useShortcuts();
const uiControls = useUIControlsStore();
const { activeProjectId, isUnknownProject, openProjects } = storeToRefs(
  useApplicationStore(),
);
const { activeWorkflow, isWorkflowEmpty } = storeToRefs(useWorkflowStore());
const { getSelectedNodes: selectedNodes } = storeToRefs(useSelectionStore());
const canvasModesStore = useCanvasModesStore();
const { hasAnnotationModeEnabled, hasPanModeEnabled, hasSelectionModeEnabled } =
  storeToRefs(canvasModesStore);
const { getProviderInfoFromProjectPath, getCommunityHubInfo } = storeToRefs(
  useSpaceProvidersStore(),
);

const webglCanvasStore = useWebGLCanvasStore();

const { uploadAndOpenProject } = useUploadToSpace();

const providerInfo = computed(() =>
  getProviderInfoFromProjectPath.value(activeProjectId.value!),
);
const isLocal = computed(() =>
  Boolean(providerInfo.value && isLocalProvider(providerInfo.value)),
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

const toolbarButtons = computed(() => {
  if (!activeWorkflow.value || !activeProjectId.value) {
    return [];
  }

  if (!activeWorkflow.value || !uiControls.canEditWorkflow) {
    return [];
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

const itemId = computed(
  () =>
    openProjects.value.find(
      ({ projectId }) => projectId === activeProjectId.value,
    )?.origin?.itemId,
);

const { currentRenderer: currentCanvasRenderer, toggleCanvasRenderer } =
  useCanvasRendererUtils();

const onUploadButtonClick = () => {
  if (!itemId.value) {
    consola.warn("Item id not found for active project");
    return;
  }

  uploadAndOpenProject(itemId.value);
};

const uploadButton = ref<InstanceType<typeof ToolbarButton>>();

onMounted(() => {
  createHint({
    hintId: HINTS.UPLOAD_BUTTON,
    referenceElement: uploadButton,
  });
});
</script>

<template>
  <div class="toolbar">
    <transition-group tag="div" name="button-list">
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
        <ValueSwitch
          style="margin-right: var(--space-16)"
          compact
          :model-value="currentCanvasRenderer"
          :possible-values="[
            { id: 'SVG', text: 'SVG' },
            { id: 'WebGL', text: 'WebGL' },
          ]"
          @update:model-value="toggleCanvasRenderer()"
        />
      </template>

      <ToolbarButton
        v-if="getCommunityHubInfo.isOnlyCommunityHubMounted && isLocal"
        ref="uploadButton"
        class="toolbar-button"
        :with-text="true"
        title="Upload"
        @click="onUploadButtonClick"
      >
        <Component :is="CloudUploadIcon" />
        Upload
      </ToolbarButton>

      <SubMenu
        class="control"
        :items="canvasModes"
        data-test-id="canvas-modes-selector"
        orientation="left"
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

  & .control-list {
    --z-index-common-menu-items-expanded: v-bind(
      "$zIndices.layerExpandedMenus"
    );

    display: flex;
    justify-content: center;
    align-items: center;
    margin-left: auto;

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
  text-align: center;
  white-space: pre;
  flex: 1;
}
</style>
