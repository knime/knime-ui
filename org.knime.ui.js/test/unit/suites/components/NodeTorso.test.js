import NodeTorso from '~/components/NodeTorso';
import NodeTorsoMissing from '~/components/NodeTorsoMissing';
import NodeTorsoUnknown from '~/components/NodeTorsoUnknown';
import NodeTorsoMetanode from '~/components/NodeTorsoMetanode';
import { shallowMount } from '@vue/test-utils';

import * as $shapes from '~/style/shapes';
import * as $colors from '~/style/colors';

describe('NodeTorso.vue', () => {

    let doShallowMount = (propsData, { writeProtected } = {}) => shallowMount(NodeTorso, {
        propsData,
        mocks: { $shapes, $colors },
        provide: { writeProtected }
    });

    it('sets background color', () => {
        let wrapper = doShallowMount({
            type: 'Manipulator',
            kind: 'node'
        });
        expect(wrapper.find('.bg').attributes().fill).toBe($colors.nodeBackgroundColors.Manipulator);
        expect(wrapper.find('.grabbable').exists()).toBe(true);
    });

    it('renders metanodes', () => {
        let wrapper = doShallowMount({
            kind: 'metanode'
        });
        expect(wrapper.find('.grabbable').exists()).toBe(true);
        expect(wrapper.findComponent(NodeTorsoMetanode).exists()).toBeTruthy();
    });

    it('renders metanode state', () => {
        let wrapper = doShallowMount({
            kind: 'metanode',
            executionState: 'EXECUTED'
        });
        expect(wrapper.findComponent(NodeTorsoMetanode).props('executionState')).toBe('EXECUTED');
    });

    it.each(['node', 'component'])('renders missing %s', (kind) => {
        let wrapper = doShallowMount({
            type: 'Missing',
            kind
        });
        expect(wrapper.findComponent(NodeTorsoMissing).exists()).toBeTruthy();
    });

    it.each(['node', 'component'])('renders buggy %ss (during development)', (type) => {
        let wrapper = doShallowMount({
            type: 'Unknown',
            kind: type
        });
        expect(wrapper.findComponent(NodeTorsoUnknown).exists()).toBeTruthy();
    });

    const nodeTypeCases = Object.entries($colors.nodeBackgroundColors);
    it.each(nodeTypeCases)('renders node category "%s" as color "%s"', (type, color) => {
        let wrapper = doShallowMount({
            type,
            kind: 'node'
        });
        expect(wrapper.find('.component-bg').exists()).toBe(false);
        expect(wrapper.find('.bg').attributes().fill).toBe(color);
    });

    it('renders plain components', () => {
        let wrapper = doShallowMount({
            kind: 'component'
        });
        expect(wrapper.find('.component-bg').exists()).toBe(false);
        expect(wrapper.find('.bg').attributes().fill).toBe($colors.nodeBackgroundColors.Component);
        expect(wrapper.find('image').exists()).toBeFalsy();
        expect(wrapper.find('.grabbable').exists()).toBe(true);
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

    it('renders icon', () => {
        let wrapper = doShallowMount({
            type: 'Learner',
            kind: 'node',
            icon: 'data:image/0000'
        });
        expect(wrapper.find('image').attributes().href).toBe('data:image/0000');
    });

    it.each(['node', 'metanode', 'component'])('no grab cursor if write-protected %s', (kind) => {
        let wrapper = doShallowMount({
            kind
        }, { writeProtected: true });
        expect(wrapper.find('.grabbable').exists()).toBe(false);
    });
});
