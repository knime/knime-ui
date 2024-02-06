import { expect, describe, it, vi } from "vitest";
import type { AvailablePortTypes, KnimeNode } from "@/api/custom-types";
import { NodeState, PortType } from "@/api/gateway-api/generated-api";

import type { DeepPartial } from "@/test/utils";

import * as outputValidator from "../output-validator";

describe("output-validator", () => {
  const portTypes: AvailablePortTypes = {
    table: {
      kind: PortType.KindEnum.Table,
      name: "Data",
      views: {
        descriptors: [],
        descriptorMapping: {
          configured: [],
          executed: [],
        },
      },
    },
    flowVariable: {
      kind: PortType.KindEnum.FlowVariable,
      name: "Flow Variable",
      views: {
        descriptors: [],
        descriptorMapping: {
          configured: [],
          executed: [],
        },
      },
    },
  };

  const dummyNode: DeepPartial<KnimeNode> = {
    id: "node1",
    outPorts: [{ typeId: "flowVariable" }],
    state: {
      executionState: NodeState.ExecutionStateEnum.IDLE,
    },
    allowedActions: {
      canExecute: false,
    },
  };

  const runNodeValidationChecks = ({ params, validations }) => {
    const runMiddleware = outputValidator.buildMiddleware(...validations)(
      params,
    );

    return runMiddleware();
  };

  it("runs multiple middlewares", () => {
    const params = { mockParam: true };
    const middleware1 = vi.fn((ctx, next) => {
      next(ctx);
    });

    const middleware2 = vi.fn((ctx, next) => {
      next(ctx);
    });

    runNodeValidationChecks({
      params,
      validations: [middleware1, middleware2],
    });

    expect(middleware1).toHaveBeenCalledWith(params, expect.any(Function));
    expect(middleware2).toHaveBeenCalledWith(params, expect.any(Function));
  });

  it("validates that at least one node is selected", () => {
    const result = runNodeValidationChecks({
      params: {
        selectedNodes: [],
      },
      validations: [outputValidator.validateSelection],
    });

    expect(result).toEqual({
      error: {
        type: "NODE",
        code: "NO_NODE_SELECTED",
        message:
          "To show the node output, please select a configured or executed node.",
      },
    });
  });

  it("validates that no more than 1 node is selected", () => {
    const result = runNodeValidationChecks({
      params: {
        selectedNodes: [dummyNode, { ...dummyNode, id: "node2" }],
      },
      validations: [outputValidator.validateSelection],
    });

    expect(result).toEqual({
      error: {
        type: "NODE",
        code: "MULTIPLE_NODES_SELECTED",
        message: "To show the node output, please select only one node.",
      },
    });
  });

  it("validates that the selected node has output ports", () => {
    const result = runNodeValidationChecks({
      params: {
        selectedNode: { ...dummyNode, outPorts: [] },
        portTypes,
      },
      validations: [outputValidator.validateOutputPorts],
    });

    expect(result).toEqual({
      error: {
        type: "NODE",
        code: "NO_OUTPUT_PORTS",
        message: "The selected node has no output ports.",
      },
    });
  });

  it("validates that the selected node has supported ports", () => {
    const result = runNodeValidationChecks({
      params: {
        selectedNode: {
          ...dummyNode,
          outPorts: [{ typeId: "something-unsopported" }],
        },
        portTypes,
      },
      validations: [outputValidator.validateOutputPorts],
    });

    expect(result).toEqual({
      error: {
        type: "NODE",
        code: "NO_SUPPORTED_PORTS",
        message: "The selected node has no supported output port.",
      },
    });
  });

  it("validates that the selected node has at least 1 supported output port", () => {
    const result = runNodeValidationChecks({
      params: {
        selectedNodes: [
          {
            ...dummyNode,
            outPorts: [
              { typeId: "flowVariable" },
              { typeId: "table" },
              { typeId: "something-unsopported" },
            ],
          },
        ],
        portTypes,
      },
      validations: [outputValidator.validateOutputPorts],
    });

    expect(result.error).toBeUndefined();
  });

  it("validates that the node is configured", () => {
    const selectedNode = {
      ...dummyNode,
      state: { executionState: "IDLE" },
      outPorts: [{ typeId: "flowVariable" }, { typeId: "table" }],
    };

    const result = runNodeValidationChecks({
      params: {
        selectedNode,
        selectedPort: selectedNode.outPorts[1],
        portTypes,
      },
      validations: [outputValidator.validateNodeConfigurationState],
    });

    expect(result).toEqual({
      error: {
        type: "NODE",
        code: "NODE_UNCONFIGURED",
        message: "Please first configure the selected node.",
      },
    });
  });

  it("validates that metanodes port is configured", () => {
    const selectedNode = {
      ...dummyNode,
      state: { executionState: "EXECUTED" },
      kind: "metanode",
      outPorts: [
        { typeId: "flowVariable", index: 0, nodeState: "EXECUTED" },
        { typeId: "table", index: 1, nodeState: "IDLE" },
      ],
    };

    const result = runNodeValidationChecks({
      params: {
        selectedNode,
        selectedPortIndex: 1,
        portTypes,
      },
      validations: [outputValidator.validateNodeConfigurationState],
    });

    expect(result).toEqual({
      error: {
        type: "NODE",
        code: "NODE_UNCONFIGURED",
        message: "Please first configure the selected node.",
      },
    });
  });

  it("validates that flow variables can be displayed even when the node is not configured", () => {
    const selectedNode = {
      ...dummyNode,
      state: { executionState: "IDLE" },
      outPorts: [{ typeId: "flowVariable" }, { typeId: "table" }],
    };

    const result = runNodeValidationChecks({
      params: {
        selectedNode,
        selectedPort: selectedNode.outPorts[0],
        portTypes,
      },
      validations: [outputValidator.validateNodeConfigurationState],
    });

    expect(result.error).toBeUndefined();
  });

  it("validates that a port is selected", () => {
    const result = runNodeValidationChecks({
      params: {
        selectedNode: dummyNode,
        selectedPortIndex: 3, // non-existent index
      },
      validations: [outputValidator.validatePortSelection],
    });

    expect(result).toEqual({
      error: {
        type: "PORT",
        code: "NO_PORT_SELECTED",
        message: "No port selected",
      },
    });
  });

  it("validates that the selected port is supported", () => {
    const result = runNodeValidationChecks({
      params: {
        selectedNode: {
          ...dummyNode,
          outPorts: [{ typeId: "something-unsupported" }],
        },
        portTypes,
        selectedPort: { typeId: "something-unsupported" },
      },
      validations: [outputValidator.validatePortSupport],
    });

    expect(result).toEqual({
      error: {
        type: "PORT",
        code: "NO_SUPPORTED_VIEW",
        message:
          "The data at the output port is not supported by any modern viewer.",
      },
    });
  });

  it("validates that the selected port is active", () => {
    const result = runNodeValidationChecks({
      params: {
        selectedPort: { typeId: "table", inactive: true },
        portTypes,
      },
      validations: [outputValidator.validatePortSupport],
    });

    expect(result).toEqual({
      error: {
        type: "PORT",
        code: "PORT_INACTIVE",
        message:
          "This output port is inactive and therefore no output data is available for display.",
      },
    });
  });

  it.each([["EXECUTING"], ["QUEUED"]])(
    "validates that port cannot be shown if node is in the %s state",
    (executionState) => {
      const selectedNode = {
        ...dummyNode,
        state: { executionState },
        outPorts: [{ typeId: "flowVariable" }, { typeId: "table" }],
      };

      const result = runNodeValidationChecks({
        params: {
          selectedNode,
          portTypes,
          selectedPortIndex: 1,
          selectedPort: selectedNode.outPorts[1],
        },
        validations: [outputValidator.validateNodeExecutionState],
      });

      expect(result).toEqual({
        error: {
          type: "NODE",
          code: "NODE_BUSY",
          message: "Output is available after execution.",
        },
      });
    },
  );
});
