<script lang="ts">
import { mapState, mapGetters } from "vuex";

import ArrowMoveIcon from "@knime/styles/img/icons/arrow-move.svg";
import SubMenu from "webapps-common/ui/components/SubMenu.vue";
import type { MenuItem } from "webapps-common/ui/components/MenuItems.vue";
import SelectionModeIcon from "@/assets/selection-mode.svg";
import AnnotationModeIcon from "@/assets/annotation-mode.svg";

import type { ShortcutName } from "@/shortcuts";
import { isDesktop } from "@/environment";
import WorkflowBreadcrumb from "./WorkflowBreadcrumb.vue";
import ZoomMenu from "./ZoomMenu.vue";
import ToolbarShortcutButton from "./ToolbarShortcutButton.vue";

/**
 * A toolbar shown on top of a workflow canvas. Contains action buttons and breadcrumb.
 */
export default {
  components: {
    WorkflowBreadcrumb,
    ZoomMenu,
    ToolbarShortcutButton,
    SubMenu,
    SelectionModeIcon,
    ArrowMoveIcon,
    AnnotationModeIcon,
  },
  computed: {
    ...mapState("workflow", { workflow: "activeWorkflow" }),
    ...mapState("application", ["permissions", "activeProjectId"]),
    ...mapGetters("workflow", ["isWorkflowEmpty"]),
    ...mapGetters("selection", ["selectedNodes"]),
    ...mapGetters("application", [
      "hasAnnotationModeEnabled",
      "hasSelectionModeEnabled",
      "hasPanModeEnabled",
      "isUnknownProject",
    ]),

    canvasModes(): Array<MenuItem> {
      const canvasModeShortcuts: Array<{
        id: string;
        shortcutName: ShortcutName;
      }> = [
        { id: "selection", shortcutName: "switchToSelectionMode" },
        { id: "annotation", shortcutName: "switchToAnnotationMode" },
        { id: "pan", shortcutName: "switchToPanMode" },
      ];

      return canvasModeShortcuts.flatMap(({ id, shortcutName }) => {
        const shortcut = this.$shortcuts.get(shortcutName);
        if (!shortcut) {
          return [];
        }

        const shortcutText =
          typeof shortcut.text === "function"
            ? shortcut.text({ $store: this.$store })
            : shortcut.text ?? "";

        return {
          text: shortcutText,
          hotkeyText: shortcut.hotkeyText,
          disabled: !this.$shortcuts.isEnabled(shortcutName),
          metadata: { id },
        };
      });
    },

    hasBreadcrumb() {
      return this.workflow?.parents?.length > 0;
    },
    hideText(): Partial<Record<ShortcutName, boolean>> {
      return {
        save: true,
        saveAs: true,
        undo: true,
        redo: true,
      };
    },
    toolbarDropdowns(): Partial<Record<ShortcutName, ShortcutName[]>> {
      // when the project is unknown we won't show the "save" action, and therefore
      // cannot show the dropdown
      if (this.isUnknownProject(this.activeProjectId)) {
        return {};
      }

      return { save: ["save", "saveAs"] };
    },
    toolbarButtons(): ShortcutName[] {
      if (!this.workflow) {
        return [];
      }

      if (!this.workflow || !this.permissions.canEditWorkflow) {
        return [];
      }

      const hasNodesSelected = this.selectedNodes.length > 0;

      const visibleItems: Partial<Record<ShortcutName, boolean>> = {
        save: !this.isUnknownProject(this.activeProjectId) && isDesktop,
        saveAs: this.isUnknownProject(this.activeProjectId) && isDesktop,

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

        openLayoutEditor: this.$shortcuts.isEnabled("openLayoutEditor"),
      };

      return (
        Object.entries(visibleItems)
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          .filter(([_, visible]) => visible)
          .map(([name]) => name as ShortcutName)
      );
    },
  },
  methods: {
    onCanvasModeUpdate(
      _: unknown,
      { metadata: { id } }: { metadata: { id: string } },
    ) {
      this.$store.dispatch("application/switchCanvasMode", id);
    },
  },
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
