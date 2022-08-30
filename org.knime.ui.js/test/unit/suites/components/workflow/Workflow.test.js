/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';

import * as $shapes from '~/style/shapes.mjs';

import Workflow from '~/components/workflow/Workflow.vue';
import Node from '~/components/workflow/Node.vue';
import MoveableNodeContainer from '~/components/workflow/MoveableNodeContainer.vue';
import Connector from '~/components/workflow/Connector.vue';
import WorkflowAnnotation from '~/components/workflow/WorkflowAnnotation.vue';
import MetaNodePortBars from '~/components/workflow/MetaNodePortBars.vue';

const mockNode = ({ id, position }) => ({
    name: '',
    id,
    position,
    inPorts: [],
    outPorts: [],
    type: '',
    annotation: { text: '' },
    kind: 'node',
    icon: 'data:image/',
    state: null
});

const mockConnector = ({ nr, id }) => ({
    sourceNode: '',
    destNode: '',
    id,
    allowedActions: {
        canDelete: false
    },
    sourcePort: nr,
    destPort: 0,
    flowVariableConnection: false,
    streaming: false,
    absolutePoint: null
});

describe('Workflow', () => {
    let propsData, mocks, doShallowMount, wrapper, $store, workflow, storeConfig, isNodeSelectedMock, nodeData;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;
        nodeData = {
            'root:0': mockNode({ id: 'root:0', position: { x: -32, y: -32 } }),
            'root:1': mockNode({ id: 'root:1', position: { x: 50, y: 50 } }),
            'root:2': mockNode({ id: 'root:2', position: { x: 0, y: 100 } })
        };
        propsData = {};
        workflow = {
            projectId: 'some id',
            info: {
                containerType: 'project',
                name: 'wf1'
            },
            // still needed?
            executionInfo: {
                jobManager: 'test'
            },
            nodes: nodeData,
            connections: {
                inA: mockConnector({ nr: 0, id: 'inA' }),
                outA: mockConnector({ nr: 1, id: 'outA' }),
                outB: mockConnector({ nr: 2, id: 'outB' })
            },
            workflowAnnotations: [],
            parents: []
        };

        isNodeSelectedMock = jest.fn().mockReturnValue(false);

        storeConfig = {
            workflow: {
                state: {
                    activeWorkflow: workflow
                },
                getters: {
                    getNodeIcon() {
                        return (nodeId) => `data:image/${nodeId}`;
                    },
                    getNodeName() {
                        return (nodeId) => `name-${nodeId}`;
                    },
                    getNodeType() {
                        return (nodeId) => `type-${nodeId}`;
                    }
                }
            },
            selection: {
                getters: {
                    isNodeSelected: () => isNodeSelectedMock
                }
            }
        };

        $store = mockVuexStore(storeConfig);

        mocks = { $store, $shapes };
        doShallowMount = () => {
            wrapper = shallowMount(Workflow, { propsData, mocks });
        };
    });

    describe('sample workflow', () => {
        beforeEach(() => {
            doShallowMount();
        });

        it('has portal for selection frames', () => {
            expect(wrapper.find('portal-target[name="node-select"').exists()).toBe(true);
        });

        it('forwards nodeSelectionPreview calls to the correct node', () => {
            const localWrapper = shallowMount(Workflow, {
                propsData,
                mocks,
                stubs: {
                    MoveableNodeContainer: {
                        template: '<g><slot :position="{ x: 0, y: 0 }"></slot></g>'
                    }
                }
            });

            const node = localWrapper.findAllComponents(Node).wrappers.find(n => n.props('id') === 'root:1');

            node.vm.setSelectionPreview = jest.fn();
            localWrapper.vm.applyNodeSelectionPreview({ type: 'show', nodeId: 'root:1' });

            expect(node.vm.setSelectionPreview).toHaveBeenLastCalledWith('show');
        });

        it('renders nodes', () => {
            wrapper.findAllComponents(Node).wrappers.forEach((n) => {
                let props = n.props();
                let nodeId = props.id;
                let expected = {
                    ...nodeData[nodeId],
                    icon: `data:image/${nodeId}`,
                    name: `name-${nodeId}`,
                    type: `type-${nodeId}`,
                    link: null,
                    allowedActions: {},
                    executionInfo: null,
                    loopInfo: {
                        allowedActions: {}
                    }
                };
                expect(props).toStrictEqual(expected);
            });
        });

        it('renders connectors', () => {
            let connectorProps = wrapper.findAllComponents(Connector).wrappers.map(c => c.props());
            let connections = Object.values(workflow.connections);
            expect(connectorProps).toStrictEqual(connections);
        });

        it('is not streaming', () => {
            expect(wrapper.find('.streaming-decorator').exists()).toBe(false);
        });
    });

    it('renders workflow annotations', () => {
        const common = { bounds: { x: 0, y: 0, width: 42, height: 42 }, backgroundColor: '#fff', borderColor: '#000' };
        workflow.workflowAnnotations = [
            { ...common, id: 'back' },
            { ...common, id: 'middle' },
            { ...common, id: 'front' }
        ];
        doShallowMount();

        let order = wrapper.findAllComponents(WorkflowAnnotation).wrappers.map(c => c.attributes().id);
        expect(order).toEqual(['back', 'middle', 'front']);
    });

    describe('Node order', () => {
        test('original order without selection', () => {
            doShallowMount();

            const nodeOrder = wrapper.findAllComponents(MoveableNodeContainer).wrappers.map(node => node.props('id'));
            expect(nodeOrder).toStrictEqual(['root:0', 'root:1', 'root:2']);
        });

        test('selecting node brings it to the front', () => {
            isNodeSelectedMock.mockImplementation((id) => id === 'root:1');
            doShallowMount();

            // check order order of Node components
            let nodeOrder = wrapper.findAllComponents(MoveableNodeContainer).wrappers.map(node => node.props('id'));
            expect(nodeOrder).toStrictEqual(['root:0', 'root:2', 'root:1']);
        });
    });

    it('renders metanode ports inside metanodes', () => {
        workflow.info.containerType = 'metanode';
        doShallowMount();

        expect(wrapper.findComponent(MetaNodePortBars).exists()).toBe(true);
    });

    it('doesn’t render metanode ports by default', () => {
        workflow.info.containerType = 'component';
        doShallowMount();

        expect(wrapper.findComponent(MetaNodePortBars).exists()).toBe(false);
    });
});
