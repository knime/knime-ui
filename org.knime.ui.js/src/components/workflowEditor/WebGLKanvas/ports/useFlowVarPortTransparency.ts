import { type Ref, computed, watch } from "vue";
import { gsap } from "gsap";
import { isEqual } from "lodash-es";
import type { ContainerInst } from "vue3-pixi";

import {
  Node,
  type NodePort as NodePortType,
} from "@/api/gateway-api/generated-api";
import { useNodeHoveredStateListener } from "../node/useNodeHoveredState";

type UseFlowVarPortTransparencyOptions = {
  portsContainer: Ref<ContainerInst | undefined>;
  nodeId: string;
  nodeKind: Node.KindEnum;
  inPorts: Ref<NodePortType[]>;
  outPorts: Ref<NodePortType[]>;
  draggedConnectorPort: Ref<NodePortType | undefined>;
  getPortContainerName: (index: number, direction: "in" | "out") => string;
  isDefaultFlowVariable: (index: number) => boolean;
};

export const useFlowVarPortTransparency = (
  options: UseFlowVarPortTransparencyOptions,
) => {
  const {
    nodeId,
    nodeKind,
    portsContainer: ports,
    inPorts,
    outPorts,
    draggedConnectorPort,
    getPortContainerName,
    isDefaultFlowVariable,
  } = options;

  /**
   * Gets the pixi display object instances that render flow variable ports
   */
  const getFlowVariableContainers = () => {
    if (options.nodeKind === Node.KindEnum.Metanode || !ports.value) {
      return null;
    }

    const defaulFlowVarOut = ports.value.getChildByName(
      getPortContainerName(0, "out"),
    )!;
    const defaulFlowVarIn = ports.value.getChildByName(
      getPortContainerName(0, "in"),
    )!;

    return [defaulFlowVarOut, defaulFlowVarIn];
  };

  /**
   * Get the port data instances of the flow variable ports
   */
  const flowVariablePorts = computed<[NodePortType, NodePortType] | null>(
    () => {
      if (nodeKind === Node.KindEnum.Metanode) {
        return null;
      }

      return [inPorts.value.at(0)!, outPorts.value.at(0)!];
    },
  );

  const hide = (target: ReturnType<ContainerInst["getChildByName"]>) =>
    gsap.to(target, { alpha: 0, duration: 0.5, delay: 0.25 });

  // When the hover area of the parent node is entered/left, we transition the
  // flow variable alpha (aka transparency), but only if they're not connected
  useNodeHoveredStateListener({
    nodeId,
    onEnterCallback: () => {
      if (options.nodeKind === Node.KindEnum.Metanode) {
        return;
      }

      const [flowVarIn, flowVarOut] = flowVariablePorts.value!;
      const [defaulFlowVarOut, defaulFlowVarIn] = getFlowVariableContainers()!;

      if (flowVarIn.connectedVia.length === 0) {
        gsap.to(defaulFlowVarIn, { alpha: 1, duration: 0.5, delay: 0.25 });
      }

      if (flowVarOut.connectedVia.length === 0) {
        gsap.to(defaulFlowVarOut, { alpha: 1, duration: 0.5, delay: 0.25 });
      }
    },
    onLeaveCallback: () => {
      if (nodeKind === Node.KindEnum.Metanode) {
        return;
      }

      const [flowVarIn, flowVarOut] = flowVariablePorts.value!;

      const [defaulFlowVarOut, defaulFlowVarIn] = getFlowVariableContainers()!;

      if (
        flowVarIn.connectedVia.length === 0 &&
        !isEqual(flowVarIn, draggedConnectorPort.value)
      ) {
        hide(defaulFlowVarIn);
      }

      if (
        flowVarOut.connectedVia.length === 0 &&
        !isEqual(flowVarOut, draggedConnectorPort.value)
      ) {
        hide(defaulFlowVarOut);
      }
    },
  });

  watch(draggedConnectorPort, (next, prev) => {
    // only run when drag connector is removed/hidden
    if (next) {
      return;
    }

    // skip metanode since they don't have default flow variables
    if (nodeKind === Node.KindEnum.Metanode) {
      return;
    }

    const [flowVarIn, flowVarOut] = flowVariablePorts.value!;
    const [defaulFlowVarOut, defaulFlowVarIn] = getFlowVariableContainers()!;

    if (flowVarIn.connectedVia.length === 0 && isEqual(flowVarIn, prev)) {
      hide(defaulFlowVarIn);
    }

    if (flowVarOut.connectedVia.length === 0 && isEqual(flowVarOut, prev)) {
      hide(defaulFlowVarOut);
    }
  });

  const getPortInitialAlpha = (port: NodePortType) => {
    if (port.connectedVia.length) {
      return 1;
    }

    return isDefaultFlowVariable(port.index) ? 0 : 1;
  };

  return { getPortInitialAlpha };
};
