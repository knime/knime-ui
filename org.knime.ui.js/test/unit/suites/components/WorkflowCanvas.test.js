/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';
import Vue from 'vue';

import WorkflowCanvas from '~/components/WorkflowCanvas';
import Kanvas from '~/components/Kanvas';

describe('Kanvas', () => {
    let mocks, doShallowMount, wrapper, $store, storeConfig;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        storeConfig = {
            canvas: {
                getters: {
                    contentBounds: () => ({
                        left: 5,
                        top: 10,
                        width: 20,
                        height: 30
                    })
                },
                actions: {
                    fillScreen: jest.fn()
                }
            },
            selection: {
                actions: {
                    deselectAllObjects: jest.fn()
                }
            }
        };

        $store = mockVuexStore(storeConfig);

        mocks = { $store };
        doShallowMount = () => {
            wrapper = shallowMount(WorkflowCanvas, { mocks });
        };
    });

    it('draws workflow boundary', () => {
        doShallowMount();

        let workflowSheet = wrapper.find('.workflow-sheet');
        expect(Number(workflowSheet.attributes('x'))).toBe(5);
        expect(Number(workflowSheet.attributes('y'))).toBe(10);
        expect(Number(workflowSheet.attributes('width'))).toBe(20);
        expect(Number(workflowSheet.attributes('height'))).toBe(30);
    });

    it('zooms to fit after mounting', async () => {
        doShallowMount();
        await Vue.nextTick();

        expect(storeConfig.canvas.actions.fillScreen).toHaveBeenCalled();
    });

    it('clicking on empty canvas deselects all', () => {
        doShallowMount();
        wrapper.findComponent(Kanvas).vm.$emit('empty-pointerdown');

        expect(storeConfig.selection.actions.deselectAllObjects).toHaveBeenCalled();
    });
});
