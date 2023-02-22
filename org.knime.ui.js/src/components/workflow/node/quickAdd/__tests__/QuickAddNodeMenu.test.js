import * as Vue from 'vue';
import { shallowMount } from '@vue/test-utils';

import Button from 'webapps-common/ui/components/Button.vue';
import NodePreview from 'webapps-common/ui/components/node/NodePreview.vue';
import { mockVuexStore } from '@/test/test-utils';

import { openWorkflowCoachPreferencePage as openWorkflowCoachPreferencePageMock, getNodeRecommendations } from '@api';
import * as $shapes from '@/style/shapes.mjs';
import FloatingMenu from '@/components/common/FloatingMenu.vue';

import QuickAddNodeMenu from '../QuickAddNodeMenu.vue';

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
    getNodeRecommendations: jest.fn().mockReturnValue(getNodeRecommendationsResponse),
    openWorkflowCoachPreferencePage: jest.fn()
}));

describe('QuickAddNodeMenu.vue', () => {
    let FloatingMenuStub = {
        template: `
          <div>
          <slot />
          </div>`,
        props: FloatingMenu.props
    };

    const doMount = ({
        addNodeMock = jest.fn(),
        isWriteableMock = jest.fn().mockReturnValue(true)
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

        const storeConfig = {
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
                    isWritable: isWriteableMock
                }
            }
        };
        const $store = mockVuexStore(storeConfig);

        const wrapper = shallowMount(QuickAddNodeMenu, {
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

    describe('Menu', () => {
        it('re-emits menuClose', () => {
            let { wrapper } = doMount();
            wrapper.findComponent(FloatingMenuStub).vm.$emit('menuClose');

            expect(wrapper.emitted('menuClose')).toBeTruthy();
        });

        it('centers to port', () => {
            let { wrapper } = doMount();

            expect(wrapper.findComponent(FloatingMenuStub).props('canvasPosition')).toStrictEqual({
                x: 15,
                y: 10
            });
        });

        it('should display the nodes recommended by the api', async () => {
            let { wrapper } = doMount();
            await Vue.nextTick();
            const labels = wrapper.findAll('.node > label');

            expect(labels.at(0).text()).toBe('Column Filter');
            expect(labels.at(1).text()).toBe('Row Filter');

            const previews = wrapper.findAllComponents(NodePreview);

            expect(previews.length).toBe(2);
            expect(previews.at(0).props('type')).toBe('Manipulator');
        });

        it('adds node on click', async () => {
            let { wrapper, addNodeMock } = doMount();
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
            let { wrapper, addNodeMock } = doMount();
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
            let { wrapper, addNodeMock } = doMount({
                isWriteableMock: jest.fn(() => false)
            });
            await Vue.nextTick();
            const node1 = wrapper.findAll('.node').at(0);
            await node1.trigger('click');

            expect(addNodeMock).toHaveBeenCalledTimes(0);
        });

        it('does display overlay if workflow coach is disabled', async () => {
            let { wrapper, $store } = doMount();
            $store.state.application.hasNodeRecommendationsEnabled = false;
            await Vue.nextTick();

            expect(wrapper.find('.overlay').exists()).toBe(true);
        });

        it('does not display overlay if workflow coach is enabled', async () => {
            let { wrapper } = doMount();
            await Vue.nextTick();

            expect(wrapper.find('.overlay').exists()).toBe(false);
        });

        it('opens workflow coach preferences page when button is clicked', async () => {
            let { wrapper, $store } = doMount();
            $store.state.application.hasNodeRecommendationsEnabled = false;
            await Vue.nextTick();
            await wrapper.findComponent(Button).vm.$emit('click');

            expect(openWorkflowCoachPreferencePageMock).toHaveBeenCalled();
        });

        it('displays placeholder message if there are no suggested nodes', async () => {
            getNodeRecommendations.mockReturnValue([]);
            let { wrapper } = doMount();
            await Vue.nextTick();

            expect(wrapper.find('.placeholder').exists()).toBe(true);
        });
    });
});
