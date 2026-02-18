import type { KnimeNode } from "@/api/custom-types";
import type { Connection } from "@/api/gateway-api/generated-api";

import { createNativeNode } from "./nodes";
import { createPort } from "./ports";
import { arrayToDictionary } from "./util";

// eslint-disable-next-line func-style
function* generator(): Iterator<number> {
  let id = -1;
  while (true) {
    id++;
    yield id;
  }
}

const idGen = generator();
const getSequentialId = () => idGen.next().value.toString();

export const createConnection = (
  data: Partial<Connection> = {},
): Connection => {
  const { id, ...rest } = data;

  return {
    id: id ?? `root:2_1_${getSequentialId()}`,
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
  sourcePort: number,
  destPort: number,
  connectionData?: Omit<
    Connection,
    "id" | "sourceNode" | "sourcePort" | "destNode" | "destPort"
  >,
  // eslint-disable-next-line max-params
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
    id: `${destNode.id}_${destPort}`,
    sourceNode: sourceNode.id,
    sourcePort,
    destNode: destNode.id,
    destPort,
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

  for (const [_, nodeConnection] of nodeConnections.entries()) {
    const { nodes, ports } = nodeConnection;
    const [sourceNode, destNode] = nodes;
    const [sourcePort, destPort] = ports;

    if (sourceNode.outPorts.at(sourcePort) && destNode.inPorts.at(destPort)) {
      const connection = createConnection({
        id: `${destNode.id}_${destPort}`,
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
