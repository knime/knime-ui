/* eslint-disable valid-jsdoc */
/* eslint-disable func-style */

import type { AvailablePortTypes, KnimeNode } from "@/api/custom-types";
import type { NodePort, MetaNodePort } from "@/api/gateway-api/generated-api";

/**
 * Returns the PortType of a given port
 */
const getPortType = ({
  portTypes,
  port,
}: {
  portTypes: AvailablePortTypes;
  port: NodePort;
}) => portTypes[port.typeId];

const isFlowVariablePort = ({
  portTypes,
  port,
}: {
  portTypes: AvailablePortTypes;
  port: NodePort;
}) => {
  if (!port) {
    return false;
  }
  const { kind } = getPortType({ portTypes, port });
  return kind === "flowVariable";
};

/**
 * Determines whether a given port is "supported". Supported ports are only those whose PortType has a view
 * To determine the PortType, the dictionary of all available PortTypes is needed
 */
const canDisplayPortView = ({
  portTypes,
  port,
}: {
  portTypes: AvailablePortTypes;
  port: NodePort;
}) => {
  try {
    const { views } = getPortType({ portTypes, port });
    return Boolean(views) || isFlowVariablePort({ portTypes, port });
  } catch {
    return false;
  }
};

// ========================== Validation Functions ============================     //
//   The validation functions act as part of a middleware pipe. Each function       //
//   executes a specific validation by looking at the `environment` parameter       //
//   in order to determine the result. Each function can return early               //
//   by creating an error result, or they can call the `next` function so that      //
//   the next function in the validation pipeline can execute. Each validation      //
//   function must call `next`, either with a modified `context` or with the same   //
//   one, so that the following checks in the pipeline can use that context         //
//   in order to perform their logic. Early returns will cancel the middleware      //
// ========================== Validation Functions ============================     //

type ErrorCodes =
  | "NO_NODE_SELECTED"
  | "MULTIPLE_NODES_SELECTED"
  | "NO_OUTPUT_PORTS"
  | "NO_SUPPORTED_PORTS"
  | "NO_PORT_SELECTED"
  | "NO_SUPPORTED_VIEW"
  | "PORT_INACTIVE"
  | "NO_DATA"
  | "NODE_UNCONFIGURED"
  | "NODE_BUSY"
  | "NODE_UNEXECUTED";

export type ValidationResult = {
  error?: {
    type: "NODE" | "PORT";
    code: ErrorCodes;
    message: string;
  };
};

type NextFn<T = any> = (context: T & Record<string, any>) => ValidationResult;
export type ValidationFn<T = any> = (
  context: T,
  next: NextFn<T>,
) => ValidationResult;

/**
 * Validation middleware function. Asserts that:
 * - The selection contains a single node
 *
 * Adds the `selectedNode` to the context
 */
export const validateSelection: ValidationFn<{
  selectedNodes: Array<KnimeNode>;
}> = (context, next) => {
  const { selectedNodes } = context;
  if (!selectedNodes) {
    return next(context);
  }

  if (selectedNodes.length === 0) {
    return {
      error: {
        type: "NODE",
        code: "NO_NODE_SELECTED",
        message:
          "To show the node output, please select a configured or executed node.",
      },
    };
  }

  if (selectedNodes.length > 1) {
    return {
      error: {
        type: "NODE",
        code: "MULTIPLE_NODES_SELECTED",
        message: "To show the node output, please select only one node.",
      },
    };
  }

  const selectedNode = selectedNodes[0];
  return next({ ...context, selectedNode });
};

/**
 * Validation middleware function. Asserts that:
 * - The selected node has output ports
 * - The selected node has at least one supported port
 */
export const validateOutputPorts: ValidationFn<{
  selectedNode: KnimeNode;
  portTypes: AvailablePortTypes;
}> = (context, next) => {
  const { selectedNode, portTypes } = context;
  if (!selectedNode || !portTypes) {
    return next(context);
  }

  const hasOutputPorts = selectedNode.outPorts.length > 0;
  if (!hasOutputPorts) {
    return {
      error: {
        type: "NODE",
        code: "NO_OUTPUT_PORTS",
        message: "The selected node has no output ports.",
      },
    };
  }

  if (
    !selectedNode.outPorts.some((port) =>
      canDisplayPortView({ portTypes, port }),
    )
  ) {
    return {
      error: {
        type: "NODE",
        code: "NO_SUPPORTED_PORTS",
        message: "The selected node has no supported output port.",
      },
    };
  }

  return next(context);
};

/**
 * Validation middleware function. Asserts that:
 * - A port is selected
 */
export const validatePortSelection: ValidationFn<{
  selectedNode: KnimeNode;
  selectedPortIndex: number;
}> = (context, next) => {
  const { selectedNode, selectedPortIndex } = context;

  if (!selectedNode) {
    return next(context);
  }

  const selectedPort = selectedNode.outPorts[selectedPortIndex];
  if (
    !selectedPort ||
    // eslint-disable-next-line no-undefined
    selectedPortIndex === undefined ||
    selectedPortIndex === null
  ) {
    return {
      error: {
        type: "PORT",
        code: "NO_PORT_SELECTED",
        message: "No port selected",
      },
    };
  }

  return next({ ...context, selectedPort });
};

