import CancelAllIcon from "@knime/styles/img/icons/cancel-execution.svg";
import ExecuteAllIcon from "@knime/styles/img/icons/execute-all.svg";
import ResetAllIcon from "@knime/styles/img/icons/reset-all.svg";
import CancelSelectedIcon from "@knime/styles/img/icons/selected-cancel.svg";
import ExecuteSelectedIcon from "@knime/styles/img/icons/selected-execute.svg";
import ResetSelectedIcon from "@knime/styles/img/icons/selected-reset.svg";

import type { KnimeNode } from "@/api/custom-types";
import OpenViewIcon from "@/assets/open-view.svg";
import PauseLoopIcon from "@/assets/pause-execution.svg";
import ResumeLoopIcon from "@/assets/resume-execution.svg";
import StepLoopIcon from "@/assets/step-execution.svg";

import type {
  ShortcutConditionContext,
  ShortcutExecuteContext,
  UnionToShortcutRegistry,
} from "./types";

const executeAndOpenViewHelper = ({
  $store,
  payload = {},
}: ShortcutExecuteContext) => {
  const { nodeId } = payload.metadata || {};
  const selectedNodeId =
    nodeId || $store.getters["selection/singleSelectedNode"].id;
  $store.dispatch("workflow/executeNodeAndOpenView", selectedNodeId);
};

// eslint-disable-next-line @typescript-eslint/no-extra-parens
const canExecuteAndOpenView = ({ $store }: ShortcutConditionContext) =>
  $store.state.uiControls.canDetachNodeViews &&
  $store.getters["selection/singleSelectedNode"] &&
  ($store.getters["selection/singleSelectedNode"].allowedActions.canExecute ||
    $store.getters["selection/singleSelectedNode"].allowedActions.canOpenView);

type ExecutionShortcuts = UnionToShortcutRegistry<
  | "executeAll"
  | "cancelAll"
  | "resetAll"
  | "executeSelected"
  | "executeAndOpenView"
  | "cancelSelected"
  | "resetSelected"
  | "resumeLoopExecution"
  | "pauseLoopExecution"
  | "stepLoopExecution"
>;

declare module "./index" {
  interface ShortcutsRegistry extends ExecutionShortcuts {}
}

