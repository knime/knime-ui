import type { KnimeNode } from "@/api/custom-types";
import {
  type ComponentNode,
  type MetaNode,
  MetaNodePort,
  type NativeNode,
  NativeNodeInvariants,
  Node,
  NodeState,
} from "@/api/gateway-api/generated-api";
import { HibiscusDark, nodeBackgroundColors } from "@/style/colors";

export const isNativeNode = (node: KnimeNode): node is NativeNode =>
  node.kind === Node.KindEnum.Node;

export const isNodeMetaNode = (node: KnimeNode): node is MetaNode =>
  node.kind === Node.KindEnum.Metanode;

// TODO: NXT-2023 - remove union with name property
export const isNodeComponent = (
  node: KnimeNode,
): node is ComponentNode & { name: string } =>
  node.kind === Node.KindEnum.Component;

/**
 * Return the node execution state
 */
export const canExecute = (node: KnimeNode, portIndex: number) => {
  return isNodeMetaNode(node)
    ? node.outPorts[portIndex]?.nodeState ===
        MetaNodePort.NodeStateEnum.CONFIGURED
    : Boolean(node.allowedActions?.canExecute);
};

/**
 * metanodes have no configured state, so they use the state of the selected output port
 */
export const getNodeState = (node: KnimeNode, portIndex: number) => {
  return isNodeMetaNode(node)
    ? node.outPorts[portIndex]?.nodeState
    : node.state?.executionState;
};

export const isNodeExecuting = (node: KnimeNode) => {
  return (
    node.state?.executionState === NodeState.ExecutionStateEnum.EXECUTING ||
    node.state?.executionState === NodeState.ExecutionStateEnum.QUEUED
  );
};

/**
 * Gets the node color based on the type (e.g Source, Manipulator, etc).
 * Defaults to HibiscusDark for unknown types
 */
export const nodeColorFromType = (
  nodeType: NativeNodeInvariants.TypeEnum | null,
): string => {
  return (nodeType && nodeBackgroundColors[nodeType]) ?? HibiscusDark;
};

/**
 * Gets the main background color for a node. In case of native nodes, this is
 * derived from the `type`, in case of components this will be a static value
 * which is the default background color for components
 */
export const nodeBackgroundColor = ({
  kind,
  type,
}: {
  kind: Node.KindEnum;
  type: NativeNodeInvariants.TypeEnum | null;
}): string => {
  if (kind === Node.KindEnum.Component) {
    return nodeBackgroundColors.Component;
  }

  return nodeColorFromType(type);
};
