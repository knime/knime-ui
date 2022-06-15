/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';
import Vue from 'vue';
import ConnectorLabel from '~/components/workflow/ConnectorLabel';

jest.mock('~api', () => {
}, { virtual: true });

describe('ConnectorLabel.vue', () => {
    let propsData, mocks, $store;

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
        let doMount, wrapper, isNodeSelectedMock;

        beforeEach(() => {
            isNodeSelectedMock = jest.fn().mockReturnValue(() => false);
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
                        movePreviewDelta: { x: 0, y: 0 }
                    },
                    mutations: {
                        setState(state, update = {}) {
                            Object.entries(update).forEach(([key, value]) => {
                                state[key] = value;
                            });
                        }
                    }
                },
                selection: {
                    getters: {
                        isNodeSelected: () => isNodeSelectedMock
                    }
                }
            });

            doMount = () => {
                mocks = { $store };
                wrapper = shallowMount(ConnectorLabel, { propsData, mocks });
            };
        });

        it('checks that a streaming label is present', () => {
            propsData.label = '10';
            doMount();

            expect(wrapper.find('.streamingLabel').exists()).toBe(true);
        });

        it('moving node moves label', async () => {
            propsData.label = '10';
            doMount();

            const initialPosition = wrapper.find('foreignObject').attributes().transform;
            expect(initialPosition).toBe('translate(-480.25,-33.25)');

            isNodeSelectedMock.mockReturnValue(nodeId => ({ 'root:1': true, 'root:2': true }[nodeId]));
            $store.commit('workflow/setState', {
                isDragging: true,
                movePreviewDelta: { x: 200, y: 200 }
            });
            await Vue.nextTick();

            const endPosition = wrapper.find('foreignObject').attributes().transform;

            expect(endPosition).toContain('translate');
            expect(endPosition).not.toBe('translate(-480.25,-33.25)');
        });

        it('dragging not connected node does not move label', async () => {
            propsData.label = '10';
            doMount();

            const initialPosition = wrapper.find('foreignObject').attributes().transform;
            expect(initialPosition).toBe('translate(-480.25,-33.25)');

            isNodeSelectedMock.mockReturnValue(false);
            $store.commit('workflow/setState', {
                isDragging: true,
                movePreviewDelta: { x: 200, y: 200 }
            });
            await Vue.nextTick();

            const endPosition = wrapper.find('foreignObject').attributes().transform;

            expect(endPosition).toContain('translate');
            expect(endPosition).toBe('translate(-480.25,-33.25)');
        });
    });
});
