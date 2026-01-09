import type { KnimeNode } from "@/api/custom-types";
import {
  type ComponentNode,
  type MetaNode,
  MetaNodePort,
  type NativeNode,
  Node,
  NodeState,
} from "@/api/gateway-api/generated-api";

const isNative = (node: KnimeNode): node is NativeNode =>
  node.kind === Node.KindEnum.Node;

const isMetaNode = (node: KnimeNode): node is MetaNode =>
  node.kind === Node.KindEnum.Metanode;

// TODO: NXT-2023 - remove union with name property
const isComponent = (
  node: KnimeNode,
): node is ComponentNode & { name: string } =>
  node.kind === Node.KindEnum.Component;

/**
 * Return the node execution state
 */
const canExecute = (node: KnimeNode, portIndex: number) => {
  return isMetaNode(node)
    ? node.outPorts[portIndex]?.nodeState ===
        MetaNodePort.NodeStateEnum.CONFIGURED
    : Boolean(node.allowedActions?.canExecute);
};

/**
 * metanodes have no configured state, so they use the state of the selected output port
 */
const getExecutionState = (node: KnimeNode, portIndex: number) => {
  return isMetaNode(node)
    ? node.outPorts[portIndex]?.nodeState
    : node.state?.executionState;
};

const isExecuting = (node: KnimeNode) => {
  return (
    node.state?.executionState === NodeState.ExecutionStateEnum.EXECUTING ||
    node.state?.executionState === NodeState.ExecutionStateEnum.QUEUED
  );
};

export const node = {
  isNative,
  isMetaNode,
  isComponent,
  canExecute,
  getExecutionState,
  isExecuting,
};
