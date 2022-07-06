/* eslint-disable no-magic-numbers */
import { shallowMount } from '@vue/test-utils';
import Vue from 'vue';

import * as $shapes from '~/style/shapes';
import NodePorts from '~/components/workflow/NodePorts';
import DraggablePortWithTooltip from '~/components/workflow/DraggablePortWithTooltip';
import AddPortPlaceholder from '~/components/workflow/AddPortPlaceholder';

let wrapper, propsData, doMount;

const mockPort = ({ index, connectedVia = [] }) => ({
    inactive: false,
    optional: false,
    index,
    type: 'other',
    connectedVia
});

describe('NodePorts.vue', () => {
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
            nodeId: 'root:1',
            isMetanode: false,
            canAddPorts: false,
            targetPort: null,
            hover: false,
            connectorHover: false,
            isSingleConnected: false
        };
        
        doMount = () => {
            let mocks = { $shapes };
            wrapper = shallowMount(NodePorts, {
                propsData,
                mocks
            });
        };
    });

    describe('Port positions', () => {
        it('for meta node', () => {
            propsData.isMetanode = true;
            doMount();

            const ports = wrapper.findAllComponents(DraggablePortWithTooltip).wrappers;
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

        it('for component/native node', () => {
            propsData.isMetanode = false;
            doMount();

            const ports = wrapper.findAllComponents(DraggablePortWithTooltip).wrappers;
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

        test('placeholderPositions on component', () => {
            propsData.canAddPorts = true;
            doMount();

            const addPortPlaceholders = wrapper.findAllComponents(AddPortPlaceholder);
            expect(addPortPlaceholders.at(0).props('position')).toStrictEqual([-4.5, 37]);
            expect(addPortPlaceholders.at(1).props('position')).toStrictEqual([36.5, 37]);
        });
    });

    it('always shows ports other than mickey-mouse', () => {
        doMount();

        let ports = wrapper.findAllComponents(DraggablePortWithTooltip);
        expect(ports.at(1).attributes().class).toBe('port');
        expect(ports.at(3).attributes().class).toBe('port');
        expect(ports.at(4).attributes().class).toBe('port');
    });

    describe('Mickey-Mouse ports', () => {
        beforeEach(() => {
            propsData.isMetanode = false;
        });

        test('only first ports of %s are mickey mouse ports', () => {
            doMount();

            let ports = wrapper.findAllComponents(DraggablePortWithTooltip);
            expect(ports.at(0).attributes().class).toMatch('mickey-mouse');
            expect(ports.at(1).attributes().class).not.toMatch('mickey-mouse');
            expect(ports.at(2).attributes().class).toMatch('mickey-mouse');
            expect(ports.at(3).attributes().class).not.toMatch('mickey-mouse');
            expect(ports.at(4).attributes().class).not.toMatch('mickey-mouse');
        });

        test('metanodes have no mickey-mouse ports', () => {
            propsData.isMetanode = true;
            doMount();

            let ports = wrapper.findAllComponents(DraggablePortWithTooltip).wrappers;
            ports.forEach(port => {
                expect(port.attributes().class).not.toMatch('mickey-mouse');
            });
        });

        test('connected ports are displayed', () => {
            doMount();

            let ports = wrapper.findAllComponents(DraggablePortWithTooltip);
            expect(ports.at(0).attributes().class).toMatch('connected');
            expect(ports.at(1).attributes().class).not.toMatch('connected');
        });

        it('hover fades-in mickey-mouse ports', () => {
            propsData.hover = true;
            doMount();

            let ports = wrapper.findAllComponents(DraggablePortWithTooltip);

            // flowVariable ports fades in
            expect(ports.at(0).classes()).toContain('node-hover');
            expect(ports.at(2).classes()).toContain('node-hover');
        });

        it('hover fades-out mickey-mouse ports', () => {
            propsData.hover = false;
            doMount();

            let ports = wrapper.findAllComponents(DraggablePortWithTooltip);

            // flowVariable ports fades out
            expect(ports.at(0).classes()).not.toContain('node-hover');
            expect(ports.at(2).classes()).not.toContain('node-hover');
        });
    });

    describe('Add-Port Placeholder', () => {
        beforeEach(() => {
            propsData.canAddPorts = true;
        });

        test('AddPortPlaceholders disabled by default', () => {
            propsData.canAddPorts = false;
            doMount();

            expect(wrapper.findComponent(AddPortPlaceholder).exists()).toBe(false);
        });

        test('render, setup, props', () => {
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

        test('show and hide with port type menu', () => {
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

        test('opening menu again aborts delayed fade out', () => {
            doMount();
                
            let addPortPlaceholder = wrapper.findComponent(AddPortPlaceholder);
                
            jest.useFakeTimers();
            addPortPlaceholder.trigger('open-port-type-menu');
            addPortPlaceholder.trigger('close-port-type-menu');
            addPortPlaceholder.trigger('open-port-type-menu');
            jest.runAllTimers();
                
            expect(addPortPlaceholder.element.style.opacity).toBe('1');
        });

        test('not visible by default', () => {
            doMount();

            let addPortPlaceholders = wrapper.findAllComponents(AddPortPlaceholder);
            expect(addPortPlaceholders.at(0).classes()).not.toContain('node-hover');
            expect(addPortPlaceholders.at(1).classes()).not.toContain('node-hover');
        });

        test('visible on hover', () => {
            propsData.hover = true;
            doMount();

            let addPortPlaceholders = wrapper.findAllComponents(AddPortPlaceholder);
            expect(addPortPlaceholders.at(0).classes()).toContain('node-hover');
            expect(addPortPlaceholders.at(1).classes()).toContain('node-hover');
        });

        test('visible on connector-hover', () => {
            propsData.connectorHover = true;
            doMount();

            let addPortPlaceholders = wrapper.findAllComponents(AddPortPlaceholder);
            expect(addPortPlaceholders.at(0).classes()).toContain('connector-hover');
            expect(addPortPlaceholders.at(1).classes()).toContain('connector-hover');
        });

        test('visible if selected', () => {
            propsData.isSingleSelected = true;
            doMount();

            let addPortPlaceholders = wrapper.findAllComponents(AddPortPlaceholder);
            expect(addPortPlaceholders.at(0).classes()).toContain('node-selected');
            expect(addPortPlaceholders.at(1).classes()).toContain('node-selected');
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

        let ports = wrapper.findAllComponents(DraggablePortWithTooltip);
        const [inPort, outPort] = ports.wrappers;
        
        expect([
            inPort.props('targeted'),
            outPort.props('targeted')
        ]).toStrictEqual(result);
    });

    test('portBarBottom', async () => {
        doMount();

        expect(wrapper.vm.portBarBottom).toBe(31);
        
        // reduce number of outports to 1
        let newOutPorts = [propsData.outPorts[0]];
        wrapper.setProps({ outPorts: newOutPorts });
        await Vue.nextTick();

        expect(wrapper.vm.portBarBottom).toBe(20.5);
    });
});
