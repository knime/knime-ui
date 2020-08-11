import NodeTorso from '~/components/NodeTorso';
import NodeTorsoMissing from '~/components/NodeTorsoMissing';
import NodeTorsoUnknown from '~/components/NodeTorsoUnknown';
import NodeTorsoMetanode from '~/components/NodeTorsoMetanode';
import { shallowMount } from '@vue/test-utils';

import * as $shapes from '~/style/shapes';
import * as $colors from '~/style/colors';

describe('NodeTorso.vue', () => {

    let doShallowMount = propsData => shallowMount(NodeTorso, {
        propsData,
        mocks: { $shapes, $colors }
    });

    it('sets background color', () => {
        let wrapper = doShallowMount({
            type: 'Manipulator',
            kind: 'node'
        });
        expect(wrapper.find('.bg').attributes().fill).toBe('#ffd800');
    });

    it('colors unknown node type', () => {
        let wrapper = doShallowMount({
            type: 'unknown',
            kind: 'node'
        });
        expect(wrapper.find('.bg').attributes().fill).toBe($colors.nodeBackgroundColors.default);
    });

    it('renders metanodes', () => {
        let wrapper = doShallowMount({
            kind: 'metanode'
        });
        expect(wrapper.findComponent(NodeTorsoMetanode).exists()).toBeTruthy();
    });

    it('renders metanodes', () => {
        let wrapper = doShallowMount({
            kind: 'metanode'
        });
        expect(wrapper.findComponent(NodeTorsoMetanode).exists()).toBeTruthy();
    });

    it('renders missing nodes', () => {
        let wrapper = doShallowMount({
            type: 'Missing'
        });
        expect(wrapper.findComponent(NodeTorsoMissing).exists()).toBeTruthy();
    });

    it('renders buggy nodes (during development)', () => {
        let wrapper = doShallowMount({
            type: 'Unknown'
        });
        expect(wrapper.findComponent(NodeTorsoUnknown).exists()).toBeTruthy();
    });

    const nodeTypeCases = Object.entries($colors.nodeBackgroundColors);
    it.each(nodeTypeCases)('renders node category "%s" as color "%s"', (type, color) => {
        let wrapper = doShallowMount({
            type,
            kind: 'node'
        });
        expect(wrapper.find('.bg').attributes().fill).toBe(color);
    });
});
