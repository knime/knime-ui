import Vuex from 'vuex';

import NodeSelectionPlane from '~knime-ui/components/workflow/NodeSelectionPlane';
import { createLocalVue, shallowMount } from '@vue/test-utils';

import * as $shapes from '~knime-ui/style/shapes';
import * as $colors from '~knime-ui/style/colors';

describe('NodeSlectionPlane.vue', () => {
    let propsData, commonPlane;

    commonPlane = {
        width: 0,
        extraHeight: 20,
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
            width: 0,
            extraHeight: 20,
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
        expect(wrapper.vm.nodeSelectionMeasures).toStrictEqual({ height: 97, width: 100, x: -34, y: -39 });
    });

    it('honors width setting if its bigger then the default width', () => {
        propsData.width = 120;
        let wrapper = doShallowMount(propsData);
        expect(wrapper.vm.nodeSelectionMeasures).toStrictEqual({ height: 97, width: 120, x: -44, y: -39 });
    });

    it('honors extraHeight', () => {
        propsData.extraHeight = 44;
        let wrapper = doShallowMount(propsData);
        expect(wrapper.vm.nodeSelectionMeasures).toStrictEqual({ height: 121, width: 100, x: -34, y: -63 });
    });

    it('checks node measures without status bar', () => {
        propsData.kind = 'metanode';
        let wrapper = doShallowMount(propsData);
        expect(wrapper.vm.nodeSelectionMeasures).toStrictEqual({ height: 77, width: 100, x: -34, y: -39 });
    });
});
