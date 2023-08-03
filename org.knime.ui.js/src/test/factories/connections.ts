import type { KnimeNode } from "@/api/custom-types";
import type { Connection } from "@/api/gateway-api/generated-api";
import { getId } from "@/util/getUniqueId";

import { createNativeNode } from "./nodes";
import { createPort } from "./ports";
import { arrayToDictionary } from "./util";

export const createConnection = (
  data: Partial<Connection> = {},
): Connection => {
  const { id, ...rest } = data;

  return {
    id: id ?? `root:2_1_${getId()}`,
    sourceNode: "root:1",
    sourcePort: 1,
    destNode: "root:2",
    destPort: 1,
    allowedActions: { canDelete: true },

    ...rest,
  };
};

export const createConnectedNodes = (
  node1: KnimeNode | string = "root:1",
  node2: KnimeNode | string = "root:2",
  connectionData?: Pick<Connection, "allowedActions">,
) => {
  const sourceNode =
    typeof node1 === "string"
      ? createNativeNode({
          id: node1,
          outPorts: [
            createPort({
              index: 1,
              typeId: "org.knime.core.node.BufferedDataTable",
            }),
          ],
        })
      : node1;

  const destNode =
    typeof node2 === "string"
      ? createNativeNode({
          id: node2,
          inPorts: [
            createPort({
              index: 1,
              typeId: "org.knime.core.node.BufferedDataTable",
            }),
          ],
        })
      : node2;

  const connection = createConnection({
    id: `root:${sourceNode.id}_${destNode.id}`,
    sourceNode: sourceNode.id,
    sourcePort: 1,
    destNode: destNode.id,
    destPort: 1,
    ...connectionData,
  });

  return { connection, sourceNode, destNode };
};

type ConnectionPair = {
  nodes: [node1: KnimeNode, node2: KnimeNode];
  ports: [sourceIndex: number, destIndex: number];
};

export const connectMultipleNodes = (
  nodeConnections: Array<ConnectionPair>,
): Record<string, Connection> => {
  const connections: Connection[] = [];

  for (const [index, nodeConnection] of nodeConnections.entries()) {
    const { nodes, ports } = nodeConnection;
    const [sourceNode, destNode] = nodes;
    const [sourcePort, destPort] = ports;

    if (sourceNode.outPorts.at(sourcePort) && destNode.inPorts.at(destPort)) {
      const connection = createConnection({
        id: `root:${sourceNode.id}_${destNode.id}_${index}`,
        sourceNode: sourceNode.id,
        sourcePort,
        destNode: destNode.id,
        destPort,
      });

      connections.push(connection);
    }
  }

  return arrayToDictionary(connections, "id");
};
