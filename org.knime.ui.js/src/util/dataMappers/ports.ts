import type { AvailablePortTypes, KnimeNode } from "@/api/custom-types";
import {
  MetaNodePort,
  NodeState,
  type PortViewDescriptor,
  type PortViewDescriptorMapping,
  type PortViews,
} from "@/api/gateway-api/generated-api";
import { isNodeMetaNode } from "../nodeUtil";

import type { ExtendedPortType } from "./common";

/**
 * Maps a port `typeId` string or a object with a `typeId` property to a port object with all the properties of the
 * PortObject schema from the API
 * @param availablePortTypes Dictionary of all available port types and their information
 * @param includeType whether to include a `type` property holding the value of the port kind.
 * This is necessary when the data will injected (down the line) into the PortIcon component from webapps-common
 * which uses a `type` prop instead of a `kind`
 * @returns mapping function that takes either a string that represents the port type id, or an object
 * with a `typeId` property. This mapping function will return the whole port object with information about color, kind,
 * etc
 */
const toExtendedPortObject =
  (availablePortTypes: AvailablePortTypes, includeType = true) =>
  (input: string | { typeId: string }): ExtendedPortType => {
    const isStringInput = typeof input === "string";
    const fullPortObject = isStringInput
      ? availablePortTypes[input]
      : availablePortTypes[input.typeId];

    const result: ExtendedPortType = {
      ...fullPortObject,
      description: "No description available",
      typeId: isStringInput ? input : input?.typeId,
    };

    return includeType
      ? {
          ...result,
          // NodePreview component in webapps-common uses a `type` prop instead of kind.
          // See: WorkflowMetadata.vue or NodeTemplate.vue
          type: fullPortObject.kind,
          ...(typeof input === "string" ? {} : input),
        }
      : result;
  };

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
 * Given a PortView descriptor configuration plus node and one of its ports' index
 * then return the data needed to render these views for this node
 */
const toRenderablePortViewState = (
  portViews: PortViews,
  node: KnimeNode,
  portIndex: number,
): Array<{
  id: string;
  text: string;
  disabled: boolean;
  detachable: boolean;
}> => {
  const descriptorKey = getDescriptorMappingKeyForPortView(node, portIndex);

  if (!portViews) {
    return [];
  }

  const descriptorIndexes = portViews.descriptorMapping[descriptorKey] ?? [];

  // non-spec views are disabled at the configured state
  const isDisabled = (item: PortViewDescriptor) =>
    !item.isSpecView && descriptorKey === "configured";

  return descriptorIndexes.map((index) => {
    const descriptor = portViews.descriptors.at(index)!;

    return {
      id: index.toString(),
      text: descriptor.label,
      disabled: isDisabled(descriptor),
      detachable: !descriptor.isSpecView,
    };
  });
};

export const ports = {
  toExtendedPortObject,
  toRenderablePortViewState,
};
