import { describe, expect, it } from "vitest";

import type { Bounds, MetaPorts, XY } from "@/api/gateway-api/generated-api";
import {
  autoPositionMetanodeMargin,
  defaultMetaNodeBarHeight,
  defaultMetanodeBarPosition,
  metaNodeBarWidth,
  nodeSize,
  portSize,
} from "@/style/shapes";
import { type DeepPartial } from "@/test/utils";
import { geometry } from "@/util/geometry";

import { loadStore } from "./loadStore";

describe("workflow store", () => {
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
          workflowBounds: {
            left: -(autoPositionMetanodeMargin + portSize),
            right:
              defaultMetanodeBarPosition -
              autoPositionMetanodeMargin +
              metaNodeBarWidth,
            top: -autoPositionMetanodeMargin,
            bottom: defaultMetaNodeBarHeight - autoPositionMetanodeMargin,
          },
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
            left: -(autoPositionMetanodeMargin + portSize),
            right:
              defaultMetanodeBarPosition -
              autoPositionMetanodeMargin +
              metaNodeBarWidth,
            top: -autoPositionMetanodeMargin,
            bottom: defaultMetaNodeBarHeight - autoPositionMetanodeMargin,
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
            left: -(autoPositionMetanodeMargin + portSize),
            right:
              defaultMetanodeBarPosition -
              autoPositionMetanodeMargin +
              metaNodeBarWidth,
            top: -autoPositionMetanodeMargin,
            bottom: defaultMetaNodeBarHeight - autoPositionMetanodeMargin,
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
            left: -(autoPositionMetanodeMargin + portSize),
            right:
              defaultMetanodeBarPosition -
              autoPositionMetanodeMargin +
              metaNodeBarWidth,
            top: -autoPositionMetanodeMargin,
            bottom: defaultMetaNodeBarHeight - autoPositionMetanodeMargin,
          },
        },
      },
      "with bounds set (only input)": {
        nodes: { [node.id]: node },
        additionalProps: {
          metaInPorts: {
            bounds: { x: 123, y: 123, width: 10, height: 500 },
            ports: [{}],
          },
        },
        expected: {
          workflowBounds: {
            left: 0,
            right:
              defaultMetanodeBarPosition -
              autoPositionMetanodeMargin +
              metaNodeBarWidth,
            top: -autoPositionMetanodeMargin,
            bottom: 123 + defaultMetaNodeBarHeight,
          },
        },
      },

      "with bounds set (only output)": {
        nodes: { [node.id]: node },
        additionalProps: {
          metaInPorts: {
            bounds: { x: 123, y: 123, width: 10, height: 500 },
            ports: [{}],
          },
          metaOutPorts: {
            bounds: { x: 123, y: 123, width: 10, height: 500 },
            ports: [{}],
          },
        },
        expected: {
          workflowBounds: {
            left: 0,
            right: 133,
            top: 0,
            bottom: 123 + defaultMetaNodeBarHeight,
          },
        },
      },

      "with bounds set (input and output)": {
        nodes: { [node.id]: node },
        additionalProps: {
          metaOutPorts: {
            bounds: { x: 123, y: 123, width: 10, height: 500 },
            ports: [{}],
          },
          metaInPorts: {
            bounds: { x: -123, y: -123, width: 10, height: 500 },
            ports: [{}],
          },
        },
        expected: {
          workflowBounds: {
            left: -123 - portSize,
            right: 133,
            top: -123,
            bottom: 123 + defaultMetaNodeBarHeight,
          },
        },
      },
      "with content and ports": {
        nodes: { [node.id]: node },
        additionalProps: {
          metaInPorts: {
            bounds: { x: -100, y: 0, width: 100, height: 500 },
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
            right: 1360,
            top: -50,
          },
        },
      },
      "with port bars in reverse order": {
        nodes: { [node.id]: node },
        additionalProps: {
          metaInPorts: {
            bounds: { x: 100, y: 100, width: 10, height: 500 },
            ports: [{}],
          },
          metaOutPorts: {
            bounds: { x: -100, y: -100, width: 10, height: 200 },
            ports: [{}],
          },
        },
        expected: {
          workflowBounds: {
            top: -100,
            left: -100 - metaNodeBarWidth,
            right: 100 + nodeSize,
            bottom: 600,
          },
        },
      },
    };

    it.each(Object.entries(fixtures))(
      "calculates dimensions %s",
      (_, { additionalProps, nodes, expected }) => {
        const { workflowStore } = loadStore();
        const workflow = {
          ...baseWorkflow,
          nodes,
        };

        // @ts-ignore
        workflowStore.setActiveWorkflow({
          ...workflow,
          ...additionalProps,
        });

        workflowStore.setCalculatedMetanodePortBarBounds(
          geometry.calculateMetaNodePortBarBounds(
            workflowStore.activeWorkflow!,
          ),
        );

        expect(workflowStore.workflowBounds).toEqual(
          expect.objectContaining(expected.workflowBounds),
        );
      },
    );
  });
});
