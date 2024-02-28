import ExecuteAllIcon from "webapps-common/ui/assets/img/icons/execute-all.svg";
import CancelAllIcon from "webapps-common/ui/assets/img/icons/cancel-execution.svg";
import ResetAllIcon from "webapps-common/ui/assets/img/icons/reset-all.svg";
import OpenViewIcon from "@/assets/open-view.svg";

import ExecuteSelectedIcon from "webapps-common/ui/assets/img/icons/selected-execute.svg";
import CancelSelectedIcon from "webapps-common/ui/assets/img/icons/selected-cancel.svg";
import ResetSelectedIcon from "webapps-common/ui/assets/img/icons/selected-reset.svg";

import ResumeLoopIcon from "@/assets/resume-execution.svg";
import PauseLoopIcon from "@/assets/pause-execution.svg";
import StepLoopIcon from "@/assets/step-execution.svg";

import type { KnimeNode } from "@/api/custom-types";
import { compatibility } from "@/environment";

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
  compatibility.canDetachNodeViews() &&
  $store.getters["selection/singleSelectedNode"] &&
  ($store.getters["selection/singleSelectedNode"].allowedActions.canExecute ||
    $store.getters["selection/singleSelectedNode"].allowedActions.canOpenView);

type ExecutionShortcuts = UnionToShortcutRegistry<
  | "executeAll"
  | "cancelAll"
  | "resetAll"
  | "executeSelected"
  | "executeAndOpenView"
  | "executeAndOpenViewShortcutAlternative"
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
    icon: ExecuteAllIcon,
    execute: ({ $store }) => $store.dispatch("workflow/executeNodes", "all"),
    condition: ({ $store }) =>
      Boolean($store.state.workflow.activeWorkflow?.allowedActions?.canExecute),
  },
  cancelAll: {
    text: "Cancel all",
    title: "Cancel workflow execution",
    hotkey: ["Shift", "F9"],
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
    hotkey: ["F10"],
    icon: OpenViewIcon,
    execute: executeAndOpenViewHelper,
    condition: canExecuteAndOpenView,
  },
  /**
   * (This shortcut should not be used anywhere, see executeAndOpenView)
   *
   * The only purpose of this is to add the second hotkey for executeAndOpenView.
   */
  executeAndOpenViewShortcutAlternative: {
    hotkey: ["Shift", "F10"],
    execute: executeAndOpenViewHelper,
    condition: canExecuteAndOpenView,
  },
  cancelSelected: {
    text: "Cancel",
    title: "Cancel selected nodes",
    hotkey: ["F9"],
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
    hotkey: ["Ctrl", "Alt", "F8"],
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
    hotkey: ["Ctrl", "Alt", "F7"],
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
    hotkey: ["Ctrl", "Alt", "F6"],
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
