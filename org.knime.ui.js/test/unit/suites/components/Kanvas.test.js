/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';

import * as $shapes from '~/style/shapes';

import Kanvas from '~/components/Kanvas.vue';
import Node from '~/components/Node';
import Connector from '~/components/Connector.vue';
import WorkflowAnnotation from '~/components/WorkflowAnnotation';

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
const mockConnector = ({ nr }) => ({
    sourceNode: '',
    destNode: '',
    sourcePort: nr,
    destPort: 0,
    flowVariableConnection: false
});

describe('Kanvas', () => {
    let propsData, mocks, mount, wrapper, $store, workflow, nodeData;

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
            name: 'wf1',
            nodeIds: ['root:0', 'root:1', 'root:2'],
            connections: {
                inA: mockConnector({ nr: 0 }),
                outA: mockConnector({ nr: 1 }),
                outB: mockConnector({ nr: 2 })
            },
            workflowAnnotations: []
        };
        $store = mockVuexStore({
            workflows: {
                state: { workflow },
                getters: {
                    svgBounds() {
                        return { x: -5, y: -2, height: 102, width: 100 };
                    }
                }
            },
            nodes: {
                state: {
                    'some id': nodeData
                },
                getters: {
                    icon() { return ({ workflowId, nodeId }) => `data:image/${workflowId}-${nodeId}`; },
                    name() { return ({ workflowId, nodeId }) => `name-${workflowId}-${nodeId}`; },
                    type() { return ({ workflowId, nodeId }) => `type-${workflowId}-${nodeId}`; }
                }
            }
        });

        mocks = { $store, $shapes };
        mount = () => {
            wrapper = shallowMount(Kanvas, { propsData, mocks });
        };
    });


    describe('sample workflow', () => {
        beforeEach(() => {
            mount();
        });

        it('has portal for selection frames', () => {
            expect(wrapper.find('portal-target[name="node-select"').exists()).toBe(true);
        });

        it('renders nodes', () => {
            wrapper.findAllComponents(Node).wrappers.forEach((n, i) => {
                let props = n.props();
                let nodeId = workflow.nodeIds[i];
                let expected = {
                    ...nodeData[nodeId],
                    icon: `data:image/some id-${nodeId}`,
                    name: `name-some id-${nodeId}`,
                    type: `type-some id-${nodeId}`
                };
                expect(props).toStrictEqual(expected);
            });
        });

        it('renders connectors', () => {
            let props = wrapper.findAllComponents(Connector).wrappers.map(c => c.props());
            expect(props).toEqual(Object.values(workflow.connections));
        });
    });

    it('renders workflow annotations', () => {
        workflow.workflowAnnotations = [
            { id: 'back', bounds: { x: 0, y: 0, width: 42, height: 42 } },
            { id: 'middle', bounds: { x: 0, y: 0, width: 42, height: 42 } },
            { id: 'front', bounds: { x: 0, y: 0, width: 42, height: 42 } }
        ];
        mount();

        let order = wrapper.findAllComponents(WorkflowAnnotation).wrappers.map(c => c.attributes().id);
        expect(order).toEqual(['back', 'middle', 'front']);
    });


    it('uses svgBounds from store', () => {
        mount();
        const { width, height, viewBox } = wrapper.find('svg').attributes();

        expect(Number(width)).toBe(100);
        expect(Number(height)).toBe(102);
        expect(viewBox).toBe(
            `-5 -2 100 102`
        );
    });

});
