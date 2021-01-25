import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';

import * as $shapes from '~/style/shapes';
import * as canvasStoreConfig from '~/store/canvas';

import MetaNodePortBars from '~/components/MetaNodePortBars';
import MetaNodePortBar from '~/components/MetaNodePortBar';

describe('MetaNodePortBars.vue', () => {
    let propsData, mocks, doShallowMount, wrapper, $store, activeWorkflow;
    const top = 107;
    const extendedBoundsTop = 5;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        activeWorkflow = {};
        wrapper = null;
        propsData = {};
        $store = mockVuexStore({
            workflow: {
                state: {
                    activeWorkflow
                },
                getters: {
                    workflowBounds() {
                        return {
                            left: 0,
                            width: 500,
                            top
                        };
                    }
                }
            },
            canvas: {
                getters: {
                    contentBounds() {
                        return {
                            top: extendedBoundsTop
                        };
                    }
                }
            }
        });

        mocks = { $store, $shapes };
        doShallowMount = () => {
            wrapper = shallowMount(MetaNodePortBars, { propsData, mocks });
        };
    });

    it('renders nothing if workflow has no ports', () => {
        doShallowMount();
        expect(wrapper.findAllComponents(MetaNodePortBar).length).toBe(0);
    });

    it.each([
        ['input', 'in', 'In'],
        ['output', 'out', 'Out']
    ])('renders one bar if workflow has %s ports only', (_, type, typeUppercased) => {
        let dummy = {};
        activeWorkflow[`meta${typeUppercased}Ports`] = {
            ports: [dummy]
        };
        doShallowMount();
        expect(wrapper.findAllComponents(MetaNodePortBar).length).toBe(1);
        let bar = wrapper.findAllComponents(MetaNodePortBar).at(0);

        expect(bar.props('type')).toBe(type);
        expect(bar.props('y')).toBe(extendedBoundsTop);
        expect(bar.props('ports')).toEqual([dummy]);
    });

    it('renders two bars if workflow has both input and output ports', () => {
        let dummy = {};
        activeWorkflow.metaInPorts = {
            ports: [dummy]
        };
        activeWorkflow.metaOutPorts = {
            ports: [dummy, dummy]
        };
        doShallowMount();
        expect(wrapper.findAllComponents(MetaNodePortBar).length).toBe(2);
        let inBar = wrapper.findAllComponents(MetaNodePortBar).at(0);
        expect(inBar.props('type')).toBe('in');
        expect(inBar.props('y')).toBe(extendedBoundsTop);
        expect(inBar.props('ports')).toEqual([dummy]);
        let outBar = wrapper.findAllComponents(MetaNodePortBar).at(1);
        expect(outBar.props('type')).toBe('out');
        expect(outBar.props('y')).toBe(extendedBoundsTop);
        expect(outBar.props('ports')).toEqual([dummy, dummy]);
    });
});
