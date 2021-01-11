/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';

import * as $shapes from '~/style/shapes';

import Kanvas from '~/components/Kanvas';
import Node from '~/components/Node';
import Connector from '~/components/Connector';
import WorkflowAnnotation from '~/components/WorkflowAnnotation';
import MetaNodePortBars from '~/components/MetaNodePortBars';

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
    state: null,
    jobManager: null
});
const mockConnector = ({ nr }) => ({
    sourceNode: '',
    destNode: '',
    sourcePort: nr,
    destPort: 0,
    flowVariableConnection: false,
    streaming: false,
    label: ''
});

describe('Kanvas', () => {
    let propsData, mocks, doShallowMount, wrapper, $store, workflow, workflowStoreConfig, nodeData;

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
            executionInfo: {
                jobManager: 'test'
            },
            nodes: nodeData,
            connections: {
                inA: mockConnector({ nr: 0 }),
                outA: mockConnector({ nr: 1 }),
                outB: mockConnector({ nr: 2 })
            },
            workflowAnnotations: []
        };
        workflowStoreConfig = {
            state: {
                activeWorkflow: workflow
            },
            mutations: {
                selectAllNodes: jest.fn()
            },
            getters: {
                svgBounds() {
                    return { x: -5, y: -2, height: 102, width: 100 };
                },
                isLinked() {
                    return workflow.info.linked;
                },
                isStreaming() {
                    return workflow.info.jobManager;
                },
                isWritable() {
                    return !workflow.info.linked;
                },
                nodeIcon() {
                    return ({ nodeId }) => `data:image/${nodeId}`;
                },
                nodeName() {
                    return ({ nodeId }) => `name-${nodeId}`;
                },
                nodeType() {
                    return ({ nodeId }) => `type-${nodeId}`;
                },
                executionInfo() {
                    return ({ nodeId }) => workflow.nodes[nodeId].executionInfo;
                }
            }
        };
        $store = mockVuexStore({ workflow: workflowStoreConfig });

        mocks = { $store, $shapes };
        doShallowMount = () => {
            wrapper = shallowMount(Kanvas, { propsData, mocks });
        };
    });

    describe('Shortcuts', () => {
        it('select all on Ctrl-A', () => {
            doShallowMount();
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true }));
            expect(workflowStoreConfig.mutations.selectAllNodes).toHaveBeenCalled();
        });

        it('adds and removes listener', () => {
            document.addEventListener = jest.fn().mockReturnValue('shortcut-listener');
            document.removeEventListener = jest.fn();

            doShallowMount();
            wrapper.destroy();

            expect(document.removeEventListener).toHaveBeenCalledWith('keydown', 'shortcut-listener');
        });
    });

    describe('sample workflow', () => {
        beforeEach(() => {
            doShallowMount();
        });

        it('has portal for selection frames', () => {
            expect(wrapper.find('portal-target[name="node-select"').exists()).toBe(true);
        });

        it('renders nodes', () => {
            wrapper.findAllComponents(Node).wrappers.forEach((n, i) => {
                let props = n.props();
                let nodeId = props.id;
                let expected = {
                    ...nodeData[nodeId],
                    icon: `data:image/${nodeId}`,
                    name: `name-${nodeId}`,
                    type: `type-${nodeId}`,
                    link: null,
                    allowedActions: null,
                    selected: false,
                    executionInfo: null
                };
                expect(props).toStrictEqual(expected);
            });
        });

        it('renders connectors', () => {
            let props = wrapper.findAllComponents(Connector).wrappers.map(c => c.props());
            expect(props).toEqual(Object.values(workflow.connections));
        });

        it('is not linked', () => {
            expect(wrapper.find('.read-only').exists()).toBe(false);
            expect(wrapper.find('.link-notification').exists()).toBe(false);
        });

        it('is not streaming', () => {
            expect(wrapper.find('.streaming-decorator').exists()).toBe(false);
        });
    });

    it('write-protects and shows warning on being linked', () => {
        workflow.info.linked = true;
        doShallowMount();
        expect(wrapper.find('.read-only').exists()).toBe(true);
        expect(wrapper.find('.link-notification').exists()).toBe(true);
    });

    it('shows decorator in streaming component', () => {
        workflow.info.jobManager = 'test';
        doShallowMount();
        expect(wrapper.find('.streaming-decorator').exists()).toBe(true);
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


    it('uses svgBounds from store', () => {
        doShallowMount();
        const { width, height, viewBox } = wrapper.find('svg').attributes();

        expect(Number(width)).toBe(100);
        expect(Number(height)).toBe(102);
        expect(viewBox).toBe('-5 -2 100 102');
    });

});
