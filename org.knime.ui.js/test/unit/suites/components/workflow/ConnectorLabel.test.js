/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';
import Vue from 'vue';
import ConnectorLabel from '~/components/workflow/ConnectorLabel';

jest.mock('~api', () => {
}, { virtual: true });

describe('ConnectorLabel.vue', () => {
    let propsData, mocks, wrapper, $store;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        propsData = {
            sourceNode: 'root:1',
            destNode: 'root:2',
            sourcePort: 0,
            destPort: 2
        };
    });

    describe('Check label creation', () => {
        let isDragging, deltaMovePosition;

        beforeEach(() => {
            deltaMovePosition = {};
            $store = mockVuexStore({
                workflow: {
                    state: {
                        activeWorkflow: {
                            nodes: {
                                'root:1': { position: { x: 0, y: 0 }, outPorts: [] },
                                'root:2': { position: { x: 12, y: 14 }, inPorts: [] }
                            }
                        },
                        isDragging: false,
                        deltaMovePosition
                    },
                    mutations: {
                        setDragging(state, { isDragging }) {
                            state.isDragging = isDragging;
                        }
                    }
                },
                selection: {
                    getters: {
                        // isNodeSelected: () => jest.fn()
                        isNodeSelected: () => true
                    }
                }
            });
            mocks = { $store };
            wrapper = shallowMount(ConnectorLabel, { propsData, mocks });
        });

        it('checks that a streaming label is present', () => {
            expect(wrapper.find('.streamingLabel').exists()).toBe(false);
            propsData.label = '10';
            wrapper = shallowMount(ConnectorLabel, { propsData, mocks });
            expect(wrapper.find('.streamingLabel').exists()).toBe(true);
        });

        it('moving node moves label', async () => {
            propsData.label = '10';
            $store.commit('setDragging', { isDragging: true });
            // mocks.selection.getters.isNodeSelected = () => jest.fn().mockReturnValueOnce(true);
            wrapper = shallowMount(ConnectorLabel, { propsData, mocks });
            const initialPosition = wrapper.find('foreignObject').attributes().transform;
            console.log(initialPosition);
            // wrapper.setProps({ position: { x: 200, y: 200 } });
            // await Vue.nextTick();
            deltaMovePosition = { x: 200, y: 200 };
            await Vue.nextTick();
            const endPosition = wrapper.find('foreignObject').attributes().transform;
            console.log(endPosition);
            expect(endPosition).not.toBe(initialPosition);
        });
    });
});
