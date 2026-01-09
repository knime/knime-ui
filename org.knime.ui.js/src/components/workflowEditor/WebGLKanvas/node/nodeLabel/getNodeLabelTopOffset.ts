import { workflowDomain } from "@/lib/workflow-domain";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { portSize } from "@/style/shapes";

/**
 * max port number that can be displayed correctly
 * without offsetting the node label
 */
const maxPortsWithoutOffset = {
  node: 5,
  metanode: 2,
};

export const getNodeLabelTopOffset = (nodeId: string) => {
  const { getNodeById } = useNodeInteractionsStore();

  const node = getNodeById(nodeId);

  if (!node) {
    return 0;
  }

  const maxPortCount = Math.max(node.inPorts.length, node.outPorts.length);

  const nodePortsWithoutOffset = workflowDomain.node.isMetaNode(node)
    ? maxPortsWithoutOffset.metanode
    : maxPortsWithoutOffset.node;

  return Math.max(maxPortCount - nodePortsWithoutOffset, 0) * portSize;
};
