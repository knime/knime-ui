import { expect, describe, it, vi, beforeEach } from 'vitest';
import * as Vue from 'vue';
import { mount } from '@vue/test-utils';

import Button from 'webapps-common/ui/components/Button.vue';
import NodePreview from 'webapps-common/ui/components/node/NodePreview.vue';
import { mockLodashThrottleAndDebounce, mockVuexStore } from '@/test/utils';

import { API } from '@api';
import * as $shapes from '@/style/shapes.mjs';
import FloatingMenu from '@/components/common/FloatingMenu.vue';

import QuickAddNodeMenu from '../QuickAddNodeMenu.vue';
import { searchNodesResponse } from '@/store/common/__tests__/nodeSearch.test';

const defaultNodeRecommendationsResponse = [{
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

const notInCollectionSearchResult = {
    tags: [],
    totalNumNodes: 1355,
    nodes: [{
        component: false,
        icon: 'data:image/png;base64,xxx',
        name: 'Advanced Node',
        id: 'org.knime.ext.advanced.node3',
        type: 'Visualizer',
        nodeFactory: { className: 'org.knime.ext.advanced.node3' },
        inPorts: [{ typeId: 'org.knime.core.node.BufferedDataTable' }],
        outPorts: []
    }]
};

mockLodashThrottleAndDebounce();

describe('QuickAddNodeMenu.vue', () => {
    let FloatingMenuStub = {
        template: `
          <div>
          <slot />
          </div>`,
        props: FloatingMenu.props
    };

    const doMount = async ({
        addNodeMock = vi.fn(),
        nodeRecommendationsResponse = defaultNodeRecommendationsResponse,
        isWriteableMock = vi.fn().mockReturnValue(true)
    } = {}) => {
        const props = {
            nodeId: 'node-id',
            position: {
                x: 10,
                y: 10
            },
            port: {
                index: 1,
                typeId: 'org.knime.core.node.BufferedDataTable',
                kind: 'table'
            }
        };

        API.noderepository.getNodeRecommendations.mockReturnValue(nodeRecommendationsResponse);
        API.noderepository.searchNodes.mockImplementation(
            ({ nodesPartition }) => nodesPartition === 'IN_COLLECTION'
                ? searchNodesResponse
                : notInCollectionSearchResult
        );

        const storeConfig = {
            canvas: {
                state: () => ({
                    zoomFactor: 1
                })
            },
            quickAddNodes: await import('@/store/quickAddNodes'),
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
                    hasNodeCollectionActive: true,
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
                    isWritable: isWriteableMock
                }
            }
        };
        const $store = mockVuexStore(storeConfig);

        const wrapper = mount(QuickAddNodeMenu, {
            props,
            global: {
                plugins: [$store],
                mocks: {
                    $shapes: {
                        ...$shapes,
                        // set port size to a fixed value so test will not fail if we change it.
                        portSize: 10
                    }
                },
                stubs: {
                    FloatingMenu: FloatingMenuStub
                }
            },
            attachTo: document.body
        });

        return { wrapper, $store, addNodeMock };
    };

    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('visuals', () => {
        it('re-emits menuClose', async () => {
            let { wrapper } = await doMount();
            wrapper.findComponent(FloatingMenuStub).vm.$emit('menuClose');

            expect(wrapper.emitted('menuClose')).toBeTruthy();
        });

        it('centers to port', async () => {
            let { wrapper } = await doMount();

            expect(wrapper.findComponent(FloatingMenuStub).props('canvasPosition')).toStrictEqual({
                x: 15,
                y: 10
            });
        });
    });

    describe('recommendations', () => {
        it('should display the nodes recommended', async () => {
            let { wrapper } = await doMount();
            await Vue.nextTick();
            const labels = wrapper.findAll('.node > label');

            expect(labels.at(0).text()).toBe('Column Filter');
            expect(labels.at(1).text()).toBe('Row Filter');

            const previews = wrapper.findAllComponents(NodePreview);

            expect(previews.length).toBe(2);
            expect(previews.at(0).props('type')).toBe('Manipulator');
        });

        it('adds node on click', async () => {
            let { wrapper, addNodeMock } = await doMount();
            await Vue.nextTick();
            const node1 = wrapper.findAll('.node').at(0);
            await node1.trigger('click');

            expect(addNodeMock).toHaveBeenCalledWith(expect.anything(), {
                nodeFactory: { className: 'org.knime.base.node.preproc.filter.column.DataColumnSpecFilterNodeFactory' },
                position: {
                    x: 19.5,
                    y: -6
                },
                sourceNodeId: 'node-id',
                sourcePortIdx: 1
            });
        });

        it('adds node on pressing enter key', async () => {
            let { wrapper, addNodeMock } = await doMount();
            await Vue.nextTick();
            const node1 = wrapper.findAll('.node').at(0);
            await node1.trigger('keydown.enter');

            expect(addNodeMock).toHaveBeenCalledWith(expect.anything(), {
                nodeFactory: { className: 'org.knime.base.node.preproc.filter.column.DataColumnSpecFilterNodeFactory' },
                position: {
                    x: 19.5,
                    y: -6
                },
                sourceNodeId: 'node-id',
                sourcePortIdx: 1
            });
        });

        it('does not add node if workflow is not writeable', async () => {
            let { wrapper, addNodeMock } = await doMount({
                isWriteableMock: vi.fn(() => false)
            });
            await Vue.nextTick();
            const node1 = wrapper.findAll('.node').at(0);
            await node1.trigger('click');

            expect(addNodeMock).toHaveBeenCalledTimes(0);
        });

        it('does display overlay if workflow coach is disabled', async () => {
            let { wrapper, $store } = await doMount();
            $store.state.application.hasNodeRecommendationsEnabled = false;
            await Vue.nextTick();

            expect(wrapper.find('.disabled-workflow-coach').exists()).toBe(true);
        });

        it('does not display overlay if workflow coach is enabled', async () => {
            let { wrapper } = await doMount();
            await Vue.nextTick();

            expect(wrapper.find('.disabled-workflow-coach').exists()).toBe(false);
        });

        it('opens workflow coach preferences page when button is clicked', async () => {
            let { wrapper, $store } = await doMount();
            $store.state.application.hasNodeRecommendationsEnabled = false;
            await Vue.nextTick();
            await wrapper.findComponent(Button).vm.$emit('click');

            expect(API.desktop.openWorkflowCoachPreferencePage).toHaveBeenCalled();
        });

        it('displays placeholder message if there are no suggested nodes', async () => {
            let { wrapper } = await doMount({ nodeRecommendationsResponse: [] });
            await Vue.nextTick();

            expect(wrapper.find('.no-recommendations').exists()).toBe(true);
        });
    });

    describe('search', () => {
        it('display search results if query was entered', async () => {
            let { wrapper } = await doMount();
            await wrapper.find('.search-bar input').setValue('search');

            const labels = wrapper.findAll('.node > label');

            expect(labels.at(0).text()).toBe('GroupBy Bar Chart (JFreeChart)');
            expect(labels.at(1).text()).toBe('Decision Tree Learner');

            const previews = wrapper.findAllComponents(NodePreview);

            expect(previews.length).toBe(2);
            expect(previews.at(0).props('type')).toBe('Visualizer');
        });

        it('displays more nodes if button is pressed', async () => {
            let { wrapper } = await doMount();
            await wrapper.find('.search-bar input').setValue('search');

            await wrapper.find('.more-nodes-button').trigger('click');

            const labels = wrapper.findAll('.node > label');
            expect(labels.length).toBe(3);
        });

        describe('add node', () => {
            it('adds the first search result via enter in the search box to the workflow', async () => {
                let { wrapper, addNodeMock } = await doMount();
                const input = wrapper.find('.search-bar input');

                // trigger search
                await input.setValue('search');

                // press enter
                await input.trigger('keydown.enter');


                expect(addNodeMock).toHaveBeenCalledWith(expect.anything(), {
                    nodeFactory: {
                        className: 'org.knime.ext.jfc.node.groupbarchart.JfcGroupBarChartNodeFactory'
                    },
                    position: {
                        x: 19.5,
                        y: -6
                    },
                    sourceNodeId: 'node-id',
                    sourcePortIdx: 1
                });
            });

            it.each(['click', 'keydown.enter'])('adds search results via %s to workflow', async (event) => {
                let { wrapper, addNodeMock } = await doMount();

                const input = wrapper.find('.search-bar input');
                await input.setValue(`some-input-for-${event}`);

                const nodes = wrapper.findAll('.node');
                const node = nodes.at(1);

                await node.trigger(event);

                expect(addNodeMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
                    nodeFactory: {
                        className: 'org.knime.base.node.mine.decisiontree2.learner2.DecisionTreeLearnerNodeFactory3'
                    },
                    position: expect.anything(),
                    sourceNodeId: 'node-id',
                    sourcePortIdx: 1
                }));
            });

            it.each(['click', 'keydown.enter'])('adds bottom search results via %s to workflow', async (event) => {
                let { wrapper, addNodeMock } = await doMount();

                const input = wrapper.find('.search-bar input');
                await input.setValue(`some-input-for-${event}`);

                await wrapper.find('.more-nodes-button').trigger('click');

                const nodes = wrapper.findAll('.node');
                expect(nodes.length).toBe(3);

                const node = nodes.at(2);
                expect(node.text()).toBe('Advanced Node');

                await node.trigger(event);

                expect(addNodeMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
                    nodeFactory: {
                        className: 'org.knime.ext.advanced.node3'
                    },
                    position: expect.anything(),
                    sourceNodeId: 'node-id',
                    sourcePortIdx: 1
                }));
            });
        });
    });
});
