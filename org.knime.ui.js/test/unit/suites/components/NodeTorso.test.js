import Vuex from 'vuex';

import NodeTorso from '~/components/NodeTorso';
import NodeTorsoMissing from '~/components/NodeTorsoMissing';
import NodeTorsoUnknown from '~/components/NodeTorsoUnknown';
import NodeTorsoMetanode from '~/components/NodeTorsoMetanode';
import NodeTorsoNormal from '~/webapps-common/ui/components/node/NodeTorsoNormal';
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';

import * as $shapes from '~/style/shapes';
import * as $colors from '~/style/colors';

describe('NodeTorso.vue', () => {

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    let doShallowMount = (propsData, { writable = true } = {}) => {
        let $store = mockVuexStore({
            workflow: {
                getters: {
                    isWritable() {
                        return writable;
                    }
                }
            }
        });
        return shallowMount(NodeTorso, {
            propsData,
            mocks: {
                $shapes,
                $colors,
                $store
            }
        });
    };

    it('sets background color', () => {
        let wrapper = doShallowMount({
            kind: 'node',
            type: 'Sink',
            icon: 'data:image/icon'
        });
        expect(wrapper.findComponent(NodeTorsoNormal).props()).toStrictEqual({
            type: 'Sink',
            isComponent: false,
            icon: 'data:image/icon'
        });
    });

    it('renders component', () => {
        let wrapper = doShallowMount({
            kind: 'component',
            type: 'Sink',
            icon: 'data:image/icon'
        });
        expect(wrapper.findComponent(NodeTorsoNormal).props()).toStrictEqual({
            type: 'Sink',
            isComponent: true,
            icon: 'data:image/icon'
        });
        expect(wrapper.find('.grabbable').exists()).toBe(true);
    });

    it('renders metanodes', () => {
        let wrapper = doShallowMount({
            kind: 'metanode'
        });
        expect(wrapper.findComponent(NodeTorsoMetanode).exists()).toBeTruthy();
        expect(wrapper.find('.grabbable').exists()).toBe(true);
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
        expect(wrapper.findComponent(NodeTorsoNormal).exists()).toBeFalsy();
    });

    it.each(['node', 'component'])('renders buggy %ss (during development)', (type) => {
        let wrapper = doShallowMount({
            type: 'Unknown',
            kind: type
        });
        expect(wrapper.findComponent(NodeTorsoUnknown).exists()).toBeTruthy();
        expect(wrapper.findComponent(NodeTorsoNormal).exists()).toBeFalsy();
    });

    it.each(['node', 'metanode', 'component'])('no grab cursor if write-protected %s', (kind) => {
        let wrapper = doShallowMount({
            kind
        }, { writable: false });
        expect(wrapper.find('.grabbable').exists()).toBe(false);
    });
});
