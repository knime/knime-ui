<script lang="ts">
import { mapState, mapGetters } from "vuex";

import ArrowMoveIcon from "webapps-common/ui/assets/img/icons/arrow-move.svg";
import SubMenu from "webapps-common/ui/components/SubMenu.vue";
import SelectionModeIcon from "@/assets/selection-mode.svg";
import AnnotationModeIcon from "@/assets/annotation-mode.svg";

import type { ShortcutName } from "@/shortcuts";
import WorkflowBreadcrumb from "./WorkflowBreadcrumb.vue";
import ZoomMenu from "./ZoomMenu.vue";
import ToolbarShortcutButton from "./ToolbarShortcutButton.vue";
import { isDesktop, compatibility } from "@/environment";

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
    ...mapState("application", ["permissions"]),
    ...mapGetters("workflow", ["isWorkflowEmpty"]),
    ...mapGetters("selection", ["selectedNodes"]),
    ...mapGetters("application", [
      "hasAnnotationModeEnabled",
      "hasSelectionModeEnabled",
      "hasPanModeEnabled",
      "isUnknownProject",
    ]),

    canvasModes() {
      const canvasModeShortcuts: Array<{
        id: string;
        shortcutName: ShortcutName;
      }> = [
        { id: "selection", shortcutName: "switchToSelectionMode" },
        { id: "annotation", shortcutName: "switchToAnnotationMode" },
        { id: "pan", shortcutName: "switchToPanMode" },
      ];

      return canvasModeShortcuts
        .map(({ id, shortcutName }) => {
          const shortcut = this.$shortcuts.get(shortcutName);
          if (!shortcut) {
            return null;
          }

          const shortcutText =
            typeof shortcut.text === "function"
              ? shortcut.text({ $store: this.$store })
              : shortcut.text;

          return {
            text: shortcutText,
            hotkeyText: shortcut.hotkeyText,
            disabled: !this.$shortcuts.isEnabled(shortcutName),
            metadata: { id },
          };
        })
        .filter(Boolean);
    },

    hasBreadcrumb() {
      return this.workflow?.parents?.length > 0;
    },
    hideText() {
      return {
        save: true,
        saveAs: true,
        undo: true,
        redo: true,
      };
    },
    toolbarDropdowns() {
      // when the project is unknown we won't show the "save" action, and therefore
      // cannot show the dropdown
      if (this.isUnknownProject) {
        return {};
      }

      return { save: ["save", "saveAs"] };
    },
    toolbarButtons(): ShortcutName[] {
      const isInsideComponent =
        this.workflow?.info.containerType === "component";

      if (!this.workflow) {
        return [];
      }

      const visibleItems: Partial<Record<ShortcutName, boolean>> = {
        save: !this.isUnknownProject && isDesktop,
        saveAs: this.isUnknownProject && isDesktop,

        // Always visible
        undo: this.permissions.canEditWorkflow,
        redo: this.permissions.canEditWorkflow,

        // Workflow
        executeAll: !this.selectedNodes.length,
        cancelAll: !this.selectedNodes.length,
        resetAll: !this.selectedNodes.length,

        // Node execution
        executeSelected: this.selectedNodes.length,
        cancelSelected: this.selectedNodes.length,
        resetSelected: this.selectedNodes.length,

        // Workflow abstraction
        createMetanode:
          this.selectedNodes.length && this.permissions.canEditWorkflow,
        createComponent:
          this.selectedNodes.length && compatibility.canDoComponentOperations(),

        openLayoutEditor:
          isInsideComponent && compatibility.canDoComponentOperations(),
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
    onCanvasModeUpdate(_, { metadata: { id } }) {
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
