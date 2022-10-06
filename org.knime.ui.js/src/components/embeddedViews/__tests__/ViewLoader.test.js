import Vue from 'vue';
import { mount } from '@vue/test-utils';

import { loadComponentLibrary } from '@/util/loadComponentLibrary';
import FlowVariablePortView from '@/components/output/FlowVariablePortView.vue';
import ViewLoader from '../ViewLoader.vue';

jest.mock('@/util/loadComponentLibrary', () => ({
    loadComponentLibrary: jest.fn()
}));

describe('ViewLoader.vue', () => {
    const flushRender = () => new Promise(r => setTimeout(r, 0));

    const setupDynamicMockComponent = ({ initialData, componentName = 'MockComponent' } = {}) => {
        const MockComponent = Vue.component(componentName, {
            props: {
                initialData: {
                    type: Object,
                    default: () => ({})
                }
            },
            render(h) {
                return h('div');
            }
        });

        const viewConfigLoaderFn = jest.fn(() => ({
            resourceInfo: {
                type: 'VUE_COMPONENT_LIB',
                id: 'MockComponent'
            },
            initialData: initialData || JSON.stringify({ result: {} })
        }));

        loadComponentLibrary.mockImplementation(() => MockComponent);
        return { MockComponent, viewConfigLoaderFn };
    };

    const doMount = (props = {}) => {
        const defaultProps = {
            renderKey: '123',
            viewConfigLoaderFn: jest.fn(),
            initKnimeService: jest.fn(),
            resourceLocationResolver: jest.fn()
        };

        return mount(ViewLoader, {
            propsData: {
                ...defaultProps,
                ...props
            }
        });
    };

    afterEach(() => {
        jest.clearAllMocks();
    });

    it.each([
        ['load view', true],
        ['not load view', false]
    ])('should %s on mount when the `loadOnMount` prop is set to %s', (testType, loadOnMount) => {
        const viewConfigLoaderFn = jest.fn();
        doMount({ viewConfigLoaderFn, loadOnMount });

        if (testType.includes('not')) {
            expect(viewConfigLoaderFn).not.toHaveBeenCalled();
        } else {
            expect(viewConfigLoaderFn).toHaveBeenCalled();
        }
    });

    it('should reload view when renderKey changes', async () => {
        const viewConfigLoaderFn = jest.fn();
        const wrapper = doMount({ viewConfigLoaderFn, loadOnMount: false });
         
        await wrapper.setProps({ renderKey: 'changed' });
        expect(viewConfigLoaderFn).toHaveBeenCalled();
    });

    it('should render the dynamic view component', async () => {
        const { MockComponent, viewConfigLoaderFn } = setupDynamicMockComponent({
            initialData: JSON.stringify({ result: { myProp: 'mock-prop' } })
        });

        const wrapper = doMount({ viewConfigLoaderFn });
        
        await flushRender();

        expect(loadComponentLibrary).toHaveBeenCalled();
        expect(wrapper.findComponent(MockComponent).exists()).toBe(true);
        expect(wrapper.findComponent(MockComponent).props('initialData')).toEqual({ myProp: 'mock-prop' });
    });

    it('should emit state:ready when the component is loaded successfully', async () => {
        const { viewConfigLoaderFn } = setupDynamicMockComponent();

        const wrapper = doMount({ viewConfigLoaderFn });
        
        expect(wrapper.emitted('state-change')[0][0]).toEqual({ state: 'loading' });
        
        await flushRender();
        
        expect(wrapper.emitted('state-change')[1][0]).toEqual({ state: 'ready' });
    });

    it('should emit state:error when an error occurs while loading the component', async () => {
        const error = new Error('Error loading');
        const viewConfigLoaderFn = jest.fn(() => {
            throw error;
        });
        const wrapper = doMount({ viewConfigLoaderFn });
        
        expect(wrapper.emitted('state-change')[0][0]).toEqual({ state: 'loading' });
        
        await flushRender();

        expect(wrapper.emitted('state-change')[1][0]).toEqual({
            state: 'error',
            message: error
        });
    });

    it('should call initKnimeService', async () => {
        const { viewConfigLoaderFn } = setupDynamicMockComponent();

        const initKnimeService = jest.fn(() => ({ mockService: true }));

        const wrapper = doMount({ viewConfigLoaderFn, initKnimeService });

        await flushRender();

        expect(initKnimeService).toHaveBeenCalled();
        expect(wrapper.vm.getKnimeService()).toEqual({ mockService: true });
    });

    it('should use the resourceLocationResolver', async () => {
        const { viewConfigLoaderFn } = setupDynamicMockComponent();

        const resourceLocationResolver = jest.fn(() => 'dummy-location');

        doMount({ viewConfigLoaderFn, resourceLocationResolver });

        await flushRender();

        expect(resourceLocationResolver).toHaveBeenCalled();
        expect(loadComponentLibrary).toHaveBeenCalledWith(
            expect.objectContaining({ resourceLocation: 'dummy-location' })
        );
    });

    it('should override component name', async () => {
        const { viewConfigLoaderFn } = setupDynamicMockComponent({ componentName: 'OtherComponent' });

        const wrapper = doMount({ viewConfigLoaderFn, overrideComponentName: 'OtherComponent' });

        await flushRender();

        expect(wrapper.findComponent({ name: 'MockComponent' }).exists()).toBe(false);
        expect(wrapper.findComponent({ name: 'OtherComponent' }).exists()).toBe(true);
    });

    it('should load views for component reference', async () => {
        const viewConfigLoaderFn = jest.fn(() => ({
            resourceInfo: {
                id: 'FlowVariablePortView',
                type: 'VUE_COMPONENT_REFERENCE'
            },
            initialData: JSON.stringify({ result: [] })
        }));
        const wrapper = doMount({ viewConfigLoaderFn });

        await flushRender();
        
        expect(wrapper.findComponent(FlowVariablePortView).exists()).toBe(true);
    });
});
