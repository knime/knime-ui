import Vue from 'vue';
import { createLocalVue, mount } from '@vue/test-utils';

import { KnimeService } from '~/knime-ui-extension-service';
import { getPortView as getPortViewMock } from '~/api';
import PortViewLoader from '~/components/output/PortViewLoader.vue';
import { loadComponentLibrary } from '~/util/loadComponentLibrary';
import FlowVariablePortView from '~/components/output/FlowVariablePortView.vue';

jest.mock('~/api', () => ({ getPortView: jest.fn() }), { virtual: true });

jest.mock('~/util/loadComponentLibrary', () => ({
    loadComponentLibrary: jest.fn()
}));

jest.mock('~/knime-ui-extension-service', () => ({
    KnimeService: jest.fn()
}));

const RESOURCE_TYPES = {
    VUE_COMPONENT_REFERENCE: 'VUE_COMPONENT_REFERENCE',
    VUE_COMPONENT_LIB: 'VUE_COMPONENT_LIB'
};

describe('PortViewLoader.vue', () => {
    const setupGetPortViewMock = (resourceType, componentId, initialData = {}) => getPortViewMock.mockResolvedValue({
        resourceInfo: {
            id: componentId,
            type: resourceType
        },
        initialData: JSON.stringify({ result: initialData })
    });

    // flush awaited api call
    const flushPromise = () => new Promise(r => setTimeout(r, 0));

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

    const propsData = {
        projectId: 'project-id',
        workflowId: 'workflow-id',
        selectedNode: dummyNode,
        selectedPortIndex: 0
    };

    afterEach(() => {
        getPortViewMock.mockReset();
    });

    const doMount = () => mount(PortViewLoader, { propsData });
    
    it('should load port view on mount', () => {
        doMount();

        expect(getPortViewMock).toBeCalledWith(expect.objectContaining({
            projectId: propsData.projectId,
            workflowId: propsData.workflowId,
            nodeId: propsData.selectedNode.id,
            portIndex: propsData.selectedPortIndex
        }));
    });

    it('should load port view when the selected node changes', async () => {
        const wrapper = doMount();
        const newNode = { ...dummyNode, id: 'node2' };
        
        wrapper.setProps({ selectedNode: newNode });

        await Vue.nextTick();

        expect(getPortViewMock).toBeCalledTimes(2);
        expect(getPortViewMock).toBeCalledWith(expect.objectContaining({
            nodeId: 'node2'
        }));
    });

    it('should load port view when the selected port index changes', async () => {
        const wrapper = doMount();
        
        wrapper.setProps({ selectedPortIndex: 1 });

        await Vue.nextTick();
        await Vue.nextTick();

        expect(getPortViewMock).toBeCalledTimes(2);
        expect(getPortViewMock).toBeCalledWith(expect.objectContaining({
            portIndex: 1
        }));
    });

    it('should emit the port view state', async () => {
        setupGetPortViewMock(RESOURCE_TYPES.VUE_COMPONENT_REFERENCE, 'FlowVariablePortView', []);
        const wrapper = doMount();

        expect(wrapper.emitted('state-change')[0][0]).toEqual({ state: 'loading' });
        
        await flushPromise();

        expect(wrapper.emitted('state-change')[1][0]).toEqual({ state: 'ready' });
    });

    it('should load views for component reference', async () => {
        setupGetPortViewMock(RESOURCE_TYPES.VUE_COMPONENT_REFERENCE, 'FlowVariablePortView', []);
        const wrapper = doMount();

        await flushPromise();
        
        expect(wrapper.findComponent(FlowVariablePortView).exists()).toBe(true);
    });

    it('should load views for component libraries', async () => {
        const mockComponentId = 'mock-component';
        
        const localVue = createLocalVue();
        const MockComponent = localVue.component('MockComponent', { template: '<div></div>' });

        loadComponentLibrary.mockImplementation(() => {
            window[mockComponentId] = MockComponent;
        });

        setupGetPortViewMock(RESOURCE_TYPES.VUE_COMPONENT_LIB, mockComponentId, {});

        const wrapper = mount(PortViewLoader, {
            propsData,
            localVue
        });
        
        await flushPromise();

        expect(loadComponentLibrary).toHaveBeenCalled();
        expect(wrapper.findComponent(MockComponent).exists()).toBe(true);
        expect(KnimeService).toHaveBeenCalled();
    });

    it('handles an error when the portView call fails', async () => {
        const error = new Error('API_ERROR');
        getPortViewMock.mockRejectedValue(error);

        const wrapper = doMount();

        await flushPromise();

        expect(wrapper.emitted('state-change')[1][0]).toEqual({ state: 'error', message: error });
        expect(wrapper.isEmpty()).toBe(true);
    });
    
    it('passes properties to port view / sets unique key', async () => {
        setupGetPortViewMock(RESOURCE_TYPES.VUE_COMPONENT_REFERENCE, 'FlowVariablePortView', []);
        
        const wrapper = doMount();

        await flushPromise();

        const portView = wrapper.findComponent(FlowVariablePortView);

        expect(portView.props()).toStrictEqual({
            projectId: 'project-id',
            workflowId: 'workflow-id',
            nodeId: 'node1',
            portIndex: 0,
            initialData: []
        });
    });
});
