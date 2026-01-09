import { ref } from "vue";
import { defineStore, storeToRefs } from "pinia";

import type { KnimeNode } from "@/api/custom-types";
import { workflowDomain } from "@/util/workflow-domain";

import { useSelectionStore } from "./selection";
import { useExecutionStore } from "./workflow/execution";

export type NodeOutputTabIdentifier = "view" | `${number}` | null;

export const useNodeOutputStore = defineStore("nodeOutput", () => {
  const activePortTab = ref<NodeOutputTabIdentifier | null>(null);

  const executionStore = useExecutionStore();
  const { singleSelectedNode } = storeToRefs(useSelectionStore());

  const getPortFromKey = (
    node: KnimeNode,
    event: KeyboardEvent,
  ): NodeOutputTabIdentifier => {
    let port: NodeOutputTabIdentifier = `${Number(
      event.code.slice("Digit".length),
    )}`;

    if (port === "1" && "hasView" in node && node.hasView) {
      port = "view";
    } else if (workflowDomain.node.isMetaNode(node)) {
      // Metanodes don't have a flowvariable port,
      // their port tabs are 0-indexed instead
      port = `${Number(port) - 1}`;
    }

    if (Number(port) >= node.outPorts.length) {
      return null;
    }

    return port;
  };

  const setActivePortTabByKeyboard = (event: KeyboardEvent) => {
    if (!singleSelectedNode.value) {
      return;
    }

    const port = getPortFromKey(singleSelectedNode.value, event);

    if (port) {
      activePortTab.value = port;
    }
  };

  const detachPortViewByKeyboard = (event: KeyboardEvent) => {
    if (!singleSelectedNode.value) {
      return;
    }

    const port = getPortFromKey(singleSelectedNode.value, event);

    if (!port) {
      return;
    }

    executionStore.openPortView({ node: singleSelectedNode.value!, port });
  };

  const detachDefaultFlowVariablePortView = () => {
    return executionStore.openPortView({
      node: singleSelectedNode.value!,
      port: "0",
    });
  };

  const detachActiveTabPortView = () => {
    if (!singleSelectedNode.value || !activePortTab.value) {
      return;
    }

    useExecutionStore().openPortView({
      node: singleSelectedNode.value,
      port: activePortTab.value,
    });
  };

  return {
    activePortTab,
    detachActiveTabPortView,
    setActivePortTabByKeyboard,
    detachPortViewByKeyboard,
    detachDefaultFlowVariablePortView,
  };
});
