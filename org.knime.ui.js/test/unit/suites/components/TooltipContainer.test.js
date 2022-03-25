import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import Vuex from 'vuex';
import Vue from 'vue';
import * as $shapes from '~/style/shapes';

import Tooltip from '~/components/Tooltip';
import TooltipContainer from '~/components/TooltipContainer';

describe('TooltipContainer', () => {
    let doShallowMount, wrapper, $store, storeConfig, tooltip, kanvasElement;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;
        $store = null;
        storeConfig = {
            canvas: {
                getters: {
                    fromCanvasCoordinates: () => ({ x, y }) => ({ x: x * 2, y: y * 2 })
                },
                state: {
                    zoomFactor: 1
                }
            },
            workflow: {
                mutations: {
                    setTooltip: (state, tooltip) => { state.tooltip = tooltip; }
                },
                state: {
                    tooltip
                }
            }
        };

        kanvasElement = {
            scrollLeft: 0,
            scrollTop: 0,
            offsetLeft: 0,
            offsetTop: 0,
            scrollEventListener: null,
            addEventListener: jest.fn().mockImplementation(
                (event, callback) => {
                    kanvasElement.scrollEventListener = callback;
                }
            ),
            removeEventListener: jest.fn()
        };

        doShallowMount = () => {
            $store = mockVuexStore(storeConfig);
            let mocks = { $shapes, $store };
            wrapper = shallowMount(TooltipContainer, { mocks });
            document.getElementById = (id) => id === 'kanvas' ? kanvasElement : null;
        };
    });

    test('no tooltip set', () => {
        doShallowMount();
        expect(wrapper.find('div.tooltip-container').exists()).toBe(true);
        expect(wrapper.findComponent(Tooltip).exists()).toBe(false);
    });

    it('closes tooltip on mouseleave', async () => {
        let tooltip = {
            anchorPoint: { x: 0, y: 0 },
            position: { x: 0, y: 0 }
        };

        doShallowMount();
        $store.commit('workflow/setTooltip', tooltip);
        await Vue.nextTick();

        wrapper.findComponent(Tooltip).trigger('mouseleave');
        expect(storeConfig.workflow.state.tooltip).toBe(null);
    });

    describe('positioning', () => {
        it('renders tooltip at position', async () => {
            let tooltip = {
                anchorPoint: { x: 10, y: 10 },
                position: { x: 10, y: 10 },
                gap: 10
            };

            doShallowMount();
            $store.commit('workflow/setTooltip', tooltip);
            await Vue.nextTick();

            expect(wrapper.findComponent(Tooltip).props()).toMatchObject({
                x: 40,
                y: 40,
                gap: 10
            });
        });

        it('scales gap in relation to sqrt of zoomFactor', async () => {
            storeConfig.canvas.state.zoomFactor = 9; // 900%
            let tooltip = {
                anchorPoint: { x: 0, y: 0 },
                position: { x: 0, y: 0 },
                gap: 10
            };

            doShallowMount();
            $store.commit('workflow/setTooltip', tooltip);
            await Vue.nextTick();

            expect(wrapper.findComponent(Tooltip).props()).toMatchObject({
                gap: 30
            });
        });

        it('shifts by kanvas offset', async () => {
            let tooltip = {
                anchorPoint: { x: 0, y: 0 },
                position: { x: 0, y: 0 }
            };
            kanvasElement.offsetLeft = 100;
            kanvasElement.offsetTop = 100;

            doShallowMount();
            $store.commit('workflow/setTooltip', tooltip);
            await Vue.nextTick();

            expect(wrapper.findComponent(Tooltip).props()).toMatchObject({
                x: 100,
                y: 100
            });
        });

        it('shifts by scroll offset', async () => {
            let tooltip = {
                anchorPoint: { x: 0, y: 0 },
                position: { x: 0, y: 0 }
            };
            kanvasElement.offsetLeft = 100;
            kanvasElement.offsetTop = 100;
            kanvasElement.scrollLeft = 100;
            kanvasElement.scrollTop = 100;

            doShallowMount();
            $store.commit('workflow/setTooltip', tooltip);
            await Vue.nextTick();

            expect(wrapper.findComponent(Tooltip).props()).toMatchObject({
                x: 0,
                y: 0
            });
        });

        it('passes other props', async () => {
            let tooltip = {
                position: { x: 0, y: 0 }, // necessary
                text: 'text',
                title: 'title',
                orientation: 'top',
                type: 'default',
                hoverable: true
            };
            doShallowMount();
            $store.commit('workflow/setTooltip', tooltip);
            await Vue.nextTick();

            expect(wrapper.findComponent(Tooltip).props()).toMatchObject({
                text: 'text',
                title: 'title',
                orientation: 'top',
                type: 'default',
                hoverable: true
            });
        });
    });

    describe('updating', () => {
        test('setting first tooltip adds scroll listener', async () => {
            let tooltip = {
                anchorPoint: { x: 0, y: 0 },
                position: { x: 0, y: 0 }
            };

            doShallowMount();
            $store.commit('workflow/setTooltip', tooltip);
            await Vue.nextTick();

            expect(kanvasElement.addEventListener).toHaveBeenCalledWith('scroll', wrapper.vm.onCanvasScroll);

            // test that it doesn't set another scroll listener
            $store.commit('workflow/setTooltip', { ...tooltip });
            await Vue.nextTick();
            expect(kanvasElement.addEventListener).toHaveBeenCalledTimes(1);
        });

        test('closing tooltip removes scroll listener', async () => {
            let tooltip = {
                position: { x: 0, y: 0 }
            };

            doShallowMount();
            $store.commit('workflow/setTooltip', tooltip);
            await Vue.nextTick();

            $store.commit('workflow/setTooltip', null);
            await Vue.nextTick();

            expect(kanvasElement.removeEventListener).toHaveBeenCalledWith('scroll', wrapper.vm.onCanvasScroll);
        });

        test('destruction of tooltipContainer removes scroll listener', () => {
            doShallowMount();
            wrapper.destroy();

            expect(kanvasElement.removeEventListener).toHaveBeenCalledWith('scroll', wrapper.vm.onCanvasScroll);
        });

        test('tooltip moves while scrolling', async () => {
            let tooltip = {
                anchorPoint: { x: 0, y: 0 },
                position: { x: 0, y: 0 }
            };

            doShallowMount();
            $store.commit('workflow/setTooltip', tooltip);
            await Vue.nextTick();
            expect(wrapper.findComponent(Tooltip).props()).toMatchObject({
                x: 0,
                y: 0
            });

            kanvasElement.scrollEventListener({ target: { scrollLeft: 50, scrollTop: 50 } });
            await Vue.nextTick();
            expect(wrapper.findComponent(Tooltip).props()).toMatchObject({
                x: -50,
                y: -50
            });
        });
    });
});
