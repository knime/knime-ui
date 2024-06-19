/**
 * Util functions for handling and manipulating NodePorts port selection
 */

import type { KnimeNode } from "@/api/custom-types";
import type {
  NodePort,
  MetaNodePort,
  ComponentNode,
} from "@/api/gateway-api/generated-api";
import type { RootStoreState } from "@/store/types";
import type { Store } from "vuex";

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
  store: Store<RootStoreState>,
  node: KnimeNode,
): { input: boolean; output: boolean } => {
  const isComponent = node.kind === "component";
  const isMetanode = node.kind === "metanode";
  const isWritable = store.getters["workflow/isWritable"];
  const isLink = isComponent && (node as ComponentNode).link;
  const isExecuting = node.state?.executionState === "EXECUTING";

  const isEditable = isWritable && !isLink && !isExecuting;
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
  store: Store<RootStoreState>,
  node: KnimeNode,
  side: PortSide,
): SelectedPortIdentifier => {
  const minIndex = node.kind === "metanode" ? 0 : 1;
  const sidePorts = side === "input" ? node.inPorts : node.outPorts;

  if (sidePorts[minIndex]) {
    return `${side}-${minIndex}`;
  }

  if (canAddPort(store, node)[side]) {
    return `${side}-AddPort`;
  }

  return null;
};

const getInitialSelectedPort = (
  store: Store<RootStoreState>,
  node: KnimeNode,
): SelectedPortIdentifier => {
  return (
    getFirstSelectedSidePort(store, node, "output") ||
    getFirstSelectedSidePort(store, node, "input")
  );
};

export const getNextSelectedPort = (
  store: Store<RootStoreState>,
  node: KnimeNode,
  selectedPort: SelectedPortIdentifier,
): SelectedPortIdentifier => {
  if (!selectedPort) {
    return getInitialSelectedPort(store, node);
  }

  const current = getPortContext(node, selectedPort);

  if (current.sidePorts[current.index + 1]) {
    return `${current.side}-${current.index + 1}`;
  }

  if (
    current.index === current.sidePorts.length - 1 &&
    canAddPort(store, node)[current.side]
  ) {
    return `${current.side}-AddPort`;
  }

  const otherSide = current.side === "input" ? "output" : "input";
  return (
    getFirstSelectedSidePort(store, node, otherSide) ||
    getFirstSelectedSidePort(store, node, current.side)
  );
};
