<script lang="ts">
import { defineComponent, type PropType } from "vue";
import { mapState } from "vuex";

import ExecuteIcon from "@/assets/execute.svg";
import ResumeIcon from "@/assets/resume-execution.svg";
import ResetIcon from "@/assets/reset-all.svg";
import CancelIcon from "@/assets/cancel.svg";
import PauseIcon from "@/assets/pause-execution.svg";
import StepIcon from "@/assets/step-execution.svg";
import OpenViewIcon from "@/assets/open-view.svg";
import OpenDialogIcon from "@/assets/configure-node.svg";

import ActionBar from "@/components/common/ActionBar.vue";
import { compatibility } from "@/environment";
import type { Node } from "@/api/gateway-api/generated-api";
import type { ShortcutName } from "@/shortcuts";

/**
 *  Displays a bar of action buttons above nodes
 */
export default defineComponent({
  components: {
    ActionBar,
  },
  props: {
    nodeId: {
      type: String,
      default: "NODE ID MISSING",
    },
    nodeKind: {
      type: String as PropType<Node.KindEnum>,
      required: true,
    },
    isNodeSelected: {
      type: Boolean,
      default: false,
    },
    canExecute: {
      type: Boolean,
      default: false,
    },
    canCancel: {
      type: Boolean,
      default: false,
    },
    canReset: {
      type: Boolean,
      default: false,
    },
    /*
     * The props below can either be true, false or unset.
     * In case they are unset, Vue defaults them to null
     */
    canStep: {
      type: Boolean,
      default: null,
    },
    canPause: {
      type: Boolean,
      default: null,
    },
    canResume: {
      type: Boolean,
      default: null,
    },
    canOpenView: {
      type: Boolean,
      default: null,
    },
    canOpenDialog: {
      type: Boolean,
      default: null,
    },
  },
  computed: {
    ...mapState("application", ["permissions"]),
    // all possible actions
    actions() {
      return {
        configureNode: {
          title: () =>
            this.hoverTitle(
              "Configure",
              this.$shortcuts.get("configureNode").hotkeyText,
            ),
          disabled: !this.canOpenDialog,
          icon: OpenDialogIcon,
          onClick: () => this.dispatchShortcut("configureNode"),
        },
        pauseLoopExecution: {
          title: () =>
            this.hoverTitle(
              "Pause",
              this.$shortcuts.get("pauseLoopExecution").hotkeyText,
            ),
          disabled: false,
          icon: PauseIcon,
          onClick: () => this.dispatchShortcut("pauseLoopExecution"),
        },
        resumeLoopExecution: {
          title: () =>
            this.hoverTitle(
              "Resume",
              this.$shortcuts.get("resumeLoopExecution").hotkeyText,
            ),
          disabled: false,
          icon: ResumeIcon,
          onClick: () => this.dispatchShortcut("resumeLoopExecution"),
        },
        execute: {
          title: () =>
            this.hoverTitle(
              "Execute",
              this.$shortcuts.get("executeSelected").hotkeyText,
            ),
          disabled: !this.canExecute,
          icon: ExecuteIcon,
          onClick: () => this.dispatchShortcut("executeSelected"),
        },
        stepLoopExecution: {
          title: () =>
            this.hoverTitle(
              "Step",
              this.$shortcuts.get("stepLoopExecution").hotkeyText,
            ),
          disabled: !this.canStep,
          icon: StepIcon,
          onClick: () => this.dispatchShortcut("stepLoopExecution"),
        },
        cancelExecution: {
          title: () =>
            this.hoverTitle(
              "Cancel",
              this.$shortcuts.get("cancelSelected").hotkeyText,
            ),
          disabled: !this.canCancel,
          icon: CancelIcon,
          onClick: () => this.dispatchShortcut("cancelSelected"),
        },
        reset: {
          title: () =>
            this.hoverTitle(
              "Reset",
              this.$shortcuts.get("resetSelected").hotkeyText,
            ),
          disabled: !this.canReset,
          icon: ResetIcon,
          onClick: () => this.dispatchShortcut("resetSelected"),
        },
        openView: {
          title: () =>
            this.hoverTitle(
              this.canExecute ? "Execute and open view" : "Open view",
              this.$shortcuts.get("executeAndOpenView").hotkeyText,
            ),
          disabled: !this.canOpenView && !this.canExecute,
          icon: OpenViewIcon,
          onClick: () => this.dispatchShortcut("executeAndOpenView"),
        },
      };
    },
    visibleActions() {
      type Actions = typeof this.actions;

      if (!this.permissions.canEditWorkflow) {
        return [];
      }

      const conditionMap: Record<keyof Actions, boolean> = {
        configureNode:
          this.canOpenDialog !== null &&
          this.permissions.canConfigureNodes &&
          compatibility.canConfigureNodes(this.nodeKind),

        // plain execution
        execute: !this.canPause && !this.canResume,

        // loop execution
        pauseLoopExecution: this.canPause,
        resumeLoopExecution: !this.canPause && this.canResume,
        stepLoopExecution: this.canStep !== null,

        cancelExecution: true,
        reset: true,

        // other
        openView:
          this.canOpenView !== null && compatibility.canDetachNodeViews(),
      };

      return (
        Object.entries(conditionMap)
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          .filter(([_, visible]) => visible)
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          .map(([name, _]) => this.actions[name as keyof Actions])
      );
    },
  },
  methods: {
    /*
     * If this node is selected, hoverTitle appends the hotkey to the title
     * otherwise the title is returned
     */
    hoverTitle(title: string, hotkeyText?: string) {
      return this.isNodeSelected && hotkeyText
        ? `${title} - ${hotkeyText}`
        : title;
    },
    dispatchShortcut(shortcut: ShortcutName, additionalMetadata = {}) {
      this.$shortcuts.dispatch(shortcut, {
        metadata: { nodeId: this.nodeId, ...additionalMetadata },
      });
    },
  },
});
</script>

<template>
  <g>
    <ActionBar :actions="visibleActions" />

    <text class="node-id" text-anchor="middle" :y="-$shapes.nodeIdMargin">
      {{ nodeId }}
    </text>
  </g>
</template>

<style scoped>
.node-id {
  font:
    normal 10px "Roboto Condensed",
    sans-serif;
  pointer-events: none;
}
</style>
