import { navigatorUtils } from "@knime/utils";

import type { KnimeNode } from "@/api/custom-types";
import OpenDialogIcon from "@/assets/configure-node.svg";
import { isDesktop } from "@/environment";
import { getToastsProvider } from "@/plugins/toasts";
import type { NodeOutputTabIdentifier } from "@/store/selection";
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
    execute: ({ $store, payload }) => {
      const event = payload.event! as KeyboardEvent;
      const node = $store.getters["selection/singleSelectedNode"];
      const port = getPortFromKey(node, event);

      if (port) {
        $store.commit("selection/setActivePortTab", port);
      }
    },
    condition: ({ $store }) => {
      const singleSelectedNode = $store.getters["selection/singleSelectedNode"];
      return singleSelectedNode && singleSelectedNode.outPorts.length > 0;
    },
  },
  activateFlowVarPort: {
    text: "Activate flow variable view",
    hotkey: ["Shift", "0"],
    additionalHotkeys: [{ key: ["Shift", "0-0"], visible: false }], // range matches Digit0 Key even with shift
    group: "selectedNode",
    execute: ({ $store }) => {
      $store.commit("selection/setActivePortTab", "0");
    },
    condition: ({ $store }) => {
      const singleSelectedNode = $store.getters["selection/singleSelectedNode"];
      const portTypes = $store.state.application.availablePortTypes;
      const hasFlowVarPort =
        portTypes[singleSelectedNode?.outPorts[0]?.typeId]?.kind ===
        "flowVariable";

      return singleSelectedNode && hasFlowVarPort;
    },
  },
  detachOutputPort: {
    text: "Detach the n-th output port view",
    hotkey: ["Shift", "Alt", "1-9"],
    icon: OpenDialogIcon,
    group: "selectedNode",
    execute: ({ $store, payload }) => {
      const event = payload.event! as KeyboardEvent;
      const node = $store.getters["selection/singleSelectedNode"];
      const port = getPortFromKey(node, event);

      if (port) {
        $store.dispatch("workflow/openPortView", { node, port });
      }
    },
    condition: ({ $store }) => {
      const singleSelectedNode = $store.getters["selection/singleSelectedNode"];
      return (
        isDesktop &&
        singleSelectedNode &&
        singleSelectedNode.outPorts.length > 0
      );
    },
  },

  detachFlowVarPort: {
    text: "Detach flow variable view",
    hotkey: ["Shift", "Alt", "0"],
    additionalHotkeys: [{ key: ["Shift", "Alt", "0-0"], visible: false }], // range matches Digit0 Key even with shift
    icon: OpenDialogIcon,
    group: "selectedNode",
    execute: ({ $store }) => {
      const node: KnimeNode = $store.getters["selection/singleSelectedNode"];

      if (node.state?.executionState === "EXECUTED") {
        $store.dispatch("workflow/openPortView", { node, port: "0" });
      } else {
        // TODO: NXT-2024 remove this condition once flowvars can be detached in 'configured' state
        getToastsProvider().show({
          id: "__FLOWVAR_DETACH_SHORTCUT_FAILED",
          headline: "Error detaching flow variable view",
          message: "Please execute the node.",
          type: "error",
        });
      }
    },
    condition: ({ $store }) => {
      const singleSelectedNode = $store.getters["selection/singleSelectedNode"];
      const portTypes = $store.state.application.availablePortTypes;
      const hasFlowVarPort =
        portTypes[singleSelectedNode?.outPorts[0]?.typeId]?.kind ===
        "flowVariable";

      return isDesktop && singleSelectedNode && hasFlowVarPort;
    },
  },

  detachActiveOutputPort: {
    text: "Detach active output port view",
    hotkey: ["Shift", "Alt", "Enter"],
    icon: OpenDialogIcon,
    group: "selectedNode",
    execute: ({ $store }) => {
      const port = $store.state.selection.activePortTab;
      const node = $store.getters["selection/singleSelectedNode"];

      $store.dispatch("workflow/openPortView", { node, port });
    },
    condition: ({ $store }) => {
      const singleSelectedNode = $store.getters["selection/singleSelectedNode"];
      const port = $store.state.selection.activePortTab;
      return isDesktop && singleSelectedNode && port;
    },
  },
  editNodeComment: {
    text: "Edit node comment",
    hotkey: ["F2"],
    group: "selectedNode",
    execute: ({ $store }) => {
      if ($store.getters["selection/singleSelectedNode"]) {
        $store.dispatch(
          "workflow/openLabelEditor",
          $store.getters["selection/singleSelectedNode"].id,
        );
      }
    },
    condition: ({ $store }) => {
      const singleSelectedNode = $store.getters["selection/singleSelectedNode"];
      const singleSelectedObject =
        $store.getters["selection/singleSelectedObject"];
      return (
        singleSelectedObject &&
        singleSelectedNode &&
        $store.getters["workflow/isWritable"]
      );
    },
  },

  shuffleSelectedPort: {
    text: "Select (next) port",
    title: "Select (next) port of the selected node",
    hotkey: [navigatorUtils.isMac() ? "Ctrl" : "Alt", "P"], // Alt+P yields a pi-symbol on mac
    group: "selectedNode",
    execute: ({ $store }) => {
      const node = $store.getters["selection/singleSelectedNode"];
      const currentSelectedPort =
        $store.state.selection.activeNodePorts.nodeId === node.id
          ? $store.state.selection.activeNodePorts.selectedPort
          : null;
      $store.commit("selection/updateActiveNodePorts", {
        nodeId: node.id,
        selectedPort: getNextSelectedPort($store, node, currentSelectedPort),
      });
    },
    condition: ({ $store }) => {
      const node: KnimeNode = $store.getters["selection/singleSelectedNode"];
      return Boolean(node) && $store.getters["workflow/isWritable"];
    },
  },
};

export default selectedNodeWorkflowShortcuts;
