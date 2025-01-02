<script setup lang="ts">
import { computed } from "vue";

import type { Node } from "@/api/gateway-api/generated-api";
import CancelIcon from "@/assets/cancel.svg";
import OpenDialogIcon from "@/assets/configure-node.svg";
import ExecuteIcon from "@/assets/execute.svg";
import OpenViewIcon from "@/assets/open-view.svg";
import PauseIcon from "@/assets/pause-execution.svg";
import ResetIcon from "@/assets/reset-all.svg";
import ResumeIcon from "@/assets/resume-execution.svg";
import StepIcon from "@/assets/step-execution.svg";
import ActionBar from "@/components/common/ActionBar.vue";
import { useShortcuts } from "@/plugins/shortcuts";
import type { ShortcutName } from "@/shortcuts";
import { useUIControlsStore } from "@/store/uiControls/uiControls";

/**
 *  Displays a bar of action buttons above nodes
 */

type Props = {
  nodeId: string;
  nodeKind: Node.KindEnum;
  isNodeSelected?: boolean;
  canExecute?: boolean;
  canCancel?: boolean;
  canReset?: boolean;
  canConfigure?: boolean;
  /*
   * The props below can either be true, false or unset.
   */
  canStep?: boolean | null;
  canPause?: boolean | null;
  canResume?: boolean | null;
  canOpenView?: boolean | null;
};

const props = withDefaults(defineProps<Props>(), {
  isNodeSelected: false,
  canExecute: false,
  canCancel: false,
  canReset: false,
  canConfigure: false,
  canStep: null,
  canPause: null,
  canResume: null,
  canOpenView: null,
});

const $shortcuts = useShortcuts();

/*
 * If this node is selected, hoverTitle appends the hotkey to the title
 * otherwise the title is returned
 */
const hoverTitle = (title: string, hotkeyText?: string) => {
  return props.isNodeSelected && hotkeyText
    ? `${title} - ${hotkeyText}`
    : title;
};

const dispatchShortcut = (shortcut: ShortcutName, additionalMetadata = {}) => {
  $shortcuts.dispatch(shortcut, {
    metadata: { nodeId: props.nodeId, ...additionalMetadata },
  });
};

type Action = {
  title: () => string;
  disabled: boolean;
  icon: any;
  onClick: () => void;
};

// all possible actions
const actions = computed<Record<string, Action>>(() => {
  return {
    configureNode: {
      title: () =>
        hoverTitle("Configure", $shortcuts.get("configureNode").hotkeyText),
      disabled: !props.canConfigure,
      icon: OpenDialogIcon,
      onClick: () => dispatchShortcut("configureNode"),
    },
    pauseLoopExecution: {
      title: () =>
        hoverTitle("Pause", $shortcuts.get("pauseLoopExecution").hotkeyText),
      disabled: false,
      icon: PauseIcon,
      onClick: () => dispatchShortcut("pauseLoopExecution"),
    },
    resumeLoopExecution: {
      title: () =>
        hoverTitle("Resume", $shortcuts.get("resumeLoopExecution").hotkeyText),
      disabled: false,
      icon: ResumeIcon,
      onClick: () => dispatchShortcut("resumeLoopExecution"),
    },
    execute: {
      title: () =>
        hoverTitle("Execute", $shortcuts.get("executeSelected").hotkeyText),
      disabled: !props.canExecute,
      icon: ExecuteIcon,
      onClick: () => dispatchShortcut("executeSelected"),
    },
    stepLoopExecution: {
      title: () =>
        hoverTitle("Step", $shortcuts.get("stepLoopExecution").hotkeyText),
      disabled: !props.canStep,
      icon: StepIcon,
      onClick: () => dispatchShortcut("stepLoopExecution"),
    },
    cancelExecution: {
      title: () =>
        hoverTitle("Cancel", $shortcuts.get("cancelSelected").hotkeyText),
      disabled: !props.canCancel,
      icon: CancelIcon,
      onClick: () => dispatchShortcut("cancelSelected"),
    },
    reset: {
      title: () =>
        hoverTitle("Reset", $shortcuts.get("resetSelected").hotkeyText),
      disabled: !props.canReset,
      icon: ResetIcon,
      onClick: () => dispatchShortcut("resetSelected"),
    },
    openView: {
      title: () =>
        hoverTitle(
          props.canExecute ? "Execute and open view" : "Open view",
          $shortcuts.get("executeAndOpenView").hotkeyText,
        ),
      disabled: !props.canOpenView && !props.canExecute,
      icon: OpenViewIcon,
      onClick: () => dispatchShortcut("executeAndOpenView"),
    },
  } as const;
});

const uiControls = useUIControlsStore();

type Actions = typeof actions.value;

const visibleActions = computed<Action[]>(() => {
  if (!uiControls.canEditWorkflow) {
    return [];
  }

  const conditionMap: Record<keyof Actions, boolean> = {
    configureNode: props.canConfigure && uiControls.canConfigureNodes,

    // plain execution
    execute: !props.canPause && !props.canResume,

    // loop execution
    pauseLoopExecution: Boolean(props.canPause),
    resumeLoopExecution: Boolean(!props.canPause && props.canResume),
    stepLoopExecution: props.canStep !== null,

    cancelExecution: true,
    reset: true,

    // other
    openView: props.canOpenView !== null && uiControls.canDetachNodeViews,
  };

  return (
    Object.entries(conditionMap)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([_, visible]) => visible)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(([name, _]) => actions.value[name])
  );
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
