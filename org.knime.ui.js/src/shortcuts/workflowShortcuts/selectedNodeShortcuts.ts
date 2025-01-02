import { navigatorUtils } from "@knime/utils";

import type { KnimeNode } from "@/api/custom-types";
import OpenDialogIcon from "@/assets/configure-node.svg";
import { isDesktop } from "@/environment";
import { getToastsProvider } from "@/plugins/toasts";
import { useApplicationStore } from "@/store/application/application";
import type { NodeOutputTabIdentifier } from "@/store/selection";
import { useSelectionStore } from "@/store/selection";
import { useExecutionStore } from "@/store/workflow/execution";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { isNodeMetaNode } from "@/util/nodeUtil";
import { getNextSelectedPort } from "@/util/portSelection";
import type { UnionToShortcutRegistry } from "../types";

type SelectedNodeWorkflowShortcuts = UnionToShortcutRegistry<
  | "activateOutputPort"
  | "activateFlowVarPort"
  | "detachOutputPort"
  | "detachFlowVarPort"
  | "detachActiveOutputPort"
  | "editNodeComment"
  | "shuffleSelectedPort"
>;

const getPortFromKey = (
  node: KnimeNode,
  e: KeyboardEvent,
): NodeOutputTabIdentifier => {
  let port: NodeOutputTabIdentifier = `${Number(e.code.slice("Digit".length))}`;

  if (port === "1" && "hasView" in node && node.hasView) {
    port = "view";
  } else if (isNodeMetaNode(node)) {
    // Metanodes don't have a flowvariable port,
    // their port tabs are 0-indexed instead
    port = `${Number(port) - 1}`;
  }

  if (Number(port) >= node.outPorts.length) {
    return null;
  }

  return port;
};

const selectedNodeWorkflowShortcuts: SelectedNodeWorkflowShortcuts = {
  activateOutputPort: {
    text: "Activate the n-th output port view",
    hotkey: ["Shift", "1-9"],
    group: "selectedNode",
    execute: ({ payload }) => {
      const event = payload.event! as KeyboardEvent;
      const { singleSelectedNode, setActivePortTab } = useSelectionStore();
      const port = getPortFromKey(singleSelectedNode!, event);

      if (port) {
        setActivePortTab(port);
      }
    },
    condition: () => {
      const { singleSelectedNode } = useSelectionStore();
      return Boolean(
        singleSelectedNode && singleSelectedNode.outPorts.length > 0,
      );
    },
  },
  activateFlowVarPort: {
    text: "Activate flow variable view",
    hotkey: ["Shift", "0"],
    additionalHotkeys: [{ key: ["Shift", "0-0"], visible: false }], // range matches Digit0 Key even with shift
    group: "selectedNode",
    execute: () => {
      useSelectionStore().setActivePortTab("0");
    },
    condition: () => {
      const { singleSelectedNode } = useSelectionStore();
      const { availablePortTypes } = useApplicationStore();

      if (!singleSelectedNode) {
        return false;
      }

      const hasFlowVarPort =
        availablePortTypes[singleSelectedNode?.outPorts[0]?.typeId]?.kind ===
        "flowVariable";

      return hasFlowVarPort;
    },
  },
  detachOutputPort: {
    text: "Detach the n-th output port view",
    hotkey: ["Shift", "Alt", "1-9"],
    icon: OpenDialogIcon,
    group: "selectedNode",
    execute: ({ payload }) => {
      const event = payload.event! as KeyboardEvent;
      const { singleSelectedNode } = useSelectionStore();
      const port = getPortFromKey(singleSelectedNode!, event);

      if (port) {
        useExecutionStore().openPortView({ node: singleSelectedNode!, port });
      }
    },
    condition: () => {
      const { singleSelectedNode } = useSelectionStore();
      return Boolean(
        isDesktop &&
          singleSelectedNode &&
          singleSelectedNode.outPorts.length > 0,
      );
    },
  },

  detachFlowVarPort: {
    text: "Detach flow variable view",
    hotkey: ["Shift", "Alt", "0"],
    additionalHotkeys: [{ key: ["Shift", "Alt", "0-0"], visible: false }], // range matches Digit0 Key even with shift
    icon: OpenDialogIcon,
    group: "selectedNode",
    execute: () => {
      const { singleSelectedNode } = useSelectionStore();

      if (singleSelectedNode?.state?.executionState === "EXECUTED") {
        useExecutionStore().openPortView({
          node: singleSelectedNode!,
          port: "0",
        });
      } else {
        // TODO: NXT-2024 remove this condition once flowvars can be detached in 'configured' state
        getToastsProvider().show({
          id: "__FLOWVAR_DETACH_SHORTCUT_FAILED",
          headline: "Error detaching flow variable view",
          message: "Execute the selected node first.",
          type: "error",
        });
      }
    },
    condition: () => {
      const { singleSelectedNode } = useSelectionStore();
      const { availablePortTypes } = useApplicationStore();

      if (!singleSelectedNode) {
        return false;
      }

      const hasFlowVarPort =
        availablePortTypes[singleSelectedNode?.outPorts[0]?.typeId]?.kind ===
        "flowVariable";

      return isDesktop && hasFlowVarPort;
    },
  },

  detachActiveOutputPort: {
    text: "Detach active output port view",
    hotkey: ["Shift", "Alt", "Enter"],
    icon: OpenDialogIcon,
    group: "selectedNode",
    execute: () => {
      const { singleSelectedNode, activePortTab } = useSelectionStore();

      if (!singleSelectedNode || !activePortTab) {
        return;
      }

      useExecutionStore().openPortView({
        node: singleSelectedNode,
        port: activePortTab,
      });
    },
    condition: () => {
      const { singleSelectedNode, activePortTab } = useSelectionStore();

      return Boolean(isDesktop && singleSelectedNode && activePortTab);
    },
  },
  editNodeComment: {
    text: "Edit node comment",
    hotkey: ["F2"],
    group: "selectedNode",
    execute: () => {
      const { singleSelectedNode } = useSelectionStore();

      if (singleSelectedNode) {
        useNodeInteractionsStore().openLabelEditor(singleSelectedNode.id);
      }
    },
    condition: () => {
      const { singleSelectedNode, singleSelectedObject } = useSelectionStore();

      return Boolean(
        singleSelectedObject &&
          singleSelectedNode &&
          useWorkflowStore().isWritable,
      );
    },
  },

  shuffleSelectedPort: {
    text: "Select (next) port",
    title: "Select (next) port of the selected node",
    hotkey: [navigatorUtils.isMac() ? "Ctrl" : "Alt", "P"], // Alt+P yields a pi-symbol on mac
    group: "selectedNode",
    execute: () => {
      const { singleSelectedNode, activeNodePorts, updateActiveNodePorts } =
        useSelectionStore();

      if (!singleSelectedNode) {
        return;
      }

      const currentSelectedPort =
        activeNodePorts.nodeId === singleSelectedNode.id
          ? activeNodePorts.selectedPort
          : null;

      updateActiveNodePorts({
        nodeId: singleSelectedNode.id,
        selectedPort: getNextSelectedPort(
          singleSelectedNode,
          currentSelectedPort,
          useWorkflowStore().isWritable,
        ),
      });
    },
    condition: () => {
      return Boolean(
        useSelectionStore().singleSelectedNode && useWorkflowStore().isWritable,
      );
    },
  },
};

export default selectedNodeWorkflowShortcuts;
