import Vue from 'vue';
import Vuex from 'vuex';
import { shallowMount, createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '@/test/test-utils';

import * as $shapes from '@/style/shapes.mjs';

import AddPortPlaceholder from '../AddPortPlaceholder.vue';
import NodePorts from '../NodePorts.vue';
import NodePort from '../NodePort.vue';

const mockPort = ({ index, connectedVia = [] }) => ({
    inactive: false,
    optional: false,
    index,
    type: 'other',
    connectedVia
});

describe('NodePorts.vue', () => {
    let wrapper, propsData, doMount, storeConfig, $store;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;
        
        propsData = {
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
            isEditable: false,
            targetPort: null,
            hover: false,
            connectorHover: false,
            isSingleConnected: false
        };

        storeConfig = {
            workflow: {
                state: () => ({
                    __isDragging: false
                }),
                getters: {
                    isWritable: () => true,
                    isDragging: (state) => state.__isDragging
                },
                actions: {
                    addNodePort: jest.fn(),
                    removeNodePort: jest.fn()
                }
            }
        };
        
        doMount = () => {
            $store = mockVuexStore(storeConfig);

            let mocks = { $shapes, $store };
            wrapper = shallowMount(NodePorts, {
                propsData,
                mocks
            });
        };
    });

    describe('Port positions', () => {
        it('for meta node', () => {
            propsData.nodeKind = 'metanode';
            doMount();

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
            propsData.nodeKind = nodeKind;
            doMount();

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
            propsData.isEditable = true;
            propsData.nodeKind = 'component';
            doMount();

            const addPortPlaceholders = wrapper.findAllComponents(AddPortPlaceholder);
            expect(addPortPlaceholders.at(0).props('position')).toStrictEqual([-4.5, 37]);
            expect(addPortPlaceholders.at(1).props('position')).toStrictEqual([36.5, 37]);
        });
    });

    describe('Port selection', () => {
        test('no port can be selected', async () => {
            propsData.nodeKind = 'node';
            propsData.portGroups = null;
            doMount();

            let somePort = wrapper.findComponent(NodePort);
            somePort.vm.$emit('click');
            await Vue.nextTick();

            let allPorts = wrapper.findAllComponents(NodePort).wrappers;
            expect(allPorts.every(port => port.props('selected') === false)).toBeTruthy();
        });

        test('ports cant be selected on a write-protected workflow', async () => {
            propsData.nodeKind = 'metanode';
            storeConfig.workflow.getters.isWritable = () => false;
            doMount();

            let firstPort = wrapper.findAllComponents(NodePort).at(0);
            firstPort.vm.$emit('click');
            await Vue.nextTick();

            expect(firstPort.props('selected')).toBe(false);
        });

        test('Metanode', async () => {
            propsData.nodeKind = 'metanode';
            doMount();

            let firstPort = wrapper.findAllComponents(NodePort).at(0);
            firstPort.vm.$emit('click');
            await Vue.nextTick();

            expect(firstPort.props('selected')).toBe(true);
        });

        test('Component', async () => {
            propsData.nodeKind = 'component';
            doMount();

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
            propsData.nodeKind = 'node';
            propsData.inPorts[1].portGroupId = 'group1';
            propsData.outPorts[1].portGroupId = 'group1';
            propsData.outPorts[2].portGroupId = 'group1';
            propsData.portGroups = {
                group1: {
                    inputRange: [1, 1],
                    outputRange: [1, 2]
                }
            };
            doMount();

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
            propsData.nodeKind = 'component';
            doMount();

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
            propsData.nodeKind = 'component';
            doMount();
            
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
            propsData.nodeKind = 'component';
            doMount();
            
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
        doMount();

        let ports = wrapper.findAllComponents(NodePort);
        expect(ports.at(1).attributes().class).toBe('port');
        expect(ports.at(3).attributes().class).toBe('port');
        expect(ports.at(4).attributes().class).toBe('port');
    });

    describe('Mickey-Mouse ports', () => {
        beforeEach(() => {
            propsData.isMetanode = false;
        });

        it('only first ports of %s are mickey mouse ports', () => {
            doMount();

            let ports = wrapper.findAllComponents(NodePort);
            expect(ports.at(0).attributes().class).toMatch('mickey-mouse');
            expect(ports.at(1).attributes().class).not.toMatch('mickey-mouse');
            expect(ports.at(2).attributes().class).toMatch('mickey-mouse');
            expect(ports.at(3).attributes().class).not.toMatch('mickey-mouse');
            expect(ports.at(4).attributes().class).not.toMatch('mickey-mouse');
        });

        it('metanodes have no mickey-mouse ports', () => {
            propsData.nodeKind = 'metanode';
            doMount();

            let ports = wrapper.findAllComponents(NodePort).wrappers;
            ports.forEach(port => {
                expect(port.attributes().class).not.toMatch('mickey-mouse');
            });
        });

        it('connected ports are displayed', () => {
            doMount();

            let ports = wrapper.findAllComponents(NodePort);
            expect(ports.at(0).attributes().class).toMatch('connected');
            expect(ports.at(1).attributes().class).not.toMatch('connected');
        });

        it('hover fades-in mickey-mouse ports', () => {
            propsData.hover = true;
            doMount();

            let ports = wrapper.findAllComponents(NodePort);

            // flowVariable ports fades in
            expect(ports.at(0).classes()).toContain('node-hover');
            expect(ports.at(2).classes()).toContain('node-hover');
        });

        it('hover fades-out mickey-mouse ports', () => {
            propsData.hover = false;
            doMount();

            let ports = wrapper.findAllComponents(NodePort);

            // flowVariable ports fades out
            expect(ports.at(0).classes()).not.toContain('node-hover');
            expect(ports.at(2).classes()).not.toContain('node-hover');
        });
    });

    describe('Add-Port Placeholder', () => {
        beforeEach(() => {
            propsData.nodeKind = 'component';
        });

        it('render, setup, props', () => {
            doMount();

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

        it('show and hide with port type menu', () => {
            doMount();
                
            let addPortPlaceholder = wrapper.findComponent(AddPortPlaceholder);
            expect(addPortPlaceholder.element.style.opacity).toBe('');
                
            addPortPlaceholder.trigger('open-port-type-menu');
            expect(addPortPlaceholder.element.style.opacity).toBe('1');
                
            // wait for 1000ms
            jest.useFakeTimers();
            addPortPlaceholder.trigger('close-port-type-menu');
            jest.runAllTimers();

            expect(addPortPlaceholder.element.style.opacity).toBe('');
        });

        it('opening menu again aborts delayed fade out', () => {
            doMount();
                
            let addPortPlaceholder = wrapper.findComponent(AddPortPlaceholder);
                
            jest.useFakeTimers();
            addPortPlaceholder.trigger('open-port-type-menu');
            addPortPlaceholder.trigger('close-port-type-menu');
            addPortPlaceholder.trigger('open-port-type-menu');
            jest.runAllTimers();
                
            expect(addPortPlaceholder.element.style.opacity).toBe('1');
        });

        it('not visible by default', () => {
            doMount();

            let addPortPlaceholders = wrapper.findAllComponents(AddPortPlaceholder);
            expect(addPortPlaceholders.at(0).classes()).not.toContain('node-hover');
            expect(addPortPlaceholders.at(1).classes()).not.toContain('node-hover');
        });

        it('visible on hover', () => {
            propsData.hover = true;
            doMount();

            let addPortPlaceholders = wrapper.findAllComponents(AddPortPlaceholder);
            expect(addPortPlaceholders.at(0).classes()).toContain('node-hover');
            expect(addPortPlaceholders.at(1).classes()).toContain('node-hover');
        });

        it('visible on connector-hover', () => {
            propsData.connectorHover = true;
            doMount();

            let addPortPlaceholders = wrapper.findAllComponents(AddPortPlaceholder);
            expect(addPortPlaceholders.at(0).classes()).toContain('connector-hover');
            expect(addPortPlaceholders.at(1).classes()).toContain('connector-hover');
        });

        it('visible if selected', () => {
            propsData.isSingleSelected = true;
            doMount();

            let addPortPlaceholders = wrapper.findAllComponents(AddPortPlaceholder);
            expect(addPortPlaceholders.at(0).classes()).toContain('node-selected');
            expect(addPortPlaceholders.at(1).classes()).toContain('node-selected');
        });
    });

    describe('Add and remove node ports', () => {
        it('cant add ports if not writable', () => {
            propsData.nodeKind = 'component';
            storeConfig.workflow.getters.isWritable = () => false;
            doMount();

            expect(wrapper.findAllComponents(AddPortPlaceholder).length).toBe(0);
        });

        describe.each(['metanode', 'component'])('add ports for %s', (nodeKind) => {
            test.each(['input', 'output'])('on %s side', (side) => {
                propsData.nodeKind = nodeKind;
                doMount();

                let addPortButton = wrapper.findAllComponents(AddPortPlaceholder).at(side === 'input' ? 0 : 1);
                addPortButton.vm.$emit('add-port', { typeId: 'type1', portGroup: 'table' });
                
                expect(storeConfig.workflow.actions.addNodePort).toHaveBeenCalledWith(expect.anything(), {
                    nodeId: 'root:1',
                    side,
                    typeId: 'type1',
                    portGroup: 'table'
                });
            });
        });

       
        test.each(['input', 'output'])('add dynamic ports on %s side', (side) => {
            propsData.nodeKind = 'node';
            propsData.portGroups = {
                group1: {
                    canAddInPort: true,
                    canAddOutPort: true,
                    supportedPortTypeIds: ['type1']
                }
            };
            doMount();

            let addPortButton = wrapper.findAllComponents(AddPortPlaceholder).at(side === 'input' ? 0 : 1);
            addPortButton.vm.$emit('add-port', { typeId: 'type1', portGroup: 'group1' });
                
            expect(storeConfig.workflow.actions.addNodePort).toHaveBeenCalledWith(expect.anything(), {
                nodeId: 'root:1',
                side,
                typeId: 'type1',
                portGroup: 'group1'
            });
        });

        describe.each(['metanode', 'component'])('remove port on %s', (nodeKind) => {
            test.each(['input', 'output'])('from %s side', (side) => {
                propsData.nodeKind = nodeKind;
                propsData.inPorts.length = 2;
                propsData.outPorts.length = 2;
                doMount();
                
                let port = wrapper.findAllComponents(NodePort).at(side === 'input' ? 1 : 3);
                port.vm.$emit('remove');
                
                expect(storeConfig.workflow.actions.removeNodePort).toHaveBeenCalledWith(expect.anything(), {
                    index: 1,
                    nodeId: 'root:1',
                    side,
                    portGroup: undefined
                });
            });
        });

        test.each(['input', 'output'])('remove dynamic ports on %s side', (side) => {
            propsData.nodeKind = 'node';
            propsData.inPorts[1].portGroupId = 'group1';
            propsData.outPorts[1].portGroupId = 'group1';

            propsData.portGroups = {
                group1: { }
            };
            doMount();

            let port = wrapper.findAllComponents(NodePort).at(side === 'input' ? 1 : 3);
            port.vm.$emit('remove');
                
            expect(storeConfig.workflow.actions.removeNodePort).toHaveBeenCalledWith(expect.anything(), {
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
        propsData.inPorts.length = 1;
        propsData.outPorts.length = 1;
        propsData.targetPort = targetPort;
        doMount();

        let ports = wrapper.findAllComponents(NodePort);
        const [inPort, outPort] = ports.wrappers;
        
        expect([
            inPort.props('targeted'),
            outPort.props('targeted')
        ]).toStrictEqual(result);
    });
});
