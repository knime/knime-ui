import { expect, describe, it } from "vitest";
import { mockVuexStore, type DeepPartial } from "@/test/utils";

import {
  defaultMetaNodeBarHeight,
  defaultMetanodeBarPosition,
  horizontalNodePadding,
  metaNodeBarWidth,
  nodeSize,
  portSize,
} from "@/style/shapes.mjs";

import * as canvasStoreConfig from "@/store/canvas";
import type { Bounds, MetaPorts, XY } from "@/api/gateway-api/generated-api";

describe("workflow store", () => {
  const loadStore = async () => {
    const store = mockVuexStore({
      workflow: await import("@/store/workflow"),
      canvas: canvasStoreConfig,
    });

    return { store };
  };

  const node = { id: "root:1", position: { x: 50, y: 21 } };

  describe("metanode content workflows", () => {
    const baseWorkflow = {
      projectId: "foo",
      info: {
        containerType: "metanode",
      },
      metaInPorts: {
        ports: [],
      },
      metaOutPorts: {
        ports: [],
      },
    };

    type FixtureType = Record<
      string,
      {
        additionalProps: {
          metaInPorts?: DeepPartial<MetaPorts>;
          metaOutPorts?: DeepPartial<MetaPorts>;
          workflowAnnotations?: { bounds: Bounds }[];
        };
        nodes: Record<string, { id: string; position: XY }>;
        expected: {
          workflowBounds: {
            left?: number;
            right?: number;
            top?: number;
            bottom?: number;
            height?: number;
          };
        };
      }
    >;

    const fixtures: FixtureType = {
      "without any ports nor nodes": {
        additionalProps: {},
        nodes: {},
        expected: {
          workflowBounds: { left: 0, right: 0, top: 0, bottom: 0 },
        },
      },
      "with ports but no nodes": {
        additionalProps: {
          metaInPorts: {
            ports: [{}],
          },
          metaOutPorts: {
            ports: [{}],
          },
        },
        nodes: {},
        expected: {
          workflowBounds: { left: 0, right: 0, top: 0, bottom: 0 },
        },
      },
      "with input ports only": {
        nodes: { [node.id]: node },
        additionalProps: {
          metaInPorts: {
            ports: [{}],
          },
        },
        expected: {
          workflowBounds: {
            left: -metaNodeBarWidth,
            right: node.position.x + horizontalNodePadding + nodeSize,
            top: 0,
            bottom: defaultMetaNodeBarHeight,
          },
        },
      },
      "with output ports only": {
        nodes: { [node.id]: node },
        additionalProps: {
          metaOutPorts: {
            ports: [{}],
          },
        },
        expected: {
          workflowBounds: {
            left: 0,
            right: defaultMetanodeBarPosition + metaNodeBarWidth,
            top: 0,
            bottom: defaultMetaNodeBarHeight,
          },
        },
      },
      "with ports only": {
        nodes: { [node.id]: node },
        additionalProps: {
          metaOutPorts: {
            ports: [{}],
          },
          metaInPorts: {
            ports: [{}],
          },
        },
        expected: {
          workflowBounds: {
            left: -metaNodeBarWidth,
            right: defaultMetanodeBarPosition + metaNodeBarWidth,
            top: 0,
            bottom: defaultMetaNodeBarHeight,
          },
        },
      },
      "with fixed input ports only (bound X set)": {
        nodes: { [node.id]: node },
        additionalProps: {
          metaInPorts: {
            bounds: { x: 123 },
            ports: [{}],
          },
        },
        expected: {
          workflowBounds: {
            left: 0,
            right: 123 + portSize,
            top: 0,
            bottom: defaultMetaNodeBarHeight,
          },
        },
      },
      "with fixed input ports only (bound Y set)": {
        nodes: { [node.id]: node },
        additionalProps: {
          metaInPorts: {
            bounds: { y: 123 },
            ports: [{}],
          },
        },
        expected: {
          workflowBounds: {
            top: 0,
            bottom: defaultMetaNodeBarHeight + 123,
          },
        },
      },
      "with fixed input ports only (bound height set)": {
        nodes: { [node.id]: node },
        additionalProps: {
          metaInPorts: {
            bounds: { height: 1230 },
            ports: [{}],
          },
        },
        expected: {
          workflowBounds: {
            top: 0,
            height: 1230,
            bottom: 1230,
          },
        },
      },

      "with fixed output ports only (bound X set)": {
        nodes: { [node.id]: node },
        additionalProps: {
          metaOutPorts: {
            bounds: { x: 123 },
            ports: [{}],
          },
        },
        expected: {
          workflowBounds: {
            left: 0,
            right: 123 + metaNodeBarWidth,
            top: 0,
            bottom: defaultMetaNodeBarHeight,
          },
        },
      },
      "with fixed output ports only (bound Y set)": {
        nodes: { [node.id]: node },
        additionalProps: {
          metaOutPorts: {
            bounds: { y: 123 },
            ports: [{}],
          },
        },
        expected: {
          workflowBounds: {
            top: 0,
            bottom: defaultMetaNodeBarHeight + 123,
          },
        },
      },
      "with fixed output ports only (bound height set)": {
        nodes: { [node.id]: node },
        additionalProps: {
          metaOutPorts: {
            bounds: { height: 1230 },
            ports: [{}],
          },
        },
        expected: {
          workflowBounds: {
            top: 0,
            height: 1230,
            bottom: 1230,
          },
        },
      },
      "with fixed ports only": {
        nodes: { [node.id]: node },
        additionalProps: {
          metaOutPorts: {
            bounds: { x: 400 },
            ports: [{}],
          },
          metaInPorts: {
            bounds: { x: 200 },
            ports: [{}],
          },
        },
        expected: {
          workflowBounds: {
            left: 0,
            right: 400 + metaNodeBarWidth,
            top: 0,
            bottom: defaultMetaNodeBarHeight,
          },
        },
      },
      "with content and ports": {
        nodes: { [node.id]: node },
        additionalProps: {
          metaInPorts: {
            bounds: { x: -100 },
            ports: [{}],
          },
          metaOutPorts: {
            ports: [{}],
          },
          workflowAnnotations: [
            {
              bounds: {
                x: 300,
                width: 1000,
                y: 200,
                height: 1000,
              },
            },
          ],
        },
        expected: {
          workflowBounds: {
            bottom: 1200,
            left: -109,
            right: 1300,
            top: 0,
          },
        },
      },
      "with content with negative coordinates and ports": {
        nodes: { [node.id]: node },
        additionalProps: {
          metaInPorts: {
            ports: [{}],
          },
          metaOutPorts: {
            bounds: { x: 500 },
            ports: [{}],
          },
          workflowAnnotations: [
            {
              bounds: {
                x: -300,
                width: 1000,
                y: -200,
                height: 1000,
              },
            },
          ],
        },
        expected: {
          workflowBounds: {
            left: -290 - metaNodeBarWidth,
            right: 1000 - 300,
            top: -200,
            bottom: 1000 - 200,
          },
        },
      },
      "with port bars in reverse order": {
        nodes: { [node.id]: node },
        additionalProps: {
          metaInPorts: {
            bounds: { x: 100 },
            ports: [{}],
          },
          metaOutPorts: {
            bounds: { x: 100 },
            ports: [{}],
          },
        },
        expected: {
          workflowBounds: {
            left: 0,
            right: 100 + nodeSize,
            top: 0,
            bottom: 500,
          },
        },
      },
    };

    it.each(Object.entries(fixtures))(
      "calculates dimensions %s",
      async (title, { additionalProps, nodes, expected }) => {
        const { store } = await loadStore();
        const workflow = {
          ...baseWorkflow,
          nodes,
        };
        store.commit("workflow/setActiveWorkflow", {
          ...workflow,
          ...additionalProps,
        });

        expect(store.getters["workflow/workflowBounds"]).toEqual(
          expect.objectContaining(expected.workflowBounds),
        );
      },
    );
  });
});
