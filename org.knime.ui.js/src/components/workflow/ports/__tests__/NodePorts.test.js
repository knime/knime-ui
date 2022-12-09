import Vue from 'vue';
import Vuex from 'vuex';
import { shallowMount, createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '@/test/test-utils';

import * as $shapes from '@/style/shapes.mjs';

import AddPortPlaceholder from '../AddPortPlaceholder.vue';
import NodePorts from '../NodePorts.vue';
import NodePort from '../NodePort.vue';

const mockPort = ({ index, connectedVia = [], portGroupId = null }) => ({
    inactive: false,
    optional: false,
    index,
    type: 'other',
    connectedVia,
    portGroupId
});

describe('NodePorts.vue', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    const doMount = ({
        addNodePortMock = jest.fn(),
        removeNodePortMock = jest.fn(),
        customProps = {}
    } = {}) => {
        let defaultProps = {
            inPorts: [
                mockPort({ index: 0, connectedVia: ['inA'] }),
                mockPort({ index: 1 })
            ],
            outPorts: [
                mockPort({ index: 0, outgoing: true, connectedVia: ['outA'] }),
                mockPort({ index: 1, outgoing: true }),
                mockPort({ index: 2, outgoing: true, connectedVia: ['outB'] })
            ],
            portGroups: null,
            nodeId: 'root:1',
            nodeKind: 'node',
            isEditable: true,
            targetPort: null,
            hover: false,
            connectorHover: false,
            isSingleConnected: false
        };

        let storeConfig = {
            workflow: {
                state: () => ({
                    __isDragging: false
                }),
                getters: {
                    isDragging: (state) => state.__isDragging
                },
                actions: {
                    addNodePort: addNodePortMock,
                    removeNodePort: removeNodePortMock
                }
            }
        };

        let $store = mockVuexStore(storeConfig);
        let mocks = { $shapes, $store };

        const wrapper = shallowMount(NodePorts, {
            propsData: { ...defaultProps, ...customProps },
            mocks
        });

        return { wrapper, $store, addNodePortMock, removeNodePortMock };
    };

    describe('Port positions', () => {
        it('for meta node', () => {
            let { wrapper } = doMount({ customProps: { nodeKind: 'metanode' } });
            const ports = wrapper.findAllComponents(NodePort).wrappers;
            const locations = ports.map(p => p.props().relativePosition);
            const portAttrs = ports.map(p => p.props().port.index);

            expect(locations).toStrictEqual([
                [-4.5, 5.5],
                [-4.5, 26.5],
                [36.5, 5.5],
                [36.5, 16],
                [36.5, 26.5]
            ]);

            expect(portAttrs).toStrictEqual([0, 1, 0, 1, 2]);
        });

        it.each([
            ['component'],
            ['node']
        ])('for %s', (nodeKind) => {
            let { wrapper } = doMount({ customProps: { nodeKind } });
            const ports = wrapper.findAllComponents(NodePort).wrappers;
            const locations = ports.map(p => p.props().relativePosition);
            const portAttrs = ports.map(p => p.props().port.index);

            expect(locations).toStrictEqual([
                [0, -4.5], // left flowVariablePort (index 0)
                [-4.5, 16], // left side port (index 1)
                [32, -4.5], // right flowVariablePort (index 0)
                [36.5, 5.5],
                [36.5, 26.5]
            ]);

            expect(portAttrs).toStrictEqual([0, 1, 0, 1, 2]);
        });

        it('placeholderPositions on component', () => {
            let { wrapper } = doMount({ customProps: { nodeKind: 'component' } });
            const addPortPlaceholders = wrapper.findAllComponents(AddPortPlaceholder);

            expect(addPortPlaceholders.at(0).props('position')).toStrictEqual([-4.5, 37]);
            expect(addPortPlaceholders.at(1).props('position')).toStrictEqual([36.5, 37]);
        });
    });

    describe('Port selection', () => {
        test('no port can be selected', async () => {
            let { wrapper } = doMount({ customProps: { nodeKind: 'node', portGroups: null } });
            let somePort = wrapper.findComponent(NodePort);
            somePort.vm.$emit('click');
            await Vue.nextTick();

            let allPorts = wrapper.findAllComponents(NodePort).wrappers;
            expect(allPorts.every(port => port.props('selected') === false)).toBeTruthy();
        });

        test('ports cant be selected if components or metanodes are linked or workflow is not writable', async () => {
            let { wrapper } = doMount({ customProps: { nodeKind: 'metanode', isEditable: false } });
            let firstPort = wrapper.findAllComponents(NodePort).at(0);
            firstPort.vm.$emit('click');
            await Vue.nextTick();

            expect(firstPort.props('selected')).toBe(false);
        });

        test('Metanode', async () => {
            let { wrapper } = doMount({ customProps: { nodeKind: 'metanode' } });
            let firstPort = wrapper.findAllComponents(NodePort).at(0);
            firstPort.vm.$emit('click');
            await Vue.nextTick();

            expect(firstPort.props('selected')).toBe(true);
        });

        test('Component', async () => {
            let { wrapper } = doMount({ customProps: { nodeKind: 'component' } });

            // Flow Variable Port can't be selected
            let flowVariablePort = wrapper.findAllComponents(NodePort).at(0);
            await flowVariablePort.vm.$emit('click');

            expect(flowVariablePort.props('selected')).toBe(false);

            // Other Port can be
            let normalPort = wrapper.findAllComponents(NodePort).at(1);
            normalPort.vm.$emit('click');
            await Vue.nextTick();

            expect(normalPort.props('selected')).toBe(true);
        });

        test('Select last port of group for Dynamic Native Nodes', async () => {
            const inPorts = [
                mockPort({ index: 0, connectedVia: ['inA'] }),
                mockPort({ index: 1, portGroupId: 'group1' })
            ];
            const outPorts = [
                mockPort({ index: 0, outgoing: true, connectedVia: ['outA'] }),
                mockPort({ index: 1, outgoing: true, portGroupId: 'group1' }),
                mockPort({ index: 2, outgoing: true, connectedVia: ['outB'], portGroupId: 'group1' })
            ];
            let { wrapper } = doMount({ customProps: {
                nodeKind: 'node',
                portGroups: {
                    group1: {
                        inputRange: [1, 1],
                        outputRange: [1, 2]
                    }
                },
                inPorts,
                outPorts
            } });

            // Flow Variable Port can't be selected
            let flowVariablePort = wrapper.findAllComponents(NodePort).at(0);
            await flowVariablePort.vm.$emit('click');
            expect(flowVariablePort.props('selected')).toBe(false);

            // Click any port of group
            let groupPort = wrapper.findAllComponents(NodePort).at(3);
            await groupPort.vm.$emit('click');

            // Last group port is selected, clicked one isn't
            let lastGroupPort = wrapper.findAllComponents(NodePort).at(4);
            expect(groupPort.props('selected')).toBe(false);
            expect(lastGroupPort.props('selected')).toBe(true);
        });

        test('port can deselect itself', async () => {
            let { wrapper } = doMount({ customProps: { nodeKind: 'component' } });
            let normalPort = wrapper.findAllComponents(NodePort).at(1);
            normalPort.vm.$emit('click');
            await Vue.nextTick();

            expect(normalPort.props('selected')).toBe(true);

            // Deselect by event
            normalPort.vm.$emit('deselect');
            await Vue.nextTick();
            expect(normalPort.props('selected')).toBe(false);
        });

        test('port is deselected by selecting another', async () => {
            let { wrapper } = doMount({ customProps: { nodeKind: 'component' } });
            let normalPort = wrapper.findAllComponents(NodePort).at(1);
            normalPort.vm.$emit('click');
            await Vue.nextTick();

            expect(normalPort.props('selected')).toBe(true);

            // Deselect by selecting another port
            let otherPort = wrapper.findAllComponents(NodePort).at(3);
            otherPort.vm.$emit('click');
            await Vue.nextTick();

            expect(normalPort.props('selected')).toBe(false);
        });

        test('dragging a node deselects', async () => {
            let { wrapper, $store } = doMount({ customProps: { nodeKind: 'component' } });
            let normalPort = wrapper.findAllComponents(NodePort).at(1);
            normalPort.vm.$emit('click');
            await Vue.nextTick();

            expect(normalPort.props('selected')).toBe(true);

            // set custom state, to re-evaluate "isDragging"-Getter
            Vue.set($store.state.workflow, '__isDragging', true);
            await Vue.nextTick();

            expect(normalPort.props('selected')).toBe(false);
        });
    });

    it('always shows ports other than mickey-mouse', () => {
        let { wrapper } = doMount();
        let ports = wrapper.findAllComponents(NodePort);

        expect(ports.at(1).attributes().class).toBe('port');
        expect(ports.at(3).attributes().class).toBe('port');
        expect(ports.at(4).attributes().class).toBe('port');
    });

    describe('Mickey-Mouse ports', () => {
        it('only first ports of %s are mickey mouse ports', () => {
            let { wrapper } = doMount({ customProps: { isMetanode: 'false' } });
            let ports = wrapper.findAllComponents(NodePort);

            expect(ports.at(0).attributes().class).toMatch('mickey-mouse');
            expect(ports.at(1).attributes().class).not.toMatch('mickey-mouse');
            expect(ports.at(2).attributes().class).toMatch('mickey-mouse');
            expect(ports.at(3).attributes().class).not.toMatch('mickey-mouse');
            expect(ports.at(4).attributes().class).not.toMatch('mickey-mouse');
        });

        it('metanodes have no mickey-mouse ports', () => {
            let { wrapper } = doMount({ customProps: { isMetanode: 'false', nodeKind: 'metanode' } });
            let ports = wrapper.findAllComponents(NodePort).wrappers;

            ports.forEach(port => {
                expect(port.attributes().class).not.toMatch('mickey-mouse');
            });
        });

        it('connected ports are displayed', () => {
            let { wrapper } = doMount({ customProps: { isMetanode: 'false' } });
            let ports = wrapper.findAllComponents(NodePort);

            expect(ports.at(0).attributes().class).toMatch('connected');
            expect(ports.at(1).attributes().class).not.toMatch('connected');
        });

        it('hover fades-in mickey-mouse ports', () => {
            let { wrapper } = doMount({ customProps: { isMetanode: 'false', hover: true } });
            let ports = wrapper.findAllComponents(NodePort);

            // flowVariable ports fades in
            expect(ports.at(0).classes()).toContain('node-hover');
            expect(ports.at(2).classes()).toContain('node-hover');
        });

        it('hover fades-out mickey-mouse ports', () => {
            let { wrapper } = doMount({ customProps: { isMetanode: 'false', hover: false } });
            let ports = wrapper.findAllComponents(NodePort);

            // flowVariable ports fades out
            expect(ports.at(0).classes()).not.toContain('node-hover');
            expect(ports.at(2).classes()).not.toContain('node-hover');
        });
    });

    describe('Add-Port Placeholder', () => {
        it('render, setup, props', () => {
            let { wrapper } = doMount({ customProps: { nodeKind: 'component' } });
            let addPortPlaceholders = wrapper.findAllComponents(AddPortPlaceholder);

            expect(addPortPlaceholders.at(0).props('nodeId')).toBe('root:1');
            expect(addPortPlaceholders.at(1).props('nodeId')).toBe('root:1');

            expect(addPortPlaceholders.at(0).classes()).toContain('add-port');
            expect(addPortPlaceholders.at(1).classes()).toContain('add-port');

            expect(addPortPlaceholders.at(0).props('side')).toBe('input');
            expect(addPortPlaceholders.at(1).props('side')).toBe('output');

            expect(addPortPlaceholders.at(0).props('position')).toStrictEqual([-4.5, 37]);
            expect(addPortPlaceholders.at(1).props('position')).toStrictEqual([36.5, 37]);
        });

        it('not visible by default', () => {
            let { wrapper } = doMount({ customProps: { nodeKind: 'component' } });
            let addPortPlaceholders = wrapper.findAllComponents(AddPortPlaceholder);

            expect(addPortPlaceholders.at(0).classes()).not.toContain('node-hover');
            expect(addPortPlaceholders.at(1).classes()).not.toContain('node-hover');
        });

        it('visible on hover', () => {
            let { wrapper } = doMount({ customProps: { nodeKind: 'component', hover: true } });
            let addPortPlaceholders = wrapper.findAllComponents(AddPortPlaceholder);

            expect(addPortPlaceholders.at(0).classes()).toContain('node-hover');
            expect(addPortPlaceholders.at(1).classes()).toContain('node-hover');
        });

        it('visible on connector-hover', () => {
            let { wrapper } = doMount({ customProps: { nodeKind: 'component', connectorHover: true } });
            let addPortPlaceholders = wrapper.findAllComponents(AddPortPlaceholder);

            expect(addPortPlaceholders.at(0).classes()).toContain('connector-hover');
            expect(addPortPlaceholders.at(1).classes()).toContain('connector-hover');
        });

        it('visible if selected', () => {
            let { wrapper } = doMount({ customProps: { nodeKind: 'component', isSingleSelected: true } });
            let addPortPlaceholders = wrapper.findAllComponents(AddPortPlaceholder);

            expect(addPortPlaceholders.at(0).classes()).toContain('node-selected');
            expect(addPortPlaceholders.at(1).classes()).toContain('node-selected');
        });
    });

    describe('Add and remove node ports', () => {
        it('cant add ports if components or metanodes are linked or workflow is not writable', () => {
            let { wrapper } = doMount({ customProps: { nodeKind: 'component', isEditable: false } });

            expect(wrapper.findAllComponents(AddPortPlaceholder).length).toBe(0);
        });

        describe.each(['metanode', 'component'])('add ports for %s', (nodeKind) => {
            test.each(['input', 'output'])('on %s side', (side) => {
                let { wrapper, addNodePortMock } = doMount({ customProps: { nodeKind } });
                let addPortButton = wrapper.findAllComponents(AddPortPlaceholder).at(side === 'input' ? 0 : 1);
                addPortButton.vm.$emit('add-port', { typeId: 'type1', portGroup: 'table' });

                expect(addNodePortMock).toHaveBeenCalledWith(expect.anything(), {
                    nodeId: 'root:1',
                    side,
                    typeId: 'type1',
                    portGroup: 'table'
                });
            });
        });


        test.each(['input', 'output'])('add dynamic ports on %s side', (side) => {
            let { wrapper, addNodePortMock } = doMount({ customProps: {
                nodeKind: 'node',
                portGroups: {
                    group1: {
                        canAddInPort: true,
                        canAddOutPort: true,
                        supportedPortTypeIds: ['type1']
                    }
                }
            } });
            let addPortButton = wrapper.findAllComponents(AddPortPlaceholder).at(side === 'input' ? 0 : 1);
            addPortButton.vm.$emit('add-port', { typeId: 'type1', portGroup: 'group1' });

            expect(addNodePortMock).toHaveBeenCalledWith(expect.anything(), {
                nodeId: 'root:1',
                side,
                typeId: 'type1',
                portGroup: 'group1'
            });
        });

        describe.each(['metanode', 'component'])('remove port on %s', (nodeKind) => {
            test.each(['input', 'output'])('from %s side', (side) => {
                const inPorts = [
                    mockPort({ index: 0, connectedVia: ['inA'] }),
                    mockPort({ index: 1 })
                ];
                const outPorts = [
                    mockPort({ index: 0, outgoing: true, connectedVia: ['outA'] }),
                    mockPort({ index: 1, outgoing: true })
                ];
                let { wrapper, removeNodePortMock } = doMount({ customProps: {
                    nodeKind,
                    inPorts,
                    outPorts
                } });
                let port = wrapper.findAllComponents(NodePort).at(side === 'input' ? 1 : 3);
                port.vm.$emit('remove');

                expect(removeNodePortMock).toHaveBeenCalledWith(expect.anything(), {
                    index: 1,
                    nodeId: 'root:1',
                    side,
                    portGroup: null
                });
            });
        });

        test.each(['input', 'output'])('remove dynamic ports on %s side', (side) => {
            const inPorts = [
                mockPort({ index: 0, connectedVia: ['inA'] }),
                mockPort({ index: 1, portGroupId: 'group1' })
            ];
            const outPorts = [
                mockPort({ index: 0, outgoing: true, connectedVia: ['outA'] }),
                mockPort({ index: 1, outgoing: true, portGroupId: 'group1' })
            ];
            let { wrapper, removeNodePortMock } = doMount({ customProps: {
                nodeKind: 'node',
                portGroups: {
                    group1: {}
                },
                inPorts,
                outPorts
            } });
            let port = wrapper.findAllComponents(NodePort).at(side === 'input' ? 1 : 3);
            port.vm.$emit('remove');

            expect(removeNodePortMock).toHaveBeenCalledWith(expect.anything(), {
                nodeId: 'root:1',
                side,
                index: 1,
                portGroup: 'group1'
            });
        });
    });

    it.each([
        [{ index: 0, side: 'in' }, [true, false]],
        [{ index: 0, side: 'out' }, [false, true]],
        [{ index: 1, side: 'in' }, [false, false]],
        [{ index: 1, side: 'out' }, [false, false]]
    ])('target input port', (targetPort, result) => {
        // use only on port on each side
        const inPorts = [
            mockPort({ index: 0, connectedVia: ['inA'] })
        ];
        const outPorts = [
            mockPort({ index: 0, outgoing: true, connectedVia: ['outA'] })
        ];
        let { wrapper } = doMount({ customProps: {
            inPorts,
            outPorts,
            targetPort
        } });
        let ports = wrapper.findAllComponents(NodePort);
        const [inPort, outPort] = ports.wrappers;

        expect([
            inPort.props('targeted'),
            outPort.props('targeted')
        ]).toStrictEqual(result);
    });

    it.each([
        ['metanode'],
        ['component']
    ])('disables quick-node-add feature for %s', (nodeKind) => {
        let { wrapper } = doMount({ customProps: { nodeKind } });
        const ports = wrapper.findAllComponents(NodePort).wrappers;
        const allDisabled = ports.map(port => port.props('disableQuickNodeAdd')).every(disabled => disabled);

        expect(allDisabled).toBe(true);
    });
});
