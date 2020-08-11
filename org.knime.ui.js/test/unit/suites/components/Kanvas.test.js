/* eslint-disable no-magic-numbers */
import { shallowMount, createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';

import Kanvas from '~/components/Kanvas.vue';
import Node from '~/components/Node';
import Connector from '~/components/Connector.vue';

const mockNode = ({ id }) => ({
    name: '',
    id,
    position: { x: 0, y: 0 },
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
                'root:0': mockNode({ id: 'root:0' }),
                'root:1': mockNode({ id: 'root:1' }),
                'root:2': mockNode({ id: 'root:2' })
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

        mocks = { $store };
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
    });
});
