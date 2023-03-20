import { expect, describe, afterEach, it } from 'vitest';
import * as Vue from 'vue';
import { mount } from '@vue/test-utils';

import { API } from '@api';
import { deepMocked } from '@/test/utils';

import PortViewLoader from '../PortViewLoader.vue';

const mockedAPI = deepMocked(API);

const RESOURCE_TYPES = {
    VUE_COMPONENT_REFERENCE: 'VUE_COMPONENT_REFERENCE',
    VUE_COMPONENT_LIB: 'VUE_COMPONENT_LIB'
};

describe('PortViewLoader.vue', () => {
    const setupGetPortViewMock = (resourceType, componentId, initialData = {}) => mockedAPI.port.getPortView
        .mockResolvedValue({
            resourceInfo: {
                id: componentId,
                type: resourceType
            },
            initialData: JSON.stringify({ result: initialData })
        });

    // flush awaited api call
    const flushRender = () => new Promise(r => setTimeout(r, 0));

    const dummyNode = {
        id: 'node1',
        selected: true,
        outPorts: [{ portObjectVersion: 'dummy' }, { portObjectVersion: 'dummy2' }],
        isLoaded: false,
        state: {
            executionState: 'UNSET'
        },
        allowedActions: {
            canExecute: false
        }
    };

    const props = {
        projectId: 'project-id',
        workflowId: 'workflow-id',
        selectedNode: dummyNode,
        selectedPortIndex: 0
    };

    afterEach(() => {
        mockedAPI.port.getPortView.mockReset();
    });

    const doMount = () => mount(PortViewLoader, { props });

    it('should load port view on mount', () => {
        doMount();

        expect(mockedAPI.port.getPortView).toBeCalledWith(expect.objectContaining({
            projectId: props.projectId,
            workflowId: props.workflowId,
            nodeId: props.selectedNode.id,
            portIdx: props.selectedPortIndex
        }));
    });

    it('should load port view when the selected node changes', async () => {
        const wrapper = doMount();
        const newNode = { ...dummyNode, id: 'node2' };

        wrapper.setProps({ selectedNode: newNode });

        await Vue.nextTick();

        expect(mockedAPI.port.getPortView).toBeCalledTimes(2);
        expect(mockedAPI.port.getPortView).toBeCalledWith(expect.objectContaining({
            nodeId: 'node2'
        }));
    });

    it('should load port view when the selected port index changes', async () => {
        const wrapper = doMount();

        wrapper.setProps({ selectedPortIndex: 1 });

        await Vue.nextTick();
        await Vue.nextTick();

        expect(mockedAPI.port.getPortView).toBeCalledTimes(2);
        expect(mockedAPI.port.getPortView).toBeCalledWith(expect.objectContaining({
            portIdx: 1
        }));
    });

    it('should emit the port view state', async () => {
        setupGetPortViewMock(RESOURCE_TYPES.VUE_COMPONENT_REFERENCE, 'FlowVariablePortView', []);
        const wrapper = doMount();

        expect(wrapper.emitted('stateChange')[0][0]).toEqual({ state: 'loading' });

        await flushRender();

        expect(wrapper.emitted('stateChange')[1][0]).toEqual({ state: 'ready' });
    });
});
