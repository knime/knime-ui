import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import Vuex from 'vuex';
import Vue from 'vue';

import * as $shapes from '~/style/shapes';
import * as $colors from '~/style/colors';
import PortWithTooltip from '~/components/PortWithTooltip';
import Port from '~/components/Port';

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
            x: 5,
            y: 10,
            port: {
                optional: false,
                inactive: false,
                index: 0,
                type: 'table',
                color: '#123442',
                name: 'portName',
                info: 'portInfo'
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
    });

    it('shows tooltips on table ports', async () => {
        doShallowMount();
        wrapper.findComponent(Port).trigger('mouseenter');
        await Vue.nextTick();
        expect(currentTooltip).toStrictEqual({
            anchorPoint: { x: 123, y: 456 },
            text: 'portInfo',
            title: 'portName',
            orientation: 'top',
            position: {
                x: 5,
                y: 5.5
            },
            touchable: false,
            gap: 6
        });

        wrapper.findComponent(Port).trigger('mouseleave');
        await Vue.nextTick();
        expect(currentTooltip).toBeFalsy();
    });

    it('shows tooltips for non-table ports', async () => {
        propsData.port.type = 'other';

        doShallowMount();
        wrapper.findComponent(Port).trigger('mouseenter');
        await Vue.nextTick();
        expect(currentTooltip).toStrictEqual({
            anchorPoint: { x: 123, y: 456 },
            text: 'portInfo',
            title: 'portName',
            orientation: 'top',
            position: {
                x: 5,
                y: 5.5 // more space than for table
            },
            touchable: false,
            gap: 8
        });
    });
});
