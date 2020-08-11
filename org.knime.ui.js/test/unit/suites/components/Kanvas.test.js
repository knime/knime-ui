/* eslint-disable no-magic-numbers */
import { shallowMount, createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';

import * as $shapes from '~/style/shapes';

import Kanvas from '~/components/Kanvas.vue';
import Node from '~/components/Node';
import Connector from '~/components/Connector.vue';

const mockNode = ({ id, position }) => ({
    name: '',
    id,
    position,
    inPorts: [],
    outPorts: [],
    type: '',
    annotation: { text: '' }
});
const mockConnector = ({ nr }) => ({
    sourceNode: '',
    destNode: '',
    sourcePort: nr,
    destPort: 0
});

describe('Kanvas', () => {
    let propsData, mocks, mount, wrapper, $store, workflow;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;
        propsData = {};
        workflow = {
            name: 'wf1',
            nodes: {
                'root:0': mockNode({ id: 'root:0', position: { x: -32, y: -32 } }),
                'root:1': mockNode({ id: 'root:1', position: { x: 50, y: 50 } }),
                'root:2': mockNode({ id: 'root:2', position: { x: 0, y: 100 } })
            },
            connections: {
                inA: mockConnector({ nr: 0 }),
                outA: mockConnector({ nr: 1 }),
                outB: mockConnector({ nr: 2 })
            }
        };
        $store = mockVuexStore({
            workflows: { state: { workflow } }
        });

        mocks = { $store, $shapes };
        mount = () => { wrapper = shallowMount(Kanvas, { propsData, mocks }); };
    });


    describe('renders default', () => {
        beforeEach(() => {
            mount();
        });

        it('heading', () => {
            expect(wrapper.find('h3').text()).toBe('wf1 - 3 Nodes');
        });

        it('has portal for selection frames', () => {
            expect(wrapper.find('portal-target[name="node-select"').exists()).toBe(true);
        });

        it('renders nodes', () => {
            let props = wrapper.findAllComponents(Node).wrappers.map(n => n.props());
            expect(props).toStrictEqual(Object.values(workflow.nodes));
        });

        it('renders connectors', () => {
            let props = wrapper.findAllComponents(Connector).wrappers.map(c => c.props());
            expect(props).toStrictEqual(Object.values(workflow.connections));
        });

        it('uses correct svg size', () => {
            const { width, height, viewBox } = wrapper.find('svg').attributes();
            const { canvasPadding, nodeSize } = $shapes;

            expect(Number(width)).toBe(32 + nodeSize + 50 + canvasPadding * 2);
            expect(Number(height)).toBe(32 + nodeSize + 100 + canvasPadding * 2);
            expect(viewBox).toBe(
                `${-canvasPadding - 32} ${-canvasPadding - 32} ` +
                `${2 * canvasPadding + 50 + 32 + nodeSize} ${2 * canvasPadding + 100 + 32 + nodeSize}`
            );
        });
    });
    describe('svg sizes', () => {
        it('empty workflow', () => {
            delete workflow.nodes;
            mount();

            const { width, height, viewBox } = wrapper.find('svg').attributes();
            const { canvasPadding } = $shapes;

            expect(Number(width)).toBe(canvasPadding * 2);
            expect(Number(height)).toBe(canvasPadding * 2);
            expect(viewBox).toBe(
                `${-canvasPadding} ${-canvasPadding} ` +
                `${2 * canvasPadding} ${2 * canvasPadding}`
            );
        });

        it('annotations', () => {
            delete workflow.nodes;
            workflow.workflowAnnotations = {
                'root:1': {
                    bounds: {
                        x: -10,
                        y: -10,
                        width: 20,
                        height: 20
                    }
                }
            };
            mount();

            const { width, height, viewBox } = wrapper.find('svg').attributes();
            const { canvasPadding } = $shapes;

            expect(Number(width)).toBe(canvasPadding * 2 + 20);
            expect(Number(height)).toBe(canvasPadding * 2 + 20);
            expect(viewBox).toBe(
                `${-canvasPadding - 10} ${-canvasPadding - 10} ` +
                `${2 * canvasPadding + 20} ${2 * canvasPadding + 20}`
            );
        });

        it('overlapping node + annotation', () => {
            workflow.nodes = {
                'root:1': mockNode({ id: 'root:1', position: { x: 10, y: 10 } })
            };
            workflow.workflowAnnotations = {
                'root:1': {
                    bounds: {
                        x: 26,
                        y: 26,
                        width: 26,
                        height: 26
                    }
                }
            };
            mount();

            const { width, height, viewBox } = wrapper.find('svg').attributes();
            const { canvasPadding } = $shapes;

            expect(Number(width)).toBe(42 + canvasPadding * 2);
            expect(Number(height)).toBe(42 + canvasPadding * 2);
            expect(viewBox).toBe(
                `${-canvasPadding + 10} ${-canvasPadding + 10} ` +
                `${2 * canvasPadding + 42} ${2 * canvasPadding + 42}`
            );
        });
    });
});
