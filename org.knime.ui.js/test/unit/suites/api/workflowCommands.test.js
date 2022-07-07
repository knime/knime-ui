/* eslint-disable no-magic-numbers */
import { connectNodes, moveObjects, deleteObjects, addNode, collapseToContainer, expandContainerNode,
    copyWorkflowParts, cutWorkflowParts, pasteWorkflowParts } from '~/api';

describe('workflow commands', () => {
    beforeEach(() => {
        window.jsonrpc = jest.fn().mockReturnValue({
            jsonrpc: '2.0',
            result: 'dummy',
            id: -1
        });
    });

    test('connectNodes', () => {
        connectNodes({
            projectId: 'project',
            workflowId: 'workflow',
            sourceNode: 'source',
            sourcePort: 0,
            destNode: 'dest',
            destPort: 1
        });
        expect(window.jsonrpc).toHaveBeenCalledWith({
            jsonrpc: '2.0',
            method: 'WorkflowService.executeWorkflowCommand',
            params: [
                'project',
                'workflow',
                {
                    kind: 'connect',
                    sourceNodeId: 'source',
                    sourcePortIdx: 0,
                    destinationNodeId: 'dest',
                    destinationPortIdx: 1
                }
            ],
            id: 0
        });
    });

    describe('moveObjects', () => {
        test('nodes and annotations', () => {
            moveObjects({
                projectId: 'project',
                workflowId: 'workflow',
                nodeIds: ['node:1', 'node:2'],
                annotationIds: ['ann:1', 'ann:2'],
                translation: [100, 200]
            });
            expect(window.jsonrpc).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                method: 'WorkflowService.executeWorkflowCommand',
                params: [
                    'project',
                    'workflow',
                    {
                        kind: 'translate',
                        nodeIds: ['node:1', 'node:2'],
                        annotationIds: ['ann:1', 'ann:2'],
                        translation: [100, 200]
                    }
                ],
                id: 0
            });
        });

        test('empty arrays', () => {
            moveObjects({
                projectId: 'project',
                workflowId: 'workflow',
                translation: [100, 200]
            });
            expect(window.jsonrpc).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                method: 'WorkflowService.executeWorkflowCommand',
                params: [
                    'project',
                    'workflow',
                    {
                        kind: 'translate',
                        nodeIds: [],
                        annotationIds: [],
                        translation: [100, 200]
                    }
                ],
                id: 0
            });
        });
    });

    describe('deleteObjects', () => {
        test('nodes, annotations and connections', () => {
            deleteObjects({
                projectId: 'project',
                workflowId: 'workflow',
                nodeIds: ['node:1', 'node:2'],
                annotationIds: ['ann:1', 'ann:2'],
                connectionIds: ['conn:1', 'conn:2']
            });
            expect(window.jsonrpc).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                method: 'WorkflowService.executeWorkflowCommand',
                params: [
                    'project',
                    'workflow',
                    {
                        kind: 'delete',
                        nodeIds: ['node:1', 'node:2'],
                        annotationIds: ['ann:1', 'ann:2'],
                        connectionIds: ['conn:1', 'conn:2']
                    }
                ],
                id: 0
            });
        });

        test('empty arrays', () => {
            deleteObjects({
                projectId: 'project',
                workflowId: 'workflow'
            });
            expect(window.jsonrpc).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                method: 'WorkflowService.executeWorkflowCommand',
                params: [
                    'project',
                    'workflow',
                    {
                        kind: 'delete',
                        nodeIds: [],
                        annotationIds: [],
                        connectionIds: []
                    }
                ],
                id: 0
            });
        });
    });

    test('addNode', () => {
        addNode({
            projectId: 'project',
            workflowId: 'workflow',
            position: {
                x: 0,
                y: 1
            },
            nodeFactory: { className: 'className' }
        });
        expect(window.jsonrpc).toHaveBeenCalledWith({
            jsonrpc: '2.0',
            method: 'WorkflowService.executeWorkflowCommand',
            params: [
                'project',
                'workflow',
                {
                    kind: 'add_node',
                    position: {
                        x: 0,
                        y: 1
                    },
                    nodeFactory: { className: 'className' }
                }
            ],
            id: 0
        });
    });

    test('collapseToContainer', () => {
        collapseToContainer({
            projectId: 'project',
            workflowId: 'workflow',
            containerType: 'metanode',
            nodeIds: ['root:1', 'root:2']
        });
        expect(window.jsonrpc).toHaveBeenCalledWith({
            jsonrpc: '2.0',
            method: 'WorkflowService.executeWorkflowCommand',
            params: [
                'project',
                'workflow',
                {
                    containerType: 'metanode',
                    annotationIds: [],
                    kind: 'collapse',
                    nodeIds: ['root:1', 'root:2']
                }
            ],
            id: 0
        });
    });

    test('expandContainerNode', () => {
        expandContainerNode({
            projectId: 'project',
            workflowId: 'workflow',
            nodeId: 'root:1'
        });
        expect(window.jsonrpc).toHaveBeenCalledWith({
            jsonrpc: '2.0',
            method: 'WorkflowService.executeWorkflowCommand',
            params: [
                'project',
                'workflow',
                {
                    kind: 'expand',
                    nodeId: 'root:1'
                }
            ],
            id: 0
        });
    });

    // TODO: add test for open layout editor

    describe('copy & paste', () => {
        test('copy', () => {
            copyWorkflowParts({
                projectId: 'project',
                workflowId: 'workflow',
                nodeIds: ['root:1', 'root:2'],
                annotationIds: ['ann:1', 'ann:2']
            });
            expect(window.jsonrpc).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                method: 'WorkflowService.executeWorkflowCommand',
                params: [
                    'project',
                    'workflow',
                    {
                        kind: 'copy',
                        nodeIds: ['root:1', 'root:2'],
                        annotationIds: ['ann:1', 'ann:2']
                    }
                ],
                id: 0
            });
        });

        test('cut', () => {
            cutWorkflowParts({
                projectId: 'project',
                workflowId: 'workflow',
                nodeIds: ['root:1', 'root:2'],
                annotationIds: ['ann:1', 'ann:2']
            });
            expect(window.jsonrpc).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                method: 'WorkflowService.executeWorkflowCommand',
                params: [
                    'project',
                    'workflow',
                    {
                        kind: 'cut',
                        nodeIds: ['root:1', 'root:2'],
                        annotationIds: ['ann:1', 'ann:2']
                    }
                ],
                id: 0
            });
        });

        test('paste', () => {
            pasteWorkflowParts({
                projectId: 'project',
                workflowId: 'workflow',
                content: {
                    payload: {},
                    payloadIdentifier: '',
                    version: ''
                },
                position: {
                    x: 128,
                    y: 256
                }
            });
            expect(window.jsonrpc).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                method: 'WorkflowService.executeWorkflowCommand',
                params: [
                    'project',
                    'workflow',
                    {
                        kind: 'paste',
                        content: {
                            payload: {},
                            payloadIdentifier: '',
                            version: ''
                        },
                        position: {
                            x: 128,
                            y: 256
                        }
                    }
                ],
                id: 0
            });
        });
    });
});
