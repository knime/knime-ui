import { describe, expect, it } from "vitest";

import * as $shapes from "@/style/shapes";
import { createNativeNode, createWorkflowAnnotation } from "@/test/factories";
import { geometry } from "@/util/geometry";

describe("Workflow-Objects Bounds", () => {
  const {
    nodeSize,
    nodeStatusMarginTop,
    nodeStatusHeight,
    nodeNameMargin,
    nodeNameLineHeight,
  } = $shapes;

  it("calculates dimensions of empty workflow", () => {
    expect(
      geometry.getWorkflowObjectBounds(
        {
          nodes: {},
          workflowAnnotations: [],
        },
        { padding: true },
      ),
    ).toStrictEqual({
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      height: 0,
      width: 0,
    });
  });

  it("calculates dimensions of workflow containing one node away from the top left corner", () => {
    expect(
      geometry.getWorkflowObjectBounds(
        {
          nodes: {
            "root:0": createNativeNode({ position: { x: 200, y: 200 } }),
          },
          workflowAnnotations: [],
        },
        { padding: true },
      ),
    ).toStrictEqual({
      left: 150,
      right: 250 + nodeSize,
      top: 200 - nodeNameMargin - nodeNameLineHeight,
      bottom: 200 + nodeSize + nodeStatusMarginTop + nodeStatusHeight,
      height: 73,
      width: 132,
    });
  });

  it("calculates dimensions of workflow containing annotations only", () => {
    expect(
      geometry.getWorkflowObjectBounds(
        {
          nodes: {},
          workflowAnnotations: [
            createWorkflowAnnotation({
              id: "root:1",
              bounds: { x: -10, y: -10, width: 20, height: 20 },
            }),
            createWorkflowAnnotation({
              id: "root:2",
              bounds: { x: 0, y: 0, width: 20, height: 20 },
            }),
            createWorkflowAnnotation({
              id: "root:3",
              bounds: { x: -5, y: -5, width: 20, height: 20 },
            }),
          ],
        },
        {
          padding: true,
        },
      ),
    ).toStrictEqual({
      left: -10,
      right: 20,
      top: -10,
      bottom: 20,
      height: 30,
      width: 30,
    });
  });

  it("calculates dimensions of workflow containing overlapping node + annotation", () => {
    expect(
      geometry.getWorkflowObjectBounds(
        {
          nodes: { "root:0": createNativeNode({ position: { x: 10, y: 10 } }) },
          workflowAnnotations: [
            createWorkflowAnnotation({
              id: "root:1",
              bounds: { x: 26, y: 26, width: 26, height: 26 },
            }),
          ],
        },
        { padding: true },
      ),
    ).toStrictEqual({
      left: -40,
      right: 92,
      top: -11,
      bottom: 62,
      height: 73,
      width: 132,
    });
  });

  it("calculates dimensions of workflow containing multiple nodes %s", () => {
    expect(
      geometry.getWorkflowObjectBounds(
        {
          nodes: {
            "root:0": createNativeNode({ position: { x: 10, y: 10 } }),
            "root:1": createNativeNode({ position: { x: -10, y: -10 } }),
            "root:2": createNativeNode({ position: { x: 20, y: 20 } }),
          },
          workflowAnnotations: [],
        },
        {
          padding: true,
        },
      ),
    ).toStrictEqual({
      left: -60,
      right: 102,
      top: -31,
      bottom: 72,
      height: 103,
      width: 162,
    });
  });

  it("without padding:", () => {
    expect(
      geometry.getWorkflowObjectBounds(
        {
          nodes: {
            "root:0": createNativeNode({ position: { x: 10, y: 10 } }),
            "root:1": createNativeNode({ position: { x: -10, y: -10 } }),
            "root:2": createNativeNode({ position: { x: 20, y: 20 } }),
          },
          workflowAnnotations: [],
        },
        {
          padding: false,
        },
      ),
    ).toStrictEqual({
      left: -10,
      right: 52,
      top: -10,
      bottom: 52,
      height: 62,
      width: 62,
    });
  });
});
