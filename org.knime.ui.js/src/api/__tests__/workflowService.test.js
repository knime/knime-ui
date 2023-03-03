import { expect, describe, beforeEach, it, vi } from 'vitest';
import { connectNodes, moveObjects, deleteObjects, addNode, collapseToContainer, expandContainerNode,
    copyOrCutWorkflowParts, pasteWorkflowParts, renameContainerNode, renameNodeLabel, addNodePort } from '@api';

describe('workflow commands', () => {
    beforeEach(() => {
        window.jsonrpc = vi.fn().mockReturnValue({
            jsonrpc: '2.0',
            result: 'dummy',
            id: -1
        });
    });

    it('connectNodes', () => {
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
        it('nodes and annotations', () => {
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

        it('empty arrays', () => {
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
        it('nodes, annotations and connections', () => {
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

        it('empty arrays', () => {
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

    it('addNode', () => {
        addNode({
            projectId: 'project',
            workflowId: 'workflow',
            position: {
                x: 0,
                y: 1
            },
            nodeFactory: { className: 'className' },
            sourceNodeId: 'src-node',
            sourcePortIdx: 3
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
                    nodeFactory: { className: 'className' },
                    sourceNodeId: 'src-node',
                    sourcePortIdx: 3
                }
            ],
            id: 0
        });
    });

    it('collapseToContainer', () => {
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

    it('expandContainerNode', () => {
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
        it.each([
            ['copy'],
            ['cut']
        ])('%s', (command) => {
            copyOrCutWorkflowParts({
                projectId: 'project',
                workflowId: 'workflow',
                command,
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
                        kind: command,
                        nodeIds: ['root:1', 'root:2'],
                        annotationIds: ['ann:1', 'ann:2']
                    }
                ],
                id: 0
            });
        });

        it('paste', () => {
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

        it('addNodePort', () => {
            addNodePort({
                projectId: 'project',
                workflowId: 'workflow',
                nodeId: 'root:1',
                side: 'input',
                portGroup: 'portGroup',
                typeId: '1'
            });
            expect(window.jsonrpc).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                method: 'WorkflowService.executeWorkflowCommand',
                params: [
                    'project',
                    'workflow',
                    {
                        kind: 'add_port',
                        nodeId: 'root:1',
                        side: 'input',
                        portGroup: 'portGroup',
                        portTypeId: '1'
                    }
                ],
                id: 0
            });
        });

        it('renameContainerNode', () => {
            renameContainerNode({
                projectId: 'project',
                workflowId: 'workflow',
                nodeId: 'root:1',
                name: 'New name'
            });
            expect(window.jsonrpc).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                method: 'WorkflowService.executeWorkflowCommand',
                params: [
                    'project',
                    'workflow',
                    {
                        kind: 'update_component_or_metanode_name',
                        nodeId: 'root:1',
                        name: 'New name'
                    }
                ],
                id: 0
            });
        });

        it('renameNodeLabel', () => {
            renameNodeLabel({
                projectId: 'project',
                workflowId: 'workflow',
                nodeId: 'root:1',
                label: 'New label'
            });
            expect(window.jsonrpc).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                method: 'WorkflowService.executeWorkflowCommand',
                params: [
                    'project',
                    'workflow',
                    {
                        kind: 'update_node_label',
                        nodeId: 'root:1',
                        label: 'New label'
                    }
                ],
                id: 0
            });
        });
    });
});
