import * as Vue from 'vue';
import { shallowMount } from '@vue/test-utils';

import FlowVarTabIcon from 'webapps-common/ui/assets/img/icons/both-flow-variables.svg';
import TabBar from 'webapps-common/ui/components/TabBar.vue';

import portIcon from '@/components/common/PortIconRenderer';
import PortTabs, { portIconSize } from '../PortTabs.vue';

vi.mock('@/components/common/PortIconRenderer', () => ({ default: vi.fn() }));

describe('PortTabs.vue', () => {
    const mockFeatureFlags = {
        shouldDisplayEmbeddedViews: vi.fn(() => true)
    };

    const doShallowMount = (props = {}) => shallowMount(PortTabs, {
        props,
        global: {
            mocks: { $features: mockFeatureFlags }
        }
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('passes "modelValue" through', () => {
        const wrapper = doShallowMount({
            modelValue: '5',
            node: { outPorts: [] }
        });

        expect(wrapper.findComponent(TabBar).props('modelValue')).toBe('5');
    });

    it('emits an "update:modelValue"-event if TabBar changes', async () => {
        const wrapper = doShallowMount({
            modelValue: '5',
            node: { outPorts: [] }
        });

        wrapper.findComponent(TabBar).vm.$emit('update:modelValue', 1);
        await Vue.nextTick();
        expect(wrapper.emitted('update:modelValue')[0]).toStrictEqual([1]);
    });

    it('arranges tabs for metanode', () => {
        portIcon.mockReturnValueOnce('portIcon-fv').mockReturnValueOnce('portIcon-1');
        const wrapper = doShallowMount({
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
        });

        expect(wrapper.findComponent(TabBar).props('possibleValues')).toStrictEqual([
            { value: '0', label: '0: flowVariable port', icon: 'portIcon-fv' },
            { value: '1', label: '1: triangle port', icon: 'portIcon-1' }
        ]);
        expect(portIcon).toHaveBeenCalledWith(expect.anything(), portIconSize);
    });

    it('displays view tab as the first tab', () => {
        portIcon.mockReturnValue('portIcon');

        const wrapper = doShallowMount({
            hasViewTab: true,
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
        });

        expect(wrapper.findComponent(TabBar).props().possibleValues).toStrictEqual([
            { value: 'view', label: 'View', icon: expect.anything() },
            { value: '1', label: '1: triangle port', icon: expect.anything() },
            { value: '0', label: 'Flow Variables', icon: expect.anything() }
        ]);
        expect(portIcon).toHaveBeenCalledWith(expect.anything(), portIconSize);
    });

    it('arranges tabs for normal node', () => {
        portIcon.mockReturnValueOnce('portIcon-1');
        const wrapper = doShallowMount({
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
        });

        expect(wrapper.findComponent(TabBar).props('possibleValues')).toStrictEqual([
            { value: '1', label: '1: triangle port', icon: 'portIcon-1' },
            { value: '0', label: 'Flow Variables', icon: FlowVarTabIcon }
        ]);
        expect(portIcon).toHaveBeenCalledWith(expect.anything(), portIconSize);
    });

    it('should not display view tab when feature flag is set to false', () => {
        mockFeatureFlags.shouldDisplayEmbeddedViews.mockImplementation(() => false);

        const wrapper = doShallowMount({
            hasViewTab: true,
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
        });

        expect(wrapper.findComponent(TabBar).props().possibleValues).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({ value: 'view', label: 'View', icon: expect.anything() })
            ])
        );
    });
});
