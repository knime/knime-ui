/**
 * Util functions for handling and manipulating NodePorts port selection
 */

import type { KnimeNode } from "@/api/custom-types";
import type {
  ComponentNode,
  MetaNodePort,
  NodePort,
} from "@/api/gateway-api/generated-api";

export type SelectedPortIdentifier =
  | `${"input" | "output"}-${number | "AddPort"}`
  | null;
type PortSide = "input" | "output";
export type SelectedPortContext = {
  side: PortSide;
  index: number;
  sidePorts: NodePort[] | MetaNodePort[];
  isAddPort: boolean;
};

export const getPortContext = (
  node: KnimeNode,
  port: NonNullable<SelectedPortIdentifier>,
): SelectedPortContext => {
  const portData = port.split("-");
  const side = portData[0] as "input" | "output";

  return {
    side,
    index: Number(portData[1]), // NaN in case of isAddPort
    sidePorts: side === "input" ? node.inPorts : node.outPorts,
    isAddPort: portData[1] === "AddPort",
  };
};

const canAddPort = (
  node: KnimeNode,
  isWorkflowWritable: boolean,
): { input: boolean; output: boolean } => {
  const isComponent = node.kind === "component";
  const isMetanode = node.kind === "metanode";
  const isLink = isComponent && (node as ComponentNode).link;
  const isExecuting = node.state?.executionState === "EXECUTING";

  const isEditable = isWorkflowWritable && !isLink && !isExecuting;
  if (!isEditable) {
    return { input: false, output: false };
  }

  if (isComponent || isMetanode) {
    return { input: true, output: true };
  }

  if ("portGroups" in node && node.portGroups) {
    const portGroups = Object.values(node.portGroups);
    return {
      input: portGroups.some((portGroup) => portGroup.canAddInPort),
      output: portGroups.some((portGroup) => portGroup.canAddOutPort),
    };
  }

  // Native node without port groups
  return { input: false, output: false };
};

const getFirstSelectedSidePort = (
  node: KnimeNode,
  side: PortSide,
  isWorkflowWritable: boolean,
): SelectedPortIdentifier => {
  const minIndex = node.kind === "metanode" ? 0 : 1;
  const sidePorts = side === "input" ? node.inPorts : node.outPorts;

  if (sidePorts[minIndex]) {
    return `${side}-${minIndex}`;
  }

  if (canAddPort(node, isWorkflowWritable)[side]) {
    return `${side}-AddPort`;
  }

  return null;
};

const getInitialSelectedPort = (
  node: KnimeNode,
  isWorkflowWritable: boolean,
): SelectedPortIdentifier => {
  return (
    getFirstSelectedSidePort(node, "output", isWorkflowWritable) ||
    getFirstSelectedSidePort(node, "input", isWorkflowWritable)
  );
};

export const getNextSelectedPort = (
  node: KnimeNode,
  selectedPort: SelectedPortIdentifier,
  isWorkflowWritable: boolean,
): SelectedPortIdentifier => {
  if (!selectedPort) {
    return getInitialSelectedPort(node, isWorkflowWritable);
  }

  const current = getPortContext(node, selectedPort);

  if (current.sidePorts[current.index + 1]) {
    return `${current.side}-${current.index + 1}`;
  }

  if (
    current.index === current.sidePorts.length - 1 &&
    canAddPort(node, isWorkflowWritable)[current.side]
  ) {
    return `${current.side}-AddPort`;
  }

  const otherSide = current.side === "input" ? "output" : "input";
  return (
    getFirstSelectedSidePort(node, otherSide, isWorkflowWritable) ||
    getFirstSelectedSidePort(node, current.side, isWorkflowWritable)
  );
};
