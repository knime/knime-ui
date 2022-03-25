/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';
import ArrowDown from '~/webapps-common/ui/assets/img/icons/arrow-down.svg?inline';
import WorkflowEmpty from '~/components/workflow/WorkflowEmpty';


describe('WorkflowEmpty', () => {
    let mocks, doShallowMount, wrapper, $store, storeConfig, canvasSizeMock;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    canvasSizeMock = {
        width: 100,
        height: 100
    };

    beforeEach(() => {
        wrapper = null;

        storeConfig = {
            canvas: {
                getters: {
                    canvasSize() {
                        return canvasSizeMock;
                    }
                }
            }
        };

        $store = mockVuexStore(storeConfig);

        mocks = { $store };
        doShallowMount = () => {
            wrapper = shallowMount(WorkflowEmpty, { mocks });
        };
    });

    it('renders', () => {
        doShallowMount();

        expect(wrapper.find('rect').exists()).toBe(true);
        expect(wrapper.findComponent(ArrowDown).exists()).toBe(true);
        expect(wrapper.find('.text').exists()).toBe(true);
    });

    it('renders text', () => {
        doShallowMount();

        expect(wrapper.find('text').text()).toContain('Start building your workflow by');
        expect(wrapper.find('tspan').text()).toContain('dropping your nodes here.');
    });

    it('calculates width and height of rect based on size of the canvas', () => {
        doShallowMount();

        const border = wrapper.find('rect');
        const height = border.attributes().height;
        const width = border.attributes().width;

        expect(height).toBe('52');
        expect(width).toBe('52');
    });

    it('changes width and height if canvas changes', () => {
        canvasSizeMock = {
            width: 500,
            height: 1000
        };
        doShallowMount();

        const border = wrapper.find('rect');
        const height = border.attributes().height;
        const width = border.attributes().width;

        expect(height).toBe('952');
        expect(width).toBe('452');
    });
});
