import type { KnimeNode } from "@/api/custom-types";
import {
  MetaNodePort,
  NodeState,
  type PortViewDescriptor,
  type PortViewDescriptorMapping,
  type PortViews,
} from "@/api/gateway-api/generated-api";

import { isNodeMetaNode } from "./nodeUtil";

/**
 * Based on a node and a port index, it will return the key that can be used
 * to read the appropriate descriptor mapping that describes the port view of that
 * the given node and port
 */
const getDescriptorMappingKeyForPortView = (
  node: KnimeNode,
  portIndex: number,
): keyof PortViewDescriptorMapping => {
  if (isNodeMetaNode(node)) {
    const portState = node.outPorts[portIndex].nodeState;

    return portState === MetaNodePort.NodeStateEnum.CONFIGURED
      ? "configured"
      : "executed";
  }

  return node.state?.executionState === NodeState.ExecutionStateEnum.CONFIGURED
    ? "configured"
    : "executed";
};

/**
 * Given port view descriptors, a node and a port index, creates the items that represent
 * the port views that can be displayed for the given parameters
 */
export const getPortViewByViewDescriptors = (
  data: PortViews,
  node: KnimeNode,
  portIndex: number,
): Array<{
  id: string;
  text: string;
  disabled: boolean;
  canDetach?: boolean;
}> => {
  const descriptorKey = getDescriptorMappingKeyForPortView(node, portIndex);

  const descriptorIndexes = data.descriptorMapping[descriptorKey] ?? [];

  // non-spec views are disabled at the configured state
  const isDisabled = (item: PortViewDescriptor) =>
    !item.isSpecView && descriptorKey === "configured";

  return descriptorIndexes.map((index) => {
    const descriptor = data.descriptors.at(index)!;

    return {
      // tab id will be the descriptor index
      id: index.toString(),
      text: descriptor.label,
      disabled: isDisabled(descriptor),
      canDetach: !descriptor.isSpecView,
    };
  });
};
