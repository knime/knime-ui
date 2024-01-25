import type { KnimeNode } from "@/api/custom-types";
import {
  MetaNodePort,
  Node,
  type MetaNode,
  type ComponentNode,
} from "@/api/gateway-api/generated-api";

export const isNodeMetaNode = (node: KnimeNode): node is MetaNode =>
  node.kind === Node.KindEnum.Metanode;

export const isNodeComponent = (node: KnimeNode): node is ComponentNode =>
  node.kind === Node.KindEnum.Component;

/**
 * Return the node execution state
 */
export const canExecute = (node: KnimeNode, portIndex: number) => {
  return isNodeMetaNode(node)
    ? node.outPorts[portIndex].nodeState ===
        MetaNodePort.NodeStateEnum.CONFIGURED
    : node.allowedActions.canExecute;
};

/**
 * metanodes have no configured state, so they use the state of the selected output port
 */
export const getNodeState = (node: KnimeNode, portIndex: number) => {
  return isNodeMetaNode(node)
    ? node.outPorts[portIndex].nodeState
    : node.state?.executionState;
};
