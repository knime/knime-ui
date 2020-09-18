/* eslint-disable no-magic-numbers */
import { shallowMount, createLocalVue } from '@vue/test-utils';

import NodeState from '~/components/NodeState';
import * as $shapes from '~/style/shapes';
import * as $colors from '~/style/colors';
import muteConsole from '~/webapps-common/util/test-utils/muteConsole';

describe('NodeState.vue', () => {
    let propsData, mocks, wrapper, mount;

    beforeAll(() => {
        createLocalVue();
    });

    beforeEach(() => {
        propsData = {
            executionState: null,
            progress: null,
            error: null,
            warning: null
        };
        mocks = { $shapes, $colors };
        mount = () => { wrapper = shallowMount(NodeState, { propsData, mocks }); };
    });


    const getTrafficLights = () => {
        let lights = wrapper.findAll('g g circle').wrappers.map(el => {
            const { fill, stroke } = el.attributes();
            return { fill, stroke };
        });
        return lights;
    };

    it.each([
        ['IDLE', [
            { fill: $colors.trafficLight.red, stroke: $colors.trafficLight.redBorder },
            { fill: $colors.trafficLight.inactive, stroke: $colors.trafficLight.inactiveBorder },
            { fill: $colors.trafficLight.inactive, stroke: $colors.trafficLight.inactiveBorder }
        ]],
        ['CONFIGURED', [
            { fill: $colors.trafficLight.inactive, stroke: $colors.trafficLight.inactiveBorder },
            { fill: $colors.trafficLight.yellow, stroke: $colors.trafficLight.yellowBorder },
            { fill: $colors.trafficLight.inactive, stroke: $colors.trafficLight.inactiveBorder }
        ]],
        ['EXECUTED', [
            { fill: $colors.trafficLight.inactive, stroke: $colors.trafficLight.inactiveBorder },
            { fill: $colors.trafficLight.inactive, stroke: $colors.trafficLight.inactiveBorder },
            { fill: $colors.trafficLight.green, stroke: $colors.trafficLight.greenBorder }
        ]],
        // TODO NXT-279: for now halted is the same state as executed
        ['HALTED', [
            { fill: $colors.trafficLight.inactive, stroke: $colors.trafficLight.inactiveBorder },
            { fill: $colors.trafficLight.inactive, stroke: $colors.trafficLight.inactiveBorder },
            { fill: $colors.trafficLight.green, stroke: $colors.trafficLight.greenBorder }
        ]],
        [null, [
            { fill: $colors.trafficLight.inactive, stroke: $colors.trafficLight.inactiveBorder },
            { fill: $colors.trafficLight.inactive, stroke: $colors.trafficLight.inactiveBorder },
            { fill: $colors.trafficLight.inactive, stroke: $colors.trafficLight.inactiveBorder }
        ]],
        ['any other state', []]
    ])('draws traffic lights for state %s', (state, style) => {
        if (state) {
            propsData.executionState = state;
        }
        muteConsole(mount);
        expect(getTrafficLights()).toStrictEqual(style);
    });


    it('shows all null state', () => {
        expect(wrapper.find('*').text()).toBe('');
        expect(wrapper.find('.warning').exists()).toBe(false);
        expect(wrapper.find('.error').exists()).toBe(false);
        expect(wrapper.find('.progress-circle').exists()).toBe(false);
    });

    it('shows "queued"', () => {
        propsData.executionState = 'QUEUED';
        mount();
        expect(wrapper.find('*').text()).toBe('queued');
    });

    it('shows dancing ball', () => {
        propsData.executionState = 'EXECUTING';
        propsData.progress = null;
        mount();

        expect(wrapper.find('.progress-circle').exists()).toBe(true);
        expect(wrapper.find('*').text()).toBe('');
    });

    it('shows progress percentage', () => {
        propsData.executionState = 'EXECUTING';
        propsData.progress = 50;
        mount();

        expect(wrapper.find('.progress-circle').exists()).toBe(false);
        expect(wrapper.find('*').text()).toMatch('50%');
    });

    it('shows error indicator', () => {
        propsData.error = 'error message';
        propsData.warning = 'warning message';
        mount();

        expect(wrapper.find('.error').exists()).toBe(true);
        expect(wrapper.find('.warning').exists()).toBe(false);
    });

    it('shows warning indicator', () => {
        propsData.warning = 'warning message';
        mount();

        expect(wrapper.find('.warning').exists()).toBe(true);
        expect(wrapper.find('.error').exists()).toBe(false);
    });
});
