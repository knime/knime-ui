import Vuex from 'vuex';

import NodeSelectionPlane from '~/components/NodeSelectionPlane';
import { createLocalVue, shallowMount } from '@vue/test-utils';

import * as $shapes from '~/style/shapes';
import * as $colors from '~/style/colors';

describe('NodeSlectionPlane.vue', () => {

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

    it('sets position of the selection plane', () => {
        let wrapper = doShallowMount({
            position: {
                x: 50,
                y: 50
            },
            kind: 'node'
        });
        expect(wrapper.findComponent(NodeSelectionPlane).props()).toStrictEqual({
            position: {
                x: 50,
                y: 50
            },
            kind: 'node'
        });
    });

    it('renders component', () => {
        let wrapper = doShallowMount({
            position: {
                x: 50,
                y: 50
            }
        });
        expect(wrapper.findComponent(NodeSelectionPlane).exists()).toBe(true);
    });

    it('checks node measures with status bar', () => {
        let wrapper = doShallowMount({
            position: {
                x: 50,
                y: 50
            }
        });
        expect(wrapper.vm.nodeSelectionMeasures).toStrictEqual({ height: 95, width: 100, x: -34, y: -37 });
    });

    it('checks node measures without status bar', () => {
        let wrapper = doShallowMount({
            position: {
                x: 50,
                y: 50
            },
            kind: 'metanode'
        });
        expect(wrapper.vm.nodeSelectionMeasures).toStrictEqual({ height: 75, width: 100, x: -34, y: -37 });
    });
});
