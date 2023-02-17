/* eslint-disable valid-jsdoc */
/* eslint-disable func-style */

/**
 * Returns the PortType of a given port
 * @param {Object} payload
 * @param {Object} payload.portTypes a dictionary of PortType objects
 * @param {Object} payload.port a Port object
 * @returns {String}
 */
const getPortType = ({ portTypes, port }) => portTypes[port.typeId];

/**
 * Determines whether a given port is "supported". Supported ports are only those whose PortType has a view
 * To determine the PortType, the dictionary of all available PortTypes is needed
 * @param {Object} payload
 * @param {Object} payload.portTypes a dictionary of PortType objects
 * @param {Object} payload.port a Port object
 * @returns {Boolean}
 */
const supportsPort = ({ portTypes, port }) => {
    try {
        const { hasView } = getPortType({ portTypes, port });
        return hasView;
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

/**
 * Validation middleware function. Asserts that:
 * - Nodes are not being dragged
 */
export const validateDragging = (context, next) => {
    if (context.isDragging) {
        return {
            error: {
                type: 'NODE',
                code: 'NODE_DRAGGING',
                message: 'Node output will be loaded after moving is completed'
            }
        };
    }

    return next(context);
};

/**
 * Validation middleware function. Asserts that:
 * - The selection contains a single node
 *
 * Adds the `selectedNode` to the context
 */
export const validateSelection = (context, next) => {
    const { selectedNodes } = context;
    if (!selectedNodes) {
        return next(context);
    }

    if (selectedNodes.length === 0) {
        return {
            error: {
                type: 'NODE',
                code: 'NO_NODE_SELECTED',
                message: 'To show the node output, please select a configured or executed node.'
            }
        };
    }

    if (selectedNodes.length > 1) {
        return {
            error: {
                type: 'NODE',
                code: 'MULTIPLE_NODES_SELECTED',
                message: 'To show the node output, please select only one node.'
            }
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
export const validateOutputPorts = (context, next) => {
    const { selectedNode, portTypes } = context;
    if (!selectedNode || !portTypes) {
        return next(context);
    }

    const hasOutputPorts = selectedNode.outPorts.length > 0;
    if (!hasOutputPorts) {
        return {
            error: {
                type: 'NODE',
                code: 'NO_OUTPUT_PORTS',
                message: 'The selected node has no output ports.'
            }
        };
    }

    if (!selectedNode.outPorts.some(port => supportsPort({ portTypes, port }))) {
        return {
            error: {
                type: 'NODE',
                code: 'NO_SUPPORTED_PORTS',
                message: 'The selected node has no supported output port.'
            }
        };
    }

    return next(context);
};

/**
 * Validation middleware function. Asserts that:
 * - A port is selected
 */
export const validatePortSelection = (context, next) => {
    const { selectedNode, selectedPortIndex } = context;

    if (!selectedNode) {
        return next(context);
    }

    const selectedPort = selectedNode.outPorts[selectedPortIndex];
    // eslint-disable-next-line no-undefined
    if (!selectedPort || selectedPortIndex === undefined || selectedPortIndex === null) {
        return {
            error: {
                type: 'PORT',
                code: 'NO_PORT_SELECTED',
                message: 'No port selected'
            }
        };
    }

    return next({ ...context, selectedPort });
};

/**
 * Validation middleware function. Asserts that:
 * - The selected port has a supported viewer
 * - The selected port is not inactive
 */
export const validatePortSupport = (context, next) => {
    const { selectedPort, portTypes } = context;
    if (!selectedPort || !portTypes) {
        return next(context);
    }

    if (!supportsPort({ portTypes, port: selectedPort })) {
        return {
            error: {
                type: 'PORT',
                code: 'NO_SUPPORTED_VIEW',
                message: 'The data at the output port is not supported by any viewer.'
            }
        };
    }

    if (selectedPort.inactive) {
        return {
            error: {
                type: 'PORT',
                code: 'PORT_INACTIVE',
                message: 'This output port is inactive and therefore no output data is available for display.'
            }
        };
    }

    return next(context);
};


/**
 * Validation middleware function. Asserts that:
 * - The selected node is configured
 */
export const validateNodeConfigurationState = (context, next) => {
    const { selectedNode } = context;
    if (!selectedNode) {
        return next(context);
    }

    const isNodeIdle = selectedNode.state?.executionState === 'IDLE';

    if (isNodeIdle) {
        return {
            error: {
                type: 'NODE',
                code: 'NODE_UNCONFIGURED',
                message: 'Please first configure the selected node.'
            }
        };
    }

    return next(context);
};

/**
 * Validation middleware function. Asserts that:
 * - The selected node is executed
 * - The selected node is not in a busy state (QUEUE || EXECUTING)
 */
export const validateNodeExecutionState = (context, next) => {
    const { selectedPort, selectedNode, portTypes, selectedPortIndex } = context;

    const validate = () => {
        if (selectedNode.allowedActions.canExecute) {
            return {
                error: {
                    type: 'NODE',
                    code: 'NODE_UNEXECUTED',
                    message: 'To show the output, please execute the selected node.'
                }
            };
        }

        const state = selectedNode.state.executionState;
        if (state === 'QUEUED' || state === 'EXECUTING') {
            return {
                error: {
                    type: 'NODE',
                    code: 'NODE_BUSY',
                    message: 'Output is available after execution.'
                }
            };
        }

        return next(context);
    };

    if (!selectedPort) {
        return validate();
    }

    const { kind: portKind } = getPortType({ portTypes, port: selectedPort });
    const isNotDefaultFlowVariable = portKind !== 'flowVariable' || selectedPortIndex > 0;

    // only flowVariable ports can be shown if the node hasn't executed
    if (isNotDefaultFlowVariable) {
        return validate();
    }

    return next(context);
};

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
export const buildMiddleware = (...middlewares) => (env) => {
    // convert a simple function into a middleware function
    // by partially applying environment and next before calling the given function along with the context
    const toMiddlewareFn = (fn) => (environment, next) => (context) => fn({ ...environment, ...context }, next);

    const runFinal = (context) => context;

    const runChain = middlewares
        .map(toMiddlewareFn)
        .reduceRight(
            (next, middleware) => middleware(env, next),
            runFinal
        );

    return runChain;
};