const executionShortcuts: ExecutionShortcuts = {
  executeAll: {
    text: "Execute all",
    title: "Execute workflow",
    hotkey: ["Shift", "F7"],
    group: "execution",
    icon: ExecuteAllIcon,
    execute: ({ $store }) => $store.dispatch("workflow/executeNodes", "all"),
    condition: ({ $store }) =>
      Boolean($store.state.workflow.activeWorkflow?.allowedActions?.canExecute),
  },
  cancelAll: {
    text: "Cancel all",
    title: "Cancel workflow execution",
    hotkey: ["Shift", "F9"],
    group: "execution",
    icon: CancelAllIcon,
    execute: ({ $store }) =>
      $store.dispatch("workflow/cancelNodeExecution", "all"),
    condition: ({ $store }) =>
      Boolean($store.state.workflow.activeWorkflow?.allowedActions?.canCancel),
  },
  resetAll: {
    text: "Reset all",
    title: "Reset executed nodes",
    hotkey: ["Shift", "F8"],
    group: "execution",
    icon: ResetAllIcon,
    execute: ({ $store }) => $store.dispatch("workflow/resetNodes", "all"),
    condition: ({ $store }) =>
      Boolean($store.state.workflow.activeWorkflow?.allowedActions?.canReset),
  },

  // selected nodes (multiple)
  executeSelected: {
    text: "Execute",
    title: "Execute selected nodes",
    hotkey: ["F7"],
    group: "execution",
    icon: ExecuteSelectedIcon,
    execute: ({ $store, payload = {} }) => {
      const selectedNodeId = payload?.metadata?.nodeId
        ? [payload?.metadata?.nodeId]
        : "selected";
      $store.dispatch("workflow/executeNodes", selectedNodeId);
    },
    condition: ({ $store }) =>
      $store.getters["selection/selectedNodes"].some(
        (node: KnimeNode) => node.allowedActions?.canExecute,
      ),
  },
  executeAndOpenView: {
    text: ({ $store }) =>
      $store.getters["selection/singleSelectedNode"].allowedActions.canExecute
        ? "Execute and open view"
        : "Open view",
    description: "Open view",
    hotkey: ["F10"],
    group: "execution",
    icon: OpenViewIcon,
    execute: executeAndOpenViewHelper,
    condition: canExecuteAndOpenView,
  },
  cancelSelected: {
    text: "Cancel",
    title: "Cancel selected nodes",
    hotkey: ["F9"],
    group: "execution",
    icon: CancelSelectedIcon,
    execute: ({ $store, payload = {} }) => {
      const selectedNodeId = payload?.metadata?.nodeId
        ? [payload?.metadata?.nodeId]
        : "selected";
      $store.dispatch("workflow/cancelNodeExecution", selectedNodeId);
    },
    condition: ({ $store }) =>
      $store.getters["selection/selectedNodes"].some(
        (node: KnimeNode) => node.allowedActions?.canCancel,
      ),
  },
  resetSelected: {
    text: "Reset",
    title: "Reset selected nodes",
    hotkey: ["F8"],
    group: "execution",
    icon: ResetSelectedIcon,
    execute: ({ $store, payload = {} }) => {
      const selectedNodeId = payload?.metadata?.nodeId
        ? [payload?.metadata?.nodeId]
        : "selected";
      $store.dispatch("workflow/resetNodes", selectedNodeId);
    },
    condition: ({ $store }) =>
      $store.getters["selection/selectedNodes"].some(
        (node: KnimeNode) => node.allowedActions?.canReset,
      ),
  },

  // single node
  resumeLoopExecution: {
    text: "Resume loop",
    title: "Resume loop execution",
    hotkey: ["CtrlOrCmd", "Alt", "F8"],
    group: "execution",
    icon: ResumeLoopIcon,
    execute: ({ $store, payload = {} }) => {
      const selectedNodeId =
        payload?.metadata?.nodeId ||
        $store.getters["selection/singleSelectedNode"].id;
      $store.dispatch("workflow/resumeLoopExecution", selectedNodeId);
    },
    condition: ({ $store }) =>
      $store.getters["selection/singleSelectedNode"]?.loopInfo?.allowedActions
        ?.canResume,
  },
  pauseLoopExecution: {
    text: "Pause loop",
    title: "Pause loop execution",
    hotkey: ["CtrlOrCmd", "Alt", "F7"],
    group: "execution",
    icon: PauseLoopIcon,
    execute: ({ $store, payload = {} }) => {
      const selectedNodeId =
        payload?.metadata?.nodeId ||
        $store.getters["selection/singleSelectedNode"].id;
      $store.dispatch("workflow/pauseLoopExecution", selectedNodeId);
    },
    condition: ({ $store }) =>
      $store.getters["selection/singleSelectedNode"]?.loopInfo?.allowedActions
        ?.canPause,
  },
  stepLoopExecution: {
    text: "Step loop",
    title: "Execute one loop step",
    hotkey: ["CtrlOrCmd", "Alt", "F6"],
    group: "execution",
    icon: StepLoopIcon,
    execute: ({ $store, payload = {} }) => {
      const selectedNodeId =
        payload?.metadata?.nodeId ||
        $store.getters["selection/singleSelectedNode"].id;
      $store.dispatch("workflow/stepLoopExecution", selectedNodeId);
    },
    condition: ({ $store }) =>
      $store.getters["selection/singleSelectedNode"]?.loopInfo?.allowedActions
        ?.canStep,
  },
};

export default executionShortcuts;
