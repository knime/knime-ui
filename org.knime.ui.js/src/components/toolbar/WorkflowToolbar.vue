<script setup lang="ts">
import { computed } from "vue";

import { type MenuItem, SubMenu } from "@knime/components";
import ArrowMoveIcon from "@knime/styles/img/icons/arrow-move.svg";

import type { KnimeNode } from "@/api/custom-types";
import AnnotationModeIcon from "@/assets/annotation-mode.svg";
import SelectionModeIcon from "@/assets/selection-mode.svg";
import { useStore } from "@/composables/useStore";
import { isDesktop } from "@/environment";
import { useShortcuts } from "@/plugins/shortcuts";
import type { ShortcutName } from "@/shortcuts";

import ToolbarShortcutButton from "./ToolbarShortcutButton.vue";
import WorkflowBreadcrumb from "./WorkflowBreadcrumb.vue";
import ZoomMenu from "./ZoomMenu.vue";

/**
 * A toolbar shown on top of a workflow canvas. Contains action buttons and breadcrumb.
 */

const $shortcuts = useShortcuts();
const store = useStore();
const uiControls = computed(() => store.state.uiControls);

const workflow = computed(() => store.state.workflow.activeWorkflow);
const activeProjectId = computed(() => store.state.application.activeProjectId);

const isWorkflowEmpty = computed<boolean>(
  () => store.getters["workflow/isWorkflowEmpty"],
);

const selectedNodes = computed<Array<KnimeNode>>(
  () => store.getters["selection/selectedNodes"],
);
const hasAnnotationModeEnabled = computed<boolean>(
  () => store.getters["application/hasAnnotationModeEnabled"],
);
const hasSelectionModeEnabled = computed<boolean>(
  () => store.getters["application/hasSelectionModeEnabled"],
);
const hasPanModeEnabled = computed<boolean>(
  () => store.getters["application/hasPanModeEnabled"],
);
const isUnknownProject = computed<(id: string) => boolean>(
  () => store.getters["application/isUnknownProject"],
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
        ? shortcut.text({ $store: store })
        : shortcut.text ?? "";

    return {
      text: shortcutText,
      hotkeyText: shortcut.hotkeyText,
      disabled: !$shortcuts.isEnabled(shortcutName),
      metadata: { id },
    };
  });
});

const hasBreadcrumb = computed(() => {
  return (workflow.value?.parents?.length ?? 0) > 0;
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
  if (!workflow.value || !activeProjectId.value) {
    return [];
  }

  if (!workflow.value || !uiControls.value.canEditWorkflow) {
    return [];
  }

  const hasNodesSelected = selectedNodes.value.length > 0;

  const visibleItems: Partial<Record<ShortcutName, boolean>> = {
    save: !isUnknownProject.value(activeProjectId.value) && isDesktop,
    saveAs: isUnknownProject.value(activeProjectId.value) && isDesktop,

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

  return (
    Object.entries(visibleItems)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([_, visible]) => visible)
      .map(([name]) => name)
  );
});

const onCanvasModeUpdate = (
  _: unknown,
  { metadata: { id } }: { metadata: { id: string } },
) => {
  store.dispatch("application/switchCanvasMode", id);
};
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

    <WorkflowBreadcrumb v-if="hasBreadcrumb" class="breadcrumb" />

    <div class="control-list">
      <SubMenu
        class="control"
        :items="canvasModes"
        orientation="left"
        @item-click="onCanvasModeUpdate"
      >
        <SelectionModeIcon v-if="hasSelectionModeEnabled" />
        <AnnotationModeIcon v-else-if="hasAnnotationModeEnabled" />
        <ArrowMoveIcon v-else-if="hasPanModeEnabled" />
      </SubMenu>

      <ZoomMenu v-if="workflow" :disabled="isWorkflowEmpty" />
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
