import { createLocalVue, mount, shallowMount } from '@vue/test-utils';
import OutputPortSelectorBar from '~/components/output/OutputPortSelectorBar';
import TabBar from '~/webapps-common/ui/components/TabBar';
import Vue from 'vue';
import Vuex from 'vuex';
import { mockVuexStore } from '~/test/unit/test-utils';

import * as $colors from '~/style/colors';
import * as $shapes from '~/style/shapes';


describe('OutputPortSelectorBar.vue', () => {

    describe('renders tabs', () => {
        let fixtures = {
            'not executed': {
                node: {
                    outPorts: [{
                        type: 'flowVariable',
                        index: 0,
                        name: 'foo'
                    }, {
                        type: 'table',
                        index: 1,
                        name: 'bar'
                    }, {
                        type: 'foo',
                        index: 2,
                        name: 'baz'
                    }]
                },
                expected: [{
                    value: '1',
                    disabled: true,
                    label: '1: bar',
                    title: 'No output data'
                }, {
                    value: '2',
                    disabled: true,
                    label: '2: baz',
                    title: 'Unsupported data type'
                }, {
                    value: '0',
                    disabled: false,
                    label: 'Flow Variables',
                    title: null
                }]
            },
            executed: {
                node: {
                    state: {
                        executionState: 'EXECUTED'
                    },
                    outPorts: [{
                        type: 'flowVariable',
                        index: 0,
                        name: 'foo'
                    }, {
                        type: 'table',
                        index: 1,
                        name: 'bar'
                    }, {
                        type: 'foo',
                        index: 2,
                        name: 'baz'
                    }]
                },
                expected: [{
                    value: '1',
                    disabled: false,
                    label: '1: bar',
                    title: null
                }, {
                    value: '2',
                    disabled: true,
                    label: '2: baz',
                    title: 'Unsupported data type'
                }, {
                    value: '0',
                    disabled: false,
                    label: 'Flow Variables',
                    title: null
                }]
            },
            'inactive ports': {
                node: {
                    state: {
                        executionState: 'EXECUTED'
                    },
                    outPorts: [{
                        type: 'flowVariable',
                        index: 0,
                        name: 'foo'
                    }, {
                        type: 'table',
                        index: 1,
                        name: 'bar',
                        inactive: true
                    }, {
                        type: 'table',
                        index: 2,
                        name: 'baz',
                        inactive: true
                    }, {
                        type: 'table',
                        index: 3,
                        name: 'qux'
                    }]
                },
                expected: [{
                    value: '1',
                    disabled: true,
                    label: '1: bar',
                    title: 'No output data'
                }, {
                    value: '2',
                    disabled: true,
                    label: '2: baz',
                    title: 'No output data'
                }, {
                    value: '3',
                    disabled: false,
                    label: '3: qux',
                    title: null
                }, {
                    value: '0',
                    disabled: false,
                    label: 'Flow Variables',
                    title: null
                }]
            },
            'metanode not executed': {
                node: {
                    kind: 'metanode',
                    outPorts: [{
                        type: 'flowVariable',
                        index: 0,
                        name: 'foo'
                    }, {
                        type: 'table',
                        index: 1,
                        name: 'bar'
                    }, {
                        type: 'foo',
                        index: 2,
                        name: 'baz'
                    }]
                },
                expected: [{
                    disabled: true,
                    label: '1: foo',
                    title: 'No output data',
                    value: '0'
                }, {
                    disabled: true,
                    label: '2: bar',
                    title: 'No output data',
                    value: '1'
                }, {
                    disabled: true,
                    label: '3: baz',
                    title: 'Unsupported data type',
                    value: '2'
                }]
            },
            'metanode executed': {
                node: {
                    kind: 'metanode',
                    outPorts: [{
                        type: 'flowVariable',
                        index: 0,
                        name: 'foo',
                        nodeState: 'EXECUTED'
                    }, {
                        type: 'table',
                        index: 1,
                        name: 'bar',
                        nodeState: 'EXECUTED'
                    }, {
                        type: 'table',
                        index: 2,
                        name: 'baz',
                        nodeState: 'EXECUTED'
                    }]
                },
                expected: [{
                    disabled: false,
                    label: '1: foo',
                    title: null,
                    value: '0'
                }, {
                    disabled: false,
                    label: '2: bar',
                    title: null,
                    value: '1'
                }, {
                    disabled: false,
                    label: '3: baz',
                    title: null,
                    value: '2'
                }]
            }
        };

        it.each(Object.entries(fixtures))('%s', (description, { node, expected }) => {

            let wrapper = shallowMount(OutputPortSelectorBar, {
                propsData: { node }
            });
            let tabConfig = wrapper.findComponent(TabBar).props('possibleValues');
            expect(tabConfig).toStrictEqual(expected.map(x => ({ ...x, icon: expect.anything() })));
        });
    });

    it('emits events', async () => {
        let wrapper = mount(OutputPortSelectorBar, {
            mocks: { $colors, $shapes },
            propsData: {
                node: {
                    state: {
                        executionState: 'EXECUTED'
                    },
                    outPorts: [{
                        type: 'flowVariable',
                        index: 0
                    }, {
                        type: 'table',
                        index: 1
                    }]
                }
            }
        });
        await Vue.nextTick();
        expect(wrapper.emitted().input).toStrictEqual([['1']]);
    });

    it('handles node changes', async () => {
        let wrapper = shallowMount(OutputPortSelectorBar, {
            propsData: {
                node: {
                    state: {
                        executionState: 'EXECUTED'
                    },
                    outPorts: [{
                        type: 'flowVariable',
                        index: 0
                    }, {
                        type: 'table',
                        index: 1
                    }]
                }
            }
        });

        await Vue.nextTick();

        wrapper.setProps({
            node: {
                state: {
                    executionState: 'EXECUTED'
                },
                outPorts: [{
                    type: 'flowVariable',
                    index: 0
                }, {
                    type: 'table',
                    index: 1,
                    inactive: true
                }, {
                    type: 'table',
                    index: 2

                }]
            }
        });

        await Vue.nextTick();

        wrapper.setProps({
            node: {
                outPorts: [{
                    type: 'flowVariable',
                    index: 0
                }, {
                    type: 'table',
                    index: 1,
                    inactive: true
                }, {
                    type: 'table',
                    index: 2

                }]
            }
        });

        await Vue.nextTick();
        expect(wrapper.emitted().input).toStrictEqual([['1'], ['2'], ['0']]);

    });


    describe('execution state changes', () => {
        let node, store, doShallowMount, wrapper;

        beforeAll(() => {
            createLocalVue().use(Vuex);
        });

        beforeEach(() => {
            node = {
                state: {
                    executionState: 'QUEUED'
                },
                outPorts: [{
                    type: 'flowVariable',
                    index: 0
                }, {
                    type: 'table',
                    index: 1
                }]
            };

            doShallowMount = async () => {
                // We need a mocked store here in order to get reactivity
                // (cf. https://forum.vuejs.org/t/vue-test-utils-watchers-on-object-properties-not-triggered/50900)
                store = mockVuexStore({
                    dummy: {
                        state: {
                            nodeInStore: node
                        },
                        mutations: {
                            setExecutionState({ nodeInStore }, executionState) {
                                nodeInStore.state.executionState = executionState;
                            },
                            setPortExecutionState({ nodeInStore }, { portIndex, executionState }) {
                                Vue.set(nodeInStore.outPorts[portIndex], 'nodeState', executionState);

                            }
                        }
                    }
                });
                wrapper = shallowMount(OutputPortSelectorBar, {
                    propsData: {
                        node: store.state.dummy.nodeInStore
                    }
                });
                await Vue.nextTick();
            };

        });


        it('handles execution state changes on normal nodes', async () => {

            await doShallowMount();

            expect(wrapper.vm.activeTab).toBe('0');

            store.commit('dummy/setExecutionState', 'EXECUTED');

            await Vue.nextTick();

            expect(wrapper.vm.activeTab).toStrictEqual('1');

        });

        it('handles execution state changes on metanodes', async () => {

            node = {
                kind: 'metanode',
                outPorts: [{
                    nodeState: 'QUEUED',
                    type: 'table',
                    index: 0
                }, {
                    nodeState: 'EXECUTING',
                    type: 'table',
                    index: 1
                }, {
                    nodeState: 'IDLE',
                    type: 'table',
                    index: 2
                }, {
                    nodeState: 'IDLE',
                    type: 'table',
                    index: 3
                }]
            };

            await doShallowMount();

            expect(wrapper.vm.activeTab).toBe(null);
            store.commit('dummy/setPortExecutionState', { portIndex: 2, executionState: 'EXECUTED' });
            await Vue.nextTick();
            expect(wrapper.vm.activeTab).toStrictEqual('2');
            store.commit('dummy/setPortExecutionState', { portIndex: 1, executionState: 'EXECUTED' });
            await Vue.nextTick();
            expect(wrapper.vm.activeTab).toStrictEqual('2');

        });
    });
});
