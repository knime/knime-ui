import { shallowMount } from '@vue/test-utils';
import PortTabs, { portIconSize } from '~/components/output/PortTabs';
import TabBar from '~/webapps-common/ui/components/TabBar';
import Vue from 'vue';
import FlowVarTabIcon from '~/assets/flow-variables.svg?inline';

jest.mock('~/components/output/PortIconRenderer', () => jest.fn());
import portIcon from '~/components/output/PortIconRenderer';


describe('PortTabs.vue', () => {
    let doMount, wrapper, propsData;

    beforeEach(() => {
        propsData = {};

        doMount = () => {
            wrapper = shallowMount(PortTabs, { propsData });
        };
    });
    
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('passes "value" through', () => {
        propsData = {
            value: '5',
            node: { outPorts: [] }
        };
        doMount();

        expect(wrapper.findComponent(TabBar).props().value).toBe('5');
    });

    it('emits an "input"-event if TabBar changes', async () => {
        propsData = {
            value: '5',
            node: { outPorts: [] }
        };
        doMount();

        wrapper.findComponent(TabBar).vm.$emit('update:value', 1);
        await Vue.nextTick();
        expect(wrapper.emitted().input[0]).toStrictEqual([1]);
    });

    it('arranges tabs for metanode', () => {
        portIcon.mockReturnValueOnce('portIcon-fv').mockReturnValueOnce('portIcon-1');
        propsData = {
            node: {
                kind: 'metanode',
                outPorts: [
                    {
                        index: 0,
                        name: 'flowVariable port'
                    }, {
                        index: 1,
                        name: 'triangle port'
                    }
                ]
            }
        };
        doMount();
        
        expect(wrapper.findComponent(TabBar).props().possibleValues).toStrictEqual([
            { value: '0', label: '0: flowVariable port', icon: 'portIcon-fv' },
            { value: '1', label: '1: triangle port', icon: 'portIcon-1' }
        ]);
        expect(portIcon).toHaveBeenCalledWith(expect.anything(), portIconSize);
    });

    it('arranges tabs for normal node', () => {
        portIcon.mockReturnValueOnce('portIcon-1');
        propsData = {
            node: {
                kind: 'node',
                outPorts: [
                    {
                        index: 0,
                        name: 'flowVariable port'
                    }, {
                        index: 1,
                        name: 'triangle port'
                    }
                ]
            }
        };
        doMount();

        expect(wrapper.findComponent(TabBar).props().possibleValues).toStrictEqual([
            { value: '1', label: '1: triangle port', icon: 'portIcon-1' },
            { value: '0', label: 'Flow Variables', icon: FlowVarTabIcon }
        ]);
        expect(portIcon).toHaveBeenCalledWith(expect.anything(), portIconSize);
    });
});
