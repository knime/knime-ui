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
            type: 'Unknown',
            kind: 'node'
        });
        expect(wrapper.findComponent(NodeTorsoUnknown).exists()).toBeTruthy();
    });

    const nodeTypeCases = Object.entries($colors.nodeBackgroundColors);
    it.each(nodeTypeCases)('renders node category "%s" as color "%s"', (type, color) => {
        let wrapper = doShallowMount({
            type,
            kind: 'node'
        });
        let bgs = wrapper.findAll('.bg');
        expect(bgs.length).toBe(1);
        expect(bgs.at(0).attributes().fill).toBe(color);
    });

    it('renders plain components', () => {
        let wrapper = doShallowMount({
            kind: 'component',
            type: 'Subnode'
        });
        let bgs = wrapper.findAll('.bg');
        expect(bgs.length).toBe(1);
        expect(bgs.at(0).attributes().fill).toBe($colors.nodeBackgroundColors.Component);
    });

    it('renders typed components', () => {
        let wrapper = doShallowMount({
            type: 'Learner',
            kind: 'component'
        });
        let bgs = wrapper.findAll('.bg');
        expect(bgs.length).toBe(2);
        expect(bgs.at(0).attributes().fill).toBe($colors.nodeBackgroundColors.Component);
        expect(bgs.at(1).attributes().fill).toBe($colors.nodeBackgroundColors.Learner);
    });
});
