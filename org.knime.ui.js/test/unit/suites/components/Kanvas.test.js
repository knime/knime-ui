/* eslint-disable no-magic-numbers */
import { shallowMount, createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';

import * as $shapes from '~/style/shapes';

import Kanvas from '~/components/Kanvas.vue';
import Node from '~/components/Node';
import Connector from '~/components/Connector.vue';
const { canvasPadding, nodeSize } = $shapes;

const mockNode = ({ id, position }) => ({
    name: '',
    id,
    position,
    inPorts: [],
    outPorts: [],
    type: '',
    annotation: { text: '' },
    kind: 'node'
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


    describe('sample workflow', () => {
        beforeEach(() => {
            mount();
        });

        it('renders heading', () => {
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

    });

    describe('svg sizes', () => {

        it('calculates dimensions of example workflow', () => {
            mount();
            const { width, height, viewBox } = wrapper.find('svg').attributes();

            expect(Number(width)).toBe(32 + nodeSize + 50 + canvasPadding);
            expect(Number(height)).toBe(32 + nodeSize + 100 + canvasPadding);
            expect(viewBox).toBe(
                `-32 -32 ${canvasPadding + 50 + 32 + nodeSize} ${canvasPadding + 100 + 32 + nodeSize}`
            );
        });

        it('calculates dimensions of empty workflow', () => {
            delete workflow.nodes;
            mount();

            const { width, height, viewBox } = wrapper.find('svg').attributes();
            const { canvasPadding } = $shapes;

            expect(Number(width)).toBe(canvasPadding);
            expect(Number(height)).toBe(canvasPadding);
            expect(viewBox).toBe(
                `0 0 ${canvasPadding} ${canvasPadding}`
            );
        });

        it('calculates dimensions of workflow containing one node away from the top left corner', () => {
            workflow.nodes = {
                'root:0': mockNode({ id: 'root:2', position: { x: 200, y: 200 } })
            };
            mount();

            const { width, height, viewBox } = wrapper.find('svg').attributes();
            const { canvasPadding } = $shapes;

            expect(Number(width)).toBe(200 + nodeSize + canvasPadding);
            expect(Number(height)).toBe(200 + nodeSize + canvasPadding);
            expect(viewBox).toBe(
                `0 0 ${200 + nodeSize + canvasPadding} ${200 + nodeSize + canvasPadding}`
            );
        });

        it('calculates dimensions of workflow containing annotations only', () => {
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

            expect(Number(width)).toBe(canvasPadding + 20);
            expect(Number(height)).toBe(canvasPadding + 20);
            expect(viewBox).toBe(
                `-10 -10 ${canvasPadding + 20} ${canvasPadding + 20}`
            );
        });

        it('calculates dimensions of workflow containing overlapping node + annotation', () => {
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

            expect(Number(width)).toBe(52 + canvasPadding);
            expect(Number(height)).toBe(52 + canvasPadding);
            expect(viewBox).toBe(
                `0 0 ${canvasPadding + 52} ${canvasPadding + 52}`
            );
        });
    });
});
