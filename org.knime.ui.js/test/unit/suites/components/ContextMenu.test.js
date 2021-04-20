/* eslint-disable no-magic-numbers */
import { createLocalVue, mount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';
import Vue from 'vue';

import ContextMenu from '~/components/ContextMenu';

describe('ContextMenu.vue', () => {
    let storeConfig, propsData, mocks, doMount, wrapper, $store;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;
        propsData = {};

        storeConfig = {
            userActions: {
                getters: {
                    contextMenuActionItems: () => [{
                        text: 'Execute all',
                        title: 'Execute workflow',
                        hotkey: ['F3'],
                        storeAction: 'workflow/executeNodes',
                        storeActionParams: ['all'],
                        disabled: false
                    }, {
                        text: 'Reset selected',
                        title: 'Execute workflow',
                        hotkey: ['F7'],
                        storeAction: 'workflow/resetNodes',
                        storeActionParams: ['selected'],
                        disabled: true
                    }]
                }
            },
            workflow: {
                actions: {
                    executeNodes: jest.fn()
                }
            }
        };

        doMount = () => {
            $store = mockVuexStore(storeConfig);
            mocks = { $store };
            wrapper = mount(ContextMenu, { propsData, mocks });
        };
    });


    it('renders', () => {
        doMount();
        expect(wrapper.html()).toBeTruthy();
    });

    it('fires correct action based on store data', () => {
        doMount();
        wrapper.find('.clickable-item').trigger('click');
        expect(storeConfig.workflow.actions.executeNodes).toHaveBeenCalledWith(expect.anything(), 'all');
    });

    it('shows menu', async () => {
        doMount();
        expect(wrapper.find('.floatingmenu').classes()).not.toContain('isVisible');
        wrapper.vm.show({ pageX: 0, pageY: 0 });
        await Vue.nextTick();
        expect(wrapper.find('.floatingmenu').classes()).toContain('isVisible');
    });

});
