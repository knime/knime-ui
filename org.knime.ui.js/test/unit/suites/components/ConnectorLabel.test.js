/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';
import ConnectorLabel from '~/components/ConnectorLabel';

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
        beforeEach(() => {

            $store = mockVuexStore({
                workflow: {
                    state: {
                        activeWorkflow: {
                            nodes: {
                                'root:1': { position: { x: 0, y: 0 }, outPorts: [] },
                                'root:2': { position: { x: 12, y: 14 }, inPorts: [] }
                            }
                        }
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
    });
});
