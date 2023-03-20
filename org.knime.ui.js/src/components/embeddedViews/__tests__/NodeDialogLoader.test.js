import { expect, describe, beforeAll, afterEach, it, vi } from 'vitest';
import * as Vue from 'vue';
import { mount } from '@vue/test-utils';
import { KnimeService } from '@knime/ui-extension-service';

import { getNodeDialog as getNodeDialogMock, callNodeDataService as callNodeDataServiceMock } from '@api';

import NodeDialogLoader from '../NodeDialogLoader.vue';

vi.mock('@api', () => ({
    getNodeDialog: vi.fn(),
    callNodeDataService: vi.fn()
}), { virtual: true });

vi.mock('@knime/ui-extension-service', () => ({
    KnimeService: vi.fn()
}));


describe('NodeDialogLoader.vue', () => {
    const dummyNode = {
        id: 'node1',
        selected: true,
        outPorts: [],
        isLoaded: false,
        state: {
            executionState: 'UNSET'
        },
        allowedActions: {
            canExecute: false
        },
        hasDialog: true
    };

    const props = {
        projectId: 'project-id',
        workflowId: 'workflow-id',
        selectedNode: dummyNode
    };

    afterEach(() => {
        vi.clearAllMocks();
    });

    const doMount = (mockStore = {}) => mount(NodeDialogLoader, {
        props,
        // create a mock store instead of a real one via global.plugins
        global: { mocks: { $store: mockStore } }
    });

    it('should load nodeDialog on mount', () => {
        doMount();

        expect(getNodeDialogMock).toBeCalledWith(expect.objectContaining({
            projectId: props.projectId,
            workflowId: props.workflowId,
            nodeId: props.selectedNode.id
        }));
    });

    it('should load the node dialog when the selected node changes and the new node has a dialog', async () => {
        const wrapper = doMount();
        const newNode = { ...dummyNode, id: 'node2' };

        wrapper.setProps({ selectedNode: newNode });

        await Vue.nextTick();

        expect(getNodeDialogMock).toBeCalledTimes(2);
        expect(getNodeDialogMock).toBeCalledWith(expect.objectContaining({
            nodeId: 'node2'
        }));
    });

    describe('knime service callbacks', () => {
        const mockCallbackRegistry = () => {
            const registeredCallbacks = new Map();

            return {
                add: (name, cb) => {
                    registeredCallbacks.set(name, cb);
                },

                dispatch: async (name, ...params) => {
                    if (registeredCallbacks.has(name)) {
                        await registeredCallbacks.get(name)(...params);
                    }
                },

                clear: () => {
                    registeredCallbacks.clear();
                }
            };
        };
        const registry = mockCallbackRegistry();

        beforeAll(() => {
            KnimeService.mockImplementation((config, dataCb, notificationCb) => {
                registry.add('data', dataCb);
                registry.add('notification', notificationCb);
            });
        });

        afterEach(() => {
            registry.clear();
        });

        it('should register the data callback correctly', async () => {
            const wrapper = doMount();
            wrapper.vm.initKnimeService({ dummyConfig: true });
            expect(callNodeDataServiceMock).not.toHaveBeenCalled();
            const params = ['NodeService.callNodeDataService', 'mockServiceTypeParam', 'mockRequestParam'];
            await registry.dispatch('data', ...params);

            expect(callNodeDataServiceMock).toHaveBeenCalledWith({
                projectId: props.projectId,
                workflowId: props.workflowId,
                nodeId: props.selectedNode.id,
                extensionType: 'dialog',
                serviceType: 'mockServiceTypeParam',
                request: 'mockRequestParam'
            });
        });

        it('should register the notification callback correctly', async () => {
            const mockDispatch = vi.fn();
            const mockStore = {
                dispatch: mockDispatch
            };
            const wrapper = doMount(mockStore);
            wrapper.vm.initKnimeService({ dummyConfig: true });

            const mockNotification = { mock: true };
            expect(callNodeDataServiceMock).not.toHaveBeenCalled();
            const params = [mockNotification];
            await registry.dispatch('notification', ...params);

            expect(mockDispatch).toHaveBeenCalledWith('pagebuilder/service/pushNotification', mockNotification);
        });
    });
});
