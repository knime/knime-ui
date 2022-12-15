import Vuex from 'vuex';
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '@/test/test-utils';

import * as $shapes from '@/style/shapes.mjs';

import NodeLabelText from '../NodeLabelText.vue';

describe('NodeLabelText.vue', () => {
    let singleSelectedNode;

    let propsData = {
        value: 'test',
        nodePosition: { x: 15, y: 13 },
        nodeId: 'root:1',
        kind: 'node'
    };

    const doShallowMount = () => {
        const storeConfig = {
            selection: {
                getters: {
                    singleSelectedNode() {
                        return singleSelectedNode;
                    }
                }
            }
        };

        const $store = mockVuexStore(storeConfig);
        const wrapper = shallowMount(NodeLabelText, {
            propsData,
            mocks: { $shapes, $store }
        });

        return wrapper;
    };

    beforeAll(() => {
        singleSelectedNode = { id: 'root:2' };
        const localVue = createLocalVue();
        localVue.use(Vuex);

        Object.defineProperty(document, 'fonts', {
            value: { ready: Promise.resolve() }
        });
    });

    it('should emit a request edit event', () => {
        const wrapper = doShallowMount();
        wrapper.find('.node-label').trigger('dblclick');

        expect(wrapper.emitted('request-edit')).toBeDefined();
    });

    it('should emit a contextmenu event', () => {
        const wrapper = doShallowMount();

        expect(wrapper.emitted('contextmenu')).toBeUndefined();

        wrapper.find('.node-label').trigger('contextmenu');

        expect(wrapper.emitted('contextmenu')).toBeDefined();
    });

    it('should show placeholder text if node is selected and does not have value', () => {
        singleSelectedNode = { id: 'root:1' };
        propsData = {
            value: '',
            nodePosition: { x: 15, y: 13 },
            nodeId: 'root:1',
            kind: 'node'
        };
        const wrapper = doShallowMount();
        const text = wrapper.find('.text');

        expect(text.text()).toBe('Node label');
    });
});
