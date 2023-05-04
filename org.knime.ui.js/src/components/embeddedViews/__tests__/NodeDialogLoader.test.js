import { expect, describe, beforeAll, afterEach, it, vi } from 'vitest';
import * as Vue from 'vue';
import { mount } from '@vue/test-utils';
import { KnimeService } from '@knime/ui-extension-service';

import { deepMocked } from '@/test/utils';
import { API } from '@api';

import NodeDialogLoader from '../NodeDialogLoader.vue';

vi.mock('@knime/ui-extension-service', () => ({
    KnimeService: vi.fn()
}));

const mockedAPI = deepMocked(API);

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

        expect(mockedAPI.node.getNodeDialog).toBeCalledWith(expect.objectContaining({
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

        expect(mockedAPI.node.getNodeDialog).toBeCalledTimes(2);
        expect(mockedAPI.node.getNodeDialog).toBeCalledWith(expect.objectContaining({
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
            expect(mockedAPI.node.callNodeDataService).not.toHaveBeenCalled();
            const params = ['NodeService.callNodeDataService', 'mockServiceTypeParam', 'mockRequestParam'];
            await registry.dispatch('data', ...params);

            expect(mockedAPI.node.callNodeDataService).toHaveBeenCalledWith({
                projectId: props.projectId,
                workflowId: props.workflowId,
                nodeId: props.selectedNode.id,
                extensionType: 'dialog',
                serviceType: 'mockServiceTypeParam',
                dataServiceRequest: 'mockRequestParam'
            });
        });

        it('should register the notification callback correctly', async () => {
            const mockDispatch = vi.fn();
            const mockStore = {
                dispatch: mockDispatch
            };
            const wrapper = doMount(mockStore);
            wrapper.vm.initKnimeService({ dummyConfig: true });

            const mockEvent = { mock: true };
            expect(mockedAPI.node.callNodeDataService).not.toHaveBeenCalled();
            const params = [mockEvent];
            await registry.dispatch('notification', ...params);

            expect(mockDispatch).toHaveBeenCalledWith('pagebuilder/service/pushEvent', mockEvent);
        });
    });
});
