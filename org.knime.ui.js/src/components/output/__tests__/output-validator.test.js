import * as outputValidator from '../output-validator';

describe('output-validator.js', () => {
    const portTypes = {
        'table-port-type': {
            kind: 'table',
            name: 'Data',
            hasView: true
        },
        'flow-variable-port-type': {
            kind: 'flowVariable',
            name: 'Flow Variable',
            hasView: true
        }
    };

    const selectedPortIndex = 0;
    
    const dummyNode = {
        id: 'node1',
        selected: true,
        outPorts: [{ typeId: 'flow-variable-port-type' }],
        isLoaded: false,
        state: {
            executionState: 'UNSET'
        },
        allowedActions: {
            canExecute: false
        }
    };

    describe('Node validation checks', () => {
        const runNodeValidationChecks = (params) => {
            const runMiddleware = outputValidator.buildMiddleware(
                outputValidator.validateDragging,
                outputValidator.validateSelection,
                outputValidator.validateNodeConfigurationState,
                outputValidator.validateOutputPorts
            )(params);

            return runMiddleware();
        };

        it('validates that node is not being dragged', () => {
            const result = runNodeValidationChecks({ selectedNodes: [dummyNode], portTypes, isDragging: true });
            expect(result).toEqual({
                error: {
                    type: 'NODE',
                    code: 'NODE_DRAGGING',
                    message: 'Node output will be loaded after moving is completed'
                }
            });
        });

        it('validates that at least one node is selected', () => {
            const result = runNodeValidationChecks({
                selectedNodes: [],
                portTypes,
                isDragging: false
            });
            
            expect(result).toEqual({
                error: {
                    type: 'NODE',
                    code: 'NO_NODE_SELECTED',
                    message: 'To show the node output, please select a configured or executed node.'
                }
            });
        });
       
        it('validates that no more than 1 node is selected', () => {
            const result = runNodeValidationChecks({
                selectedNodes: [dummyNode, { ...dummyNode, id: 'node2' }],
                portTypes,
                isDragging: false
            });

            expect(result).toEqual({
                error: {
                    type: 'NODE',
                    code: 'MULTIPLE_NODES_SELECTED',
                    message: 'To show the node output, please select only one node.'
                }
            });
        });

        
        describe('output ports', () => {
            it('validates that the selected node has output ports', () => {
                const result = runNodeValidationChecks({
                    selectedNodes: [{ ...dummyNode, outPorts: [] }],
                    portTypes,
                    isDragging: false
                });
    
                expect(result).toEqual({
                    error: {
                        type: 'NODE',
                        code: 'NO_OUTPUT_PORTS',
                        message: 'The selected node has no output ports.'
                    }
                });
            });

            it('validates that the selected node has supported ports', () => {
                const result = runNodeValidationChecks({
                    selectedNodes: [{ ...dummyNode, outPorts: [{ typeId: 'something-unsopported' }] }],
                    portTypes,
                    isDragging: false
                });
    
                expect(result).toEqual({
                    error: {
                        type: 'NODE',
                        code: 'NO_SUPPORTED_PORTS',
                        message: 'The selected node has no supported output port.'
                    }
                });
            });

            it('validates that the selected node has at least 1 supported output port', () => {
                const result = runNodeValidationChecks({
                    selectedNodes: [{
                        ...dummyNode,
                        outPorts: [
                            { typeId: 'flow-variable-port-type' },
                            { typeId: 'table-port-type' },
                            { typeId: 'something-unsopported' }
                        ]
                    }],
                    portTypes,
                    isDragging: false
                });
    
                expect(result.error).toBeUndefined();
            });
        });
        

        it('validates that the node is configured', () => {
            const result = runNodeValidationChecks({
                selectedNodes: [{ ...dummyNode, state: { executionState: 'IDLE' } }],
                portTypes,
                isDragging: false
            });

            expect(result).toEqual({
                error: {
                    type: 'NODE',
                    code: 'NODE_UNCONFIGURED',
                    message: 'Please first configure the selected node.'
                }
            });
        });
    });

    // Port validation checks assume that the `selectedNode` is already valid
    describe('Port validation checks', () => {
        const runPortValidationChecks = (params) => {
            const runMiddleware = outputValidator.buildMiddleware(
                outputValidator.validatePortSelection,
                outputValidator.validatePortSupport,
                outputValidator.validateNodeExecutionState
            )(params);

            return runMiddleware();
        };

        it('validates that a port is selected', () => {
            const result = runPortValidationChecks({
                selectedNode: dummyNode,
                portTypes
            });

            expect(result).toEqual({
                error: {
                    type: 'PORT',
                    code: 'NO_PORT_SELECTED',
                    message: 'No port selected'
                }
            });
        });

        it('validates that the selected port is supported', () => {
            const result = runPortValidationChecks({
                selectedNode: { ...dummyNode, outPorts: [{ typeId: 'something-unsupported' }] },
                portTypes,
                selectedPortIndex
            });

            expect(result).toEqual({
                error: {
                    type: 'PORT',
                    code: 'NO_SUPPORTED_VIEW',
                    message: 'The data at the output port is not supported by any viewer.'
                }
            });
        });

        it('validates that the selected port is active', () => {
            const result = runPortValidationChecks({
                selectedNode: { ...dummyNode, outPorts: [{ typeId: 'table-port-type', inactive: true }] },
                portTypes,
                selectedPortIndex
            });

            expect(result).toEqual({
                error: {
                    type: 'PORT',
                    code: 'PORT_INACTIVE',
                    message: 'This output port is inactive and therefore no output data is available for display.'
                }
            });
        });

        describe('port depending on node execution state', () => {
            it('validates that port cannot be shown if node is unexecuted', () => {
                const result = runPortValidationChecks({
                    selectedNode: {
                        ...dummyNode,
                        allowedActions: { canExecute: true },
                        outPorts: [
                            { typeId: 'flow-variable-port-type' },
                            { typeId: 'table-port-type' }
                        ]
                    },
                    portTypes,
                    selectedPortIndex: 1
                });

                expect(result).toEqual({
                    error: {
                        type: 'NODE',
                        code: 'NODE_UNEXECUTED',
                        message: 'To show the output, please execute the selected node.'
                    }
                });
            });

            it('validates that port can be shown if it\'s the flowVariablePort', () => {
                const result = runPortValidationChecks({
                    selectedNode: {
                        ...dummyNode,
                        outPorts: [
                            { typeId: 'flow-variable-port-type' }
                        ]
                    },
                    portTypes,
                    selectedPortIndex
                });

                expect(result.error).toBeUndefined();
            });

            it.each([
                ['EXECUTING'],
                ['QUEUED']
            ])('validates that port cannot be shown if node is in the %s state', (executionState) => {
                const result = runPortValidationChecks({
                    selectedNode: {
                        ...dummyNode,
                        state: { executionState },
                        outPorts: [
                            { typeId: 'flow-variable-port-type' },
                            { typeId: 'table-port-type' }
                        ]
                    },
                    portTypes,
                    selectedPortIndex: 1
                });

                expect(result).toEqual({
                    error: {
                        type: 'NODE',
                        code: 'NODE_BUSY',
                        message: 'Output is available after execution.'
                    }
                });
            });
        });
    });
});