/**
 * Validation middleware function. Asserts that:
 * - The selected port has a supported viewer
 * - The selected port is not inactive
 */
export const validatePortSupport: ValidationFn<{
  selectedPort: NodePort;
  portTypes: AvailablePortTypes;
}> = (context, next) => {
  const { selectedPort, portTypes } = context;
  if (!selectedPort || !portTypes) {
    return next(context);
  }

  if (selectedPort.inactive) {
    return {
      error: {
        type: "PORT",
        code: "PORT_INACTIVE",
        message:
          "This output port is inactive and therefore no output data is available for display.",
      },
    };
  }

  if (!canDisplayPortView({ portTypes, port: selectedPort })) {
    return {
      error: {
        type: "PORT",
        code: "NO_SUPPORTED_VIEW",
        message:
          "The data at the output port is not supported by any modern viewer.",
      },
    };
  }

  if (
    // eslint-disable-next-line no-undefined
    selectedPort.portContentVersion === undefined
  ) {
    return {
      error: {
        type: "PORT",
        code: "NO_DATA",
        message: "This output port has no data to display",
      },
    };
  }

  return next(context);
};

/**
 * Validation middleware function. Asserts that:
 * - The selected node is configured when displaying view of non-flowVariable ports
 */
export const validateNodeConfigurationState: ValidationFn<{
  selectedNode: KnimeNode;
  selectedPort: NodePort;
  selectedPortIndex: number;
  portTypes: AvailablePortTypes;
}> = (context, next) => {
  const { selectedNode, selectedPort, portTypes, selectedPortIndex } = context;
  if (!selectedNode) {
    return next(context);
  }

  const validate = (
    isNodeIdle: boolean,
    _selectedPort: NodePort,
  ): ValidationResult => {
    if (isNodeIdle && !isFlowVariablePort({ portTypes, port: _selectedPort })) {
      return {
        error: {
          type: "NODE",
          code: "NODE_UNCONFIGURED",
          message: "Please first configure the selected node.",
        },
      };
    }

    return next(context);
  };

  if (selectedNode.kind === "metanode") {
    const selectedPort = selectedNode.outPorts[
      selectedPortIndex
    ] as MetaNodePort;
    const isNodePortIdle = selectedPort.nodeState === "IDLE";

    return validate(isNodePortIdle, selectedPort);
  }

  const isNodeIdle = selectedNode.state?.executionState === "IDLE";

  return validate(isNodeIdle, selectedPort);
};

/**
 * Validation middleware function. Asserts that:
 * - The selected node is not in a busy state (QUEUE || EXECUTING)
 */
export const validateNodeNotBusy: ValidationFn<{
  selectedNode: KnimeNode;
  selectedPort: NodePort;
  portTypes: AvailablePortTypes;
  selectedPortIndex: number;
}> = (context, next) => {
  const { selectedPort, selectedNode, portTypes } = context;

  if (isFlowVariablePort({ portTypes, port: selectedPort })) {
    return next(context);
  }

  const state = selectedNode.state?.executionState;
  if (state === "QUEUED" || state === "EXECUTING") {
    return {
      error: {
        type: "NODE",
        code: "NODE_BUSY",
        message: "Output is available after execution.",
      },
    };
  }

  return next(context);
};

/**
 * Validation middleware function. Asserts that:
 * - The selected node is EXECUTED
 */
export const validateNodeExecuted: ValidationFn<{
  selectedNode: KnimeNode;
  selectedPort: NodePort;
  portTypes: AvailablePortTypes;
  selectedPortIndex: number;
}> = (context, next) => {
  const { selectedPort, selectedNode, portTypes } = context;

  if (isFlowVariablePort({ portTypes, port: selectedPort })) {
    return next(context);
  }

  const state = selectedNode.state?.executionState;
  if (state !== "EXECUTED") {
    return {
      error: {
        type: "NODE",
        code: "NODE_UNEXECUTED",
        message: "Please execute the node.",
      },
    };
  }

  return next(context);
};

type MiddlewareFn<TEnv, TCxt> = (
  environment: TEnv,
  next: NextFn<TCxt>,
) => (context: TCxt) => ReturnType<ValidationFn<TCxt>>;

type MiddlewareMappingFn<TEnv, TCxt> = (
  fn: ValidationFn<TCxt>,
) => MiddlewareFn<TEnv, TCxt>;

type MiddlewarePipe = () => ValidationResult | null;

/**
 * Builds a middleware pipeline. Receives as parameters:
 * - An array of middleware functions
 * - An `context` object, which contains properties
 *  over which the different validations will be run.
 *
 * Returns a function to start the pipeline. This function will return
 * the context's value after all the validation middlewares
 * have executed, or it will return a different value if any function performed an early exit
 */
export const buildMiddleware =
  <TEnv, TCxt>(...middlewares: Array<ValidationFn>) =>
  (env: TEnv): MiddlewarePipe => {
    // convert a simple function into a middleware function
    // by partially applying environment and next before calling the given function along with the context
    const toMiddlewareFn: MiddlewareMappingFn<TEnv, TCxt> =
      (fn) => (environment, next) => (context) =>
        fn({ ...environment, ...context }, next);

    const runFinal = (context?: any) => context;

    const runChain = middlewares
      .map(toMiddlewareFn)
      .reduceRight((next, middleware) => middleware(env, next), runFinal);

    return runChain;
  };
