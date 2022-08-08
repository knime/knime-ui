/* eslint-disable valid-jsdoc */
/* eslint-disable func-style */
/**
 * Returns the port type of a given port and a dictionary of available port types
 * @param {{ portTypes, port }} param
 * @returns {String}
 */
const getPortType = ({ portTypes, port }) => portTypes[port.typeId];

/**
 * Determines whether a given port is "supported". Supported ports are only those whose kind is
 * 'table' or 'flowVariable'. To determine the types, the dictionary of all available port type ids is needed
 * @param {*} param
 * @returns {Boolean}
 */
const supportsPort = ({ portTypes, port }) => {
    try {
        const { kind: portKind } = getPortType({ portTypes, port });
        return portKind === 'table' || portKind === 'flowVariable';
    } catch {
        return false;
    }
};

// ========================== Validation Functions ============================     //
//   The validation functions act as part of a middleware pipe. Each function       //
//   executes a specific validation by looking at the `environment` and `context`   //
//   parameters in order to determine the result. Each function can return early    //
//   by creating an error result, or they can call the `next` function so that      //
//   the next function in the validation pipeline can execute. Additionally,        //
//   each validation function can pass to the `next` fn a modified `context`        //
//   so that the following checks in the pipeline can use the updated context       //
//   in order to perform their logic                                                //
// ========================== Validation Functions ============================     //

/**
 * Validation middleware function. Asserts that:
 * - Nodes are not being dragged
 */
const validateDragging = ({ isDragging }, next) => context => {
    if (isDragging) {
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
 */
const validateSelection = ({ selectedNodes }, next) => context => {
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
const validateOuputPorts = ({ portTypes }, next) => context => {
    const { selectedNode } = context;
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
const validatePortSelection = ({ selectedNode, selectedPortIndex }, next) => (context) => {
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
const validatePortSupport = ({ portTypes }, next) => (context) => {
    const { selectedPort } = context;
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
                message: 'This output port is inactive and therefore no data table is available.'
            }
        };
    }

    return next(context);
};


/**
 * Validation middleware function. Asserts that:
 * - The selected node is configured
 */
const validateNodeConfigurationState = (_, next) => context => {
    const { selectedNode } = context;
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
const validateNodeExecutionState = ({ portTypes, selectedNode }, next) => context => {
    const { selectedPort } = context;
    const { kind: portKind } = getPortType({ portTypes, port: selectedPort });
    const isNotFlowVariable = portKind !== 'flowVariable';

    // only flowVariable ports can be shown if the node hasn't executed
    if (isNotFlowVariable) {
        if (selectedNode.allowedActions.canExecute) {
            return {
                error: {
                    type: 'NODE',
                    code: 'NODE_UNEXECUTED',
                    message: 'To show the output table, please execute the selected node.'
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
    }

    return next(context);
};

/**
 * Builds a middleware pipeline. Receives as parameters:
 * - An array of middleware functions
 * - An `environment` object, which contains properties
 *  over which the different validations will be run
 * - A `context` object, which will be built and enhanced
 *  as the functions in the pipeline run
 *
 * Returns a function to start the pipeline. This function will receive
 * the initial context and will return the context's value after
 * all the validation middlewares have executed (or performed an early exit)
 */
const buildMiddleware = (...middlewares) => (env) => (req) => {
    const runFinal = (context) => context;

    const chain = middlewares.reduceRight(
        (next, middleware) => middleware(env, next),
        runFinal
    );
    
    return chain(req);
};

export const runPortValidationChecks = ({ selectedNode, portTypes, selectedPortIndex }) => {
    const validationMiddleware = buildMiddleware(
        validatePortSelection,
        validatePortSupport,
        validateNodeExecutionState
    );

    const result = validationMiddleware({ selectedNode, portTypes, selectedPortIndex })({ error: null });

    return Object.freeze(result);
};


export const runNodeValidationChecks = ({ selectedNodes, isDragging, portTypes }) => {
    const validationMiddleware = buildMiddleware(
        validateDragging,
        validateSelection,
        validateOuputPorts,
        validateNodeConfigurationState
    );

    const result = validationMiddleware({ selectedNodes, isDragging, portTypes })({ error: null });

    return Object.freeze(result);
};
