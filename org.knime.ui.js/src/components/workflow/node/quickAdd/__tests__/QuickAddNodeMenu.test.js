import { createLocalVue, shallowMount } from '@vue/test-utils';
import * as $shapes from '@/style/shapes.mjs';
import Vue from 'vue';
import { getNodeRecommendations } from '@api';

const getNodeRecommendationsResponse = [{
    inPorts: [{ typeId: 'org.knime.core.node.BufferedDataTable' }],
    outPorts: [{ typeId: 'org.knime.core.node.BufferedDataTable' }, { typeId: 'org.some.otherPorType' }],
    component: false,
    icon: 'data:image/png;base64,xxx',
    nodeFactory: { className: 'org.knime.base.node.preproc.filter.column.DataColumnSpecFilterNodeFactory' },
    name: 'Column Filter',
    id: 'org.knime.base.node.preproc.filter.column.DataColumnSpecFilterNodeFactory',
    type: 'Manipulator'
}, {
    inPorts: [{ typeId: 'org.knime.core.node.BufferedDataTable' }],
    outPorts: [{ typeId: 'org.knime.core.node.BufferedDataTable' }],
    component: false,
    icon: 'data:image/png;base64,xxx',
    nodeFactory: { className: 'org.knime.base.node.preproc.filter.row.RowFilterNodeFactory' },
    name: 'Row Filter',
    id: 'org.knime.base.node.preproc.filter.row.RowFilterNodeFactory',
    type: 'Manipulator'
}];

jest.mock('@api', () => ({
    __esModule: true,
    getNodeRecommendations: jest.fn().mockReturnValue(getNodeRecommendationsResponse)
}));

import QuickAddNodeMenu from '../QuickAddNodeMenu.vue';
import FloatingMenu from '@/components/common/FloatingMenu.vue';
import { mockVuexStore } from '@/test/test-utils/index';
import Vuex from 'vuex';
import NodePreview from 'webapps-common/ui/components/node/NodePreview.vue';


describe('QuickAddNodeMenu.vue', () => {
    let wrapper, $store, doShallowMount, addNodeMock, isWritable;
    
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    let FloatingMenuStub = {
        template: `
          <div>
          <slot />
          </div>`,
        props: FloatingMenu.props
    };

    beforeEach(() => {
        addNodeMock = jest.fn();
        isWritable = true;

        let propsData = {
            nodeId: 'node-id',
            position: {
                x: 10,
                y: 10
            },
            port: {
                index: 1
            }
        };

        let storeConfig = {
            canvas: {
                state: () => ({
                    zoomFactor: 1
                })
            },
            application: {
                state: {
                    availablePortTypes: {
                        'org.knime.core.node.BufferedDataTable': {
                            kind: 'table',
                            color: 'green'
                        },
                        'org.some.otherPorType': {
                            kind: 'other',
                            color: 'blue'
                        }
                    },
                    hasNodeRecommendationsEnabled: true
                }
            },
            workflow: {
                state: {
                    activeWorkflow: {
                        info: {
                            containerId: 'container0'
                        },
                        projectId: 'project0'
                    }
                },
                actions: {
                    addNode: addNodeMock
                },
                getters: {
                    isWritable() {
                        return isWritable;
                    }
                }
            }
        };
        $store = mockVuexStore(storeConfig);
        let mocks = {
            $shapes: {
                ...$shapes,
                // set port size to a fixed value so test will not fail if we change it.
                portSize: 10
            },
            $store
        };

        doShallowMount = () => {
            wrapper = shallowMount(QuickAddNodeMenu, {
                propsData,
                mocks,
                attachTo: document.body,
                stubs: {
                    FloatingMenu: FloatingMenuStub
                }
            });
        };
    });

    describe('Menu', () => {
        it('re-emits menu-close', () => {
            doShallowMount();

            wrapper.findComponent(FloatingMenuStub).vm.$emit('menu-close');
            expect(wrapper.emitted('menu-close')).toBeTruthy();
        });

        it('centers to port', () => {
            doShallowMount();
            expect(wrapper.findComponent(FloatingMenuStub).props('canvasPosition')).toStrictEqual({
                x: 15,
                y: 10
            });
        });

        it('should display the nodes recommended by the api', async () => {
            doShallowMount();
            await Vue.nextTick();

            const labels = wrapper.findAll('.node > label');
            expect(labels.at(0).text()).toBe('Column Filter');
            expect(labels.at(1).text()).toBe('Row Filter');

            const previews = wrapper.findAllComponents(NodePreview);
            expect(previews.length).toBe(2);
            expect(previews.at(0).props('type')).toBe('Manipulator');
        });

        it('adds node on click', async () => {
            doShallowMount();
            await Vue.nextTick();
            const node1 = wrapper.findAll('.node').at(0);
            await node1.trigger('click');
            expect(addNodeMock).toHaveBeenCalledWith(expect.anything(), {
                nodeFactory: { className: 'org.knime.base.node.preproc.filter.column.DataColumnSpecFilterNodeFactory' },
                position: {
                    x: 10,
                    y: 10
                },
                sourceNodeId: 'node-id',
                sourcePortIdx: 1
            });
        });

        it('adds node on pressing enter key', async () => {
            doShallowMount();
            await Vue.nextTick();
            const node1 = wrapper.findAll('.node').at(0);
            await node1.trigger('keydown.enter');
            expect(addNodeMock).toHaveBeenCalledWith(expect.anything(), {
                nodeFactory: { className: 'org.knime.base.node.preproc.filter.column.DataColumnSpecFilterNodeFactory' },
                position: {
                    x: 10,
                    y: 10
                },
                sourceNodeId: 'node-id',
                sourcePortIdx: 1
            });
        });

        it('does not add node if workflow is not writeable', async () => {
            isWritable = false;
            doShallowMount();
            await Vue.nextTick();
            const node1 = wrapper.findAll('.node').at(0);
            await node1.trigger('click');
            expect(addNodeMock).toHaveBeenCalledTimes(0);
        });

        it('displays placeholder message if there are no suggested nodes', async () => {
            getNodeRecommendations.mockReturnValue([]);
            doShallowMount();
            await Vue.nextTick();

            expect(wrapper.find('.placeholder').exists()).toBe(true);
        });
    });
});
