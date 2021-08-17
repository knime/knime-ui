jest.mock('~api', () => ({
    workflowCommand: jest.fn()
}), { virtual: true });

import { connectNodes, moveObjects, deleteObjects } from '~/api/workflowCommands.js';
import { workflowCommand } from '~api';

describe('workflow commands', () => {
    afterEach(() => {
        workflowCommand.mockReset();
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
        expect(workflowCommand).toHaveBeenCalledWith({
            command: 'connect',
            projectId: 'project',
            workflowId: 'workflow',
            args: {
                sourceNodeId: 'source',
                sourcePortIdx: 0,
                destinationNodeId: 'dest',
                destinationPortIdx: 1
            }
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
            expect(workflowCommand).toHaveBeenCalledWith({
                command: 'translate',
                projectId: 'project',
                workflowId: 'workflow',
                args: {
                    nodeIds: ['node:1', 'node:2'],
                    annotationIds: ['ann:1', 'ann:2'],
                    translation: [100, 200]
                }
            });
        });

        test('empty arrays', () => {
            moveObjects({
                projectId: 'project',
                workflowId: 'workflow',
                translation: [100, 200]
            });
            expect(workflowCommand).toHaveBeenCalledWith({
                command: 'translate',
                projectId: 'project',
                workflowId: 'workflow',
                args: {
                    nodeIds: [],
                    annotationIds: [],
                    translation: [100, 200]
                }
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
                connectionIds: ['conn:1', 'conn:2'],
            });
            expect(workflowCommand).toHaveBeenCalledWith({
                command: 'delete',
                projectId: 'project',
                workflowId: 'workflow',
                args: {
                    nodeIds: ['node:1', 'node:2'],
                    annotationIds: ['ann:1', 'ann:2'],
                    connectionIds: ['conn:1', 'conn:2'],
                }
            });
        });

        test('empty arrays', () => {
            deleteObjects({
                projectId: 'project',
                workflowId: 'workflow',
            });
            expect(workflowCommand).toHaveBeenCalledWith({
                command: 'delete',
                projectId: 'project',
                workflowId: 'workflow',
                args: {
                    nodeIds: [],
                    annotationIds: [],
                    connectionIds: [],
                }
            });
        });
    });
});
