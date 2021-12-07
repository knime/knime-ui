import Vuex from 'vuex';

import NodeSelectionPlane from '~/components/workflow/NodeSelectionPlane';
import { createLocalVue, shallowMount } from '@vue/test-utils';

import * as $shapes from '~/style/shapes';
import * as $colors from '~/style/colors';

describe('NodeSlectionPlane.vue', () => {
    let propsData, commonPlane;

    commonPlane = {
        position: {
            x: 50,
            y: 50
        },
        kind: 'node'
    };

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    let doShallowMount = (propsData = {}) => shallowMount(NodeSelectionPlane, {
        propsData,
        mocks: {
            $shapes,
            $colors
        }
    });

    beforeEach(() => {
        propsData = { ...commonPlane };
    });

    it('sets position of the selection plane', () => {
        let wrapper = doShallowMount(propsData);
        expect(wrapper.findComponent(NodeSelectionPlane).props()).toStrictEqual({
            kind: 'node',
            position: {
                x: 50,
                y: 50
            }
        });
    });

    it('renders component', () => {
        let wrapper = doShallowMount(propsData);
        expect(wrapper.findComponent(NodeSelectionPlane).exists()).toBe(true);
    });

    it('checks node measures with status bar', () => {
        let wrapper = doShallowMount(propsData);
        expect(wrapper.vm.nodeSelectionMeasures).toStrictEqual({ height: 95, width: 100, x: -34, y: -37 });
    });

    it('checks node measures without status bar', () => {
        propsData.kind = 'metanode';
        let wrapper = doShallowMount(propsData);
        expect(wrapper.vm.nodeSelectionMeasures).toStrictEqual({ height: 75, width: 100, x: -34, y: -37 });
    });
});
