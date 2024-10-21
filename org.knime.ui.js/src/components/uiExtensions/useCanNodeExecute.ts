import { computed } from "vue";

import type { KnimeNode } from "@/api/custom-types";
import { useStore } from "@/composables/useStore";
import * as nodeUtils from "@/util/nodeUtil";
import { toExtendedPortObject } from "@/util/portDataMapper";

export const useCanNodeExecute = () => {
  const store = useStore();
  const uiControls = computed(() => store.state.uiControls);

  const availablePortTypes = computed(
    () => store.state.application.availablePortTypes,
  );

  const getFullPortObject = (node: KnimeNode, portIndex: number | null) => {
    try {
      if (portIndex === null) {
        return null;
      }

      const selectedPort = node.outPorts[portIndex];

      return toExtendedPortObject(availablePortTypes.value)(
        selectedPort.typeId,
      );
    } catch (error) {
      return null;
    }
  };

  const canExecute = (node: KnimeNode, portIndex: number | null) => {
    if (!uiControls.value.canEditWorkflow) {
      return false;
    }

    if (nodeUtils.isNodeMetaNode(node)) {
      return Boolean(
        portIndex !== null && nodeUtils.canExecute(node, portIndex),
      );
    }

    const isFlowVariable =
      getFullPortObject(node, portIndex)?.kind === "flowVariable";

    if (portIndex !== null) {
      return !isFlowVariable && nodeUtils.canExecute(node, portIndex);
    }

    // port index does not matter here
    return nodeUtils.canExecute(node, 0);
  };

  return { canExecute };
};
