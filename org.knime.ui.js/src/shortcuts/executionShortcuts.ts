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
import { useNodeConfigurationStore } from "@/store/nodeConfiguration/nodeConfiguration";
import { useSelectionStore } from "@/store/selection";
import { useUIControlsStore } from "@/store/uiControls/uiControls";
import { useExecutionStore } from "@/store/workflow/execution";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { isNativeNode } from "@/util/nodeUtil";

import type { ShortcutExecuteContext, UnionToShortcutRegistry } from "./types";

const executeAndOpenViewHelper = ({ payload = {} }: ShortcutExecuteContext) => {
  const { nodeId } = payload.metadata || {};
  const selectedNodeId = nodeId || useSelectionStore().singleSelectedNode?.id;

  useExecutionStore().executeNodeAndOpenView(selectedNodeId);
};

// eslint-disable-next-line @typescript-eslint/no-extra-parens
const canExecuteAndOpenView = () =>
  useUIControlsStore().canDetachNodeViews &&
  Boolean(useSelectionStore().singleSelectedNode) &&
  Boolean(
    useSelectionStore().singleSelectedNode!.allowedActions?.canExecute ||
      useSelectionStore().singleSelectedNode!.allowedActions?.canOpenView,
  );

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
    execute: () => useExecutionStore().executeNodes("all"),
    condition: () =>
      Boolean(useWorkflowStore().activeWorkflow?.allowedActions?.canExecute),
  },
  cancelAll: {
    text: "Cancel all",
    title: "Cancel workflow execution",
    hotkey: ["Shift", "F9"],
    group: "execution",
    icon: CancelAllIcon,
    execute: () => useExecutionStore().cancelNodeExecution("all"),
    condition: () =>
      Boolean(useWorkflowStore().activeWorkflow?.allowedActions?.canCancel),
  },
  resetAll: {
    text: "Reset all",
    title: "Reset executed nodes",
    hotkey: ["Shift", "F8"],
    group: "execution",
    icon: ResetAllIcon,
    execute: () => useExecutionStore().resetNodes("all"),
    condition: () =>
      Boolean(useWorkflowStore().activeWorkflow?.allowedActions?.canReset),
  },

  // selected nodes (multiple)
  executeSelected: {
    text: "Execute",
    title: "Execute selected nodes",
    hotkey: ["F7"],
    group: "execution",
    icon: ExecuteSelectedIcon,
    execute: async ({ payload = {} }) => {
      const canContinue = await useNodeConfigurationStore().autoApplySettings({
        nextNodeId: payload?.metadata?.nodeId,
      });

      if (!canContinue) {
        return;
      }
      const selectedNodeId = payload?.metadata?.nodeId
        ? [payload?.metadata?.nodeId]
        : "selected";
      useExecutionStore().executeNodes(selectedNodeId);
    },
    condition: () =>
      useSelectionStore().getSelectedNodes.some(
        (node: KnimeNode) => node.allowedActions?.canExecute,
      ),
  },
  executeAndOpenView: {
    text: () =>
      useSelectionStore().singleSelectedNode?.allowedActions?.canExecute
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
    execute: ({ payload = {} }) => {
      const selectedNodeId = payload?.metadata?.nodeId
        ? [payload?.metadata?.nodeId]
        : "selected";
      useExecutionStore().cancelNodeExecution(selectedNodeId);
    },
    condition: () =>
      useSelectionStore().getSelectedNodes.some(
        (node: KnimeNode) => node.allowedActions?.canCancel,
      ),
  },
  resetSelected: {
    text: "Reset",
    title: "Reset selected nodes",
    hotkey: ["F8"],
    group: "execution",
    icon: ResetSelectedIcon,
    execute: ({ payload = {} }) => {
      const selectedNodeId = payload?.metadata?.nodeId
        ? [payload?.metadata?.nodeId]
        : "selected";
      useExecutionStore().resetNodes(selectedNodeId);
    },
    condition: () =>
      useSelectionStore().getSelectedNodes.some(
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
    execute: ({ payload = {} }) => {
      const selectedNodeId =
        payload?.metadata?.nodeId || useSelectionStore().singleSelectedNode?.id;
      useExecutionStore().resumeLoopExecution(selectedNodeId);
    },
    condition: () => {
      const selectedNode = useSelectionStore().singleSelectedNode;

      if (!selectedNode || !isNativeNode(selectedNode)) {
        return false;
      }
      return Boolean(selectedNode.loopInfo?.allowedActions?.canResume);
    },
  },
  pauseLoopExecution: {
    text: "Pause loop",
    title: "Pause loop execution",
    hotkey: ["CtrlOrCmd", "Alt", "F7"],
    group: "execution",
    icon: PauseLoopIcon,
    execute: ({ payload = {} }) => {
      const selectedNodeId =
        payload?.metadata?.nodeId || useSelectionStore().singleSelectedNode?.id;
      useExecutionStore().pauseLoopExecution(selectedNodeId);
    },
    condition: () => {
      const selectedNode = useSelectionStore().singleSelectedNode;

      if (!selectedNode || !isNativeNode(selectedNode)) {
        return false;
      }
      return Boolean(selectedNode.loopInfo?.allowedActions?.canPause);
    },
  },
  stepLoopExecution: {
    text: "Step loop",
    title: "Execute one loop step",
    hotkey: ["CtrlOrCmd", "Alt", "F6"],
    group: "execution",
    icon: StepLoopIcon,
    execute: ({ payload = {} }) => {
      const selectedNodeId =
        payload?.metadata?.nodeId || useSelectionStore().singleSelectedNode?.id;
      useExecutionStore().stepLoopExecution(selectedNodeId);
    },
    condition: () => {
      const selectedNode = useSelectionStore().singleSelectedNode;

      if (!selectedNode || !isNativeNode(selectedNode)) {
        return false;
      }
      return Boolean(selectedNode.loopInfo?.allowedActions?.canStep);
    },
  },
};

export default executionShortcuts;
