import Vuex from 'vuex';
import { createLocalVue, shallowMount } from '@vue/test-utils';

import { mockVuexStore } from '@/test/test-utils/mockVuexStore';
import WorkflowEmpty from '../WorkflowEmpty.vue';

describe('WorkflowEmpty', () => {
    let mocks, doShallowMount, wrapper, $store, storeConfig, containerSize;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        containerSize = {
            width: 1000,
            height: 1000
        };

        wrapper = null;

        storeConfig = {
            canvas: {
                state: {
                    containerSize
                }
            }
        };

        $store = mockVuexStore(storeConfig);

        mocks = { $store };
        doShallowMount = () => {
            wrapper = shallowMount(WorkflowEmpty, { mocks });
        };
    });

    it('renders text', () => {
        doShallowMount();

        expect(wrapper.text()).toContain('Start building your workflow by dropping your data or nodes here.');
    });

    it('calculates width and height of rect based on size of the viewBox', () => {
        doShallowMount();

        let rectangleProps = wrapper.find('rect').attributes();
        expect(Number(rectangleProps.x)).toBe(-500 + 25);
        expect(Number(rectangleProps.y)).toBe(-500 + 25);
        expect(Number(rectangleProps.height)).toBe(1000 - 50);
        expect(Number(rectangleProps.width)).toBe(1000 - 50);
    });
});
