/* eslint-disable no-magic-numbers */

import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import Vuex from 'vuex';
import Vue from 'vue';

import * as $shapes from '~/style/shapes';
import * as $colors from '~/style/colors';
import PortWithTooltip from '~/components/workflow/PortWithTooltip';
import Port from '~/components/workflow/Port';

describe('PortWithTooltip.vue', () => {
    let propsData, mocks, doShallowMount, wrapper, currentTooltip, stubs;
    const provide = {
        anchorPoint: { x: 123, y: 456 }
    };

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;
        propsData = {
            tooltipPosition: [5, 10],
            port: {
                optional: false,
                inactive: false,
                index: 0,
                type: 'table',
                color: '#123442',
                name: 'portName',
                info: 'portInfo',
                typeId: ''
            }
        };
        let $store = mockVuexStore({
            workflow: {
                mutations: {
                    setTooltip(state, tooltip) {
                        currentTooltip = tooltip;
                    }
                }
            }
        });
        mocks = { $shapes, $colors, $store };
        stubs = { Port };
        doShallowMount = () => {
            wrapper = shallowMount(PortWithTooltip, { propsData, mocks, provide, stubs });
        };
        jest.useFakeTimers();
    });
});
