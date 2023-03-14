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

    const toCallerParams = params => ({ projectId: 'project', workflowId: 'workflow', ...params });
    const toCalleeParams = workflowCommand => ({ projectId: 'project', workflowId: 'workflow', workflowCommand });

    it('connectNodes', () => {
        const sourceNode = 'source';
        const sourcePort = 0;
        const destNode = 'dest';
        const destPort = 1;
        connectNodes(toCallerParams({ sourceNode, sourcePort, destNode, destPort }));
        expect(window.jsonrpc).toHaveBeenCalledWith({
            jsonrpc: '2.0',
            method: 'WorkflowService.executeWorkflowCommand',
            params: toCalleeParams({
                kind: 'connect',
                sourceNodeId: sourceNode,
                sourcePortIdx: sourcePort,
                destinationNodeId: destNode,
                destinationPortIdx: destPort
            }),
            id: 0
        });
    });

    describe('moveObjects', () => {
        it('nodes and annotations', () => {
            const nodeIds = ['node:1', 'node:2'];
            const annotationIds = ['ann:1', 'ann:2'];
            const translation = [100, 200];
            moveObjects(toCallerParams({ nodeIds, annotationIds, translation }));
            expect(window.jsonrpc).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                method: 'WorkflowService.executeWorkflowCommand',
                params: toCalleeParams({
                    kind: 'translate',
                    nodeIds,
                    annotationIds,
                    translation
                }),
                id: 0
            });
        });

        it('empty arrays', () => {
            const translation = [100, 200];
            moveObjects(toCallerParams({ translation }));
            expect(window.jsonrpc).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                method: 'WorkflowService.executeWorkflowCommand',
                params: toCalleeParams({
                    kind: 'translate',
                    nodeIds: [],
                    annotationIds: [],
                    translation
                }),
                id: 0
            });
        });
    });

    describe('deleteObjects', () => {
        it('nodes, annotations and connections', () => {
            const nodeIds = ['node:1', 'node:2'];
            const annotationIds = ['ann:1', 'ann:2'];
            const connectionIds = ['conn:1', 'conn:2'];
            deleteObjects(toCallerParams({ nodeIds, annotationIds, connectionIds }));
            expect(window.jsonrpc).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                method: 'WorkflowService.executeWorkflowCommand',
                params: toCalleeParams({
                    kind: 'delete',
                    nodeIds,
                    annotationIds,
                    connectionIds
                }),
                id: 0
            });
        });

        it('empty arrays', () => {
            deleteObjects(toCallerParams({}));
            expect(window.jsonrpc).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                method: 'WorkflowService.executeWorkflowCommand',
                params: toCalleeParams({
                    kind: 'delete',
                    nodeIds: [],
                    annotationIds: [],
                    connectionIds: []
                }),
                id: 0
            });
        });
    });

    it('addNode', () => {
        const command = {
            position: {
                x: 0,
                y: 1
            },
            nodeFactory: { className: 'className' },
            sourceNodeId: 'src-node',
            sourcePortIdx: 3
        };
        addNode(toCallerParams({ ...command }));
        expect(window.jsonrpc).toHaveBeenCalledWith({
            jsonrpc: '2.0',
            method: 'WorkflowService.executeWorkflowCommand',
            params: toCalleeParams({
                kind: 'add_node',
                ...command
            }),
            id: 0
        });
    });

    it('collapseToContainer', () => {
        const containerType = 'metanode';
        const nodeIds = ['root:1', 'root:2'];
        collapseToContainer(toCallerParams({ containerType, nodeIds }));
        expect(window.jsonrpc).toHaveBeenCalledWith({
            jsonrpc: '2.0',
            method: 'WorkflowService.executeWorkflowCommand',
            params: toCalleeParams({
                kind: 'collapse',
                containerType,
                annotationIds: [],
                nodeIds
            }),
            id: 0
        });
    });

    it('expandContainerNode', () => {
        const nodeId = 'root:1';
        expandContainerNode(toCallerParams({ nodeId }));
        expect(window.jsonrpc).toHaveBeenCalledWith({
            jsonrpc: '2.0',
            method: 'WorkflowService.executeWorkflowCommand',
            params: toCalleeParams({
                kind: 'expand',
                nodeId: 'root:1'
            }),
            id: 0
        });
    });

    // TODO: add test for open layout editor

    describe('copy & paste', () => {
        it.each([
            ['copy'],
            ['cut']
        ])('%s', (command) => {
            const nodeIds = ['root:1', 'root:2'];
            const annotationIds = ['ann:1', 'ann:2'];
            copyOrCutWorkflowParts(toCallerParams({ command, nodeIds, annotationIds }));
            expect(window.jsonrpc).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                method: 'WorkflowService.executeWorkflowCommand',
                params: toCalleeParams({
                    kind: command,
                    nodeIds,
                    annotationIds
                }),
                id: 0
            });
        });

        it('paste', () => {
            const content = { payload: {}, payloadIdentifier: '', version: '' };
            const position = { x: 128, y: 256 };
            pasteWorkflowParts(toCallerParams({ content, position }));
            expect(window.jsonrpc).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                method: 'WorkflowService.executeWorkflowCommand',
                params: toCalleeParams({
                    kind: 'paste',
                    content,
                    position
                }),
                id: 0
            });
        });
    });

    it('addNodePort', () => {
        const nodeId = 'root:1';
        const side = 'input';
        const portGroup = 'portGroup';
        const typeId = '1';
        addNodePort(toCallerParams({ nodeId, side, portGroup, typeId }));
        expect(window.jsonrpc).toHaveBeenCalledWith({
            jsonrpc: '2.0',
            method: 'WorkflowService.executeWorkflowCommand',
            params: toCalleeParams({
                kind: 'add_port',
                nodeId,
                side,
                portGroup,
                portTypeId: typeId
            }),
            id: 0
        });
    });

    it('renameContainerNode', () => {
        const nodeId = 'root:1';
        const name = 'New name';
        renameContainerNode(toCallerParams({ nodeId, name }));
        expect(window.jsonrpc).toHaveBeenCalledWith({
            jsonrpc: '2.0',
            method: 'WorkflowService.executeWorkflowCommand',
            params: toCalleeParams({
                kind: 'update_component_or_metanode_name',
                nodeId,
                name
            }),
            id: 0
        });
    });

    it('renameNodeLabel', () => {
        const nodeId = 'root:1';
        const label = 'New label';
        renameNodeLabel(toCallerParams({ nodeId, label }));
        expect(window.jsonrpc).toHaveBeenCalledWith({
            jsonrpc: '2.0',
            method: 'WorkflowService.executeWorkflowCommand',
            params: toCalleeParams({
                kind: 'update_node_label',
                nodeId,
                label
            }),
            id: 0
        });
    });
});
