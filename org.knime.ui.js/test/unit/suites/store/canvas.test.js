/* eslint-disable no-magic-numbers */

import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import Vue from 'vue';
import Vuex from 'vuex';
import * as canvasStoreConfig from '~/store/canvas';
const { defaultZoomFactor, minZoomFactor, maxZoomFactor, zoomMultiplier } = canvasStoreConfig;

const round = n => {
    const precision = 10;
    return Number(n.toFixed(precision));
};
const findDelta = factor => Math.log(factor) / Math.log(zoomMultiplier);

describe('canvas store', () => {
    let localVue, store, workflowBounds, scrollContainer;

    beforeAll(() => {
        localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        workflowBounds = {
            left: 0,
            top: 0,
            right: 100,
            bottom: 100
        };
        scrollContainer = {
            scrollLeft: 0,
            scrollTop: 0,
            scrollTo: jest.fn().mockImplementation((left, top) => {
                scrollContainer.scrollLeft = left;
                scrollContainer.scrollTop = top;
            })
        };
        store = mockVuexStore({
            canvas: {
                ...canvasStoreConfig,
                state: {
                    ...canvasStoreConfig.state(),
                    containerSize: { width: 200, height: 200 },
                    getScrollContainerElement: () => scrollContainer
                }
            },
            workflow: {
                getters: {
                    workflowBounds() {
                        return workflowBounds;
                    }
                }
            }
        });
    });

    describe('mutations', () => {
        test('set & get ScrollContainerElement', () => {
            store.commit('canvas/setScrollContainerElement', 2);
            expect(store.state.canvas.getScrollContainerElement()).toBe(2);
        });

        test('restoreState - no saved state', () => {
            store.commit('canvas/restoreState', null);
            expect(store.state.canvas.zoomFactor).toBe(defaultZoomFactor);
            expect(scrollContainer.scrollLeft).toBe(0);
            expect(scrollContainer.scrollTop).toBe(0);
        });

        test('restoreState - saved state', async () => {
            store.commit('canvas/restoreState', {
                zoomFactor: 2,
                scrollLeft: 2,
                scrollTop: 1
            });
            expect(store.state.canvas.zoomFactor).toBe(2);

            await Vue.nextTick();
            expect(scrollContainer.scrollLeft).toBe(2);
            expect(scrollContainer.scrollTop).toBe(1);
        });

        test('resetZoom', () => {
            store.commit('canvas/setFactor', defaultZoomFactor + 1);
            store.commit('canvas/resetZoom');
            expect(store.state.canvas.zoomFactor).toBe(defaultZoomFactor);
        });

        test('setFactor', () => {
            store.commit('canvas/setFactor', maxZoomFactor + 1);
            expect(store.state.canvas.zoomFactor).toBe(maxZoomFactor);

            store.commit('canvas/setFactor', minZoomFactor - 1);
            expect(store.state.canvas.zoomFactor).toBe(minZoomFactor);

            store.commit('canvas/setFactor', defaultZoomFactor);
            expect(store.state.canvas.zoomFactor).toBe(defaultZoomFactor);
        });

        test('setSuggestPanning', () => {
            store.commit('canvas/setSuggestPanning', true);
            expect(store.state.canvas.suggestPanning).toBe(true);

            store.commit('canvas/setSuggestPanning', false);
            expect(store.state.canvas.suggestPanning).toBe(false);
        });

        test('setContainerSize', () => {
            store.commit('canvas/setContainerSize', { width: 5, height: 5 });
            expect(store.state.canvas.containerSize).toStrictEqual({
                width: 5,
                height: 5
            });
        });

        describe('zoomWithPointer', () => {
            let state;

            beforeEach(() => {
                state = store.state.canvas;
            });

            it('exponential zoom', () => {
                expect(state.zoomFactor).toBe(1);

                store.commit('canvas/zoomWithPointer', { delta: 1 });
                expect(state.zoomFactor).toBe(zoomMultiplier);

                store.commit('canvas/zoomWithPointer', { delta: 1 });
                expect(state.zoomFactor).toBe(zoomMultiplier * zoomMultiplier);

                store.commit('canvas/zoomWithPointer', { delta: -2 });
                expect(round(state.zoomFactor)).toBe(1);

                store.commit('canvas/zoomWithPointer', { delta: -1 });
                expect(round(state.zoomFactor)).toBe(round(1 / zoomMultiplier));

                store.commit('canvas/zoomWithPointer', { delta: -1 });
                expect(round(state.zoomFactor)).toBe(round(1 / zoomMultiplier / zoomMultiplier));
            });

            it('respects max and min zoom', () => {
                const tooManyZoomSteps = 10000;
                expect(state.zoomFactor).toBe(1);

                store.commit('canvas/zoomWithPointer', { delta: -tooManyZoomSteps });
                expect(state.zoomFactor).toBe(minZoomFactor);

                store.commit('canvas/zoomWithPointer', { delta: tooManyZoomSteps });
                expect(state.zoomFactor).toBe(maxZoomFactor);
            });

            test('content bigger than container - pointer in upper-left corner', () => {
                store.commit('canvas/setFactor', 1);
                store.commit('canvas/setContainerSize', {
                    width: 50,
                    height: 50
                });
                workflowBounds = {
                    left: 0,
                    top: 0,
                    right: 50,
                    bottom: 50
                };

                let delta = findDelta(2); // zoom to 200%
                store.commit('canvas/zoomWithPointer', { delta, cursorX: 0, cursorY: 0, scrollX: 0, scrollY: 0 });
                expect(state.zoomFactor).toBe(2);

                let scrollContainer = state.getScrollContainerElement();
                expect(scrollContainer.scrollLeft).toBe(0);
                expect(scrollContainer.scrollTop).toBe(0);
            });

            test('content bigger than container - pointer in bottom-right corner', () => {
                store.commit('canvas/setFactor', 1);
                store.commit('canvas/setContainerSize', {
                    width: 50,
                    height: 50
                });
                workflowBounds = {
                    left: 0,
                    top: 0,
                    right: 50,
                    bottom: 50
                };

                let delta = findDelta(2); // zoom to 200%
                // pointer is in bottom right corner of workflow before zoom
                store.commit('canvas/zoomWithPointer', { delta, cursorX: 50, cursorY: 50, scrollX: 0, scrollY: 0 });
                expect(state.zoomFactor).toBe(2);

                let scrollContainer = state.getScrollContainerElement();
                expect(scrollContainer.scrollLeft).toBe(50); /* eslint-disable-line no-magic-numbers */
                expect(scrollContainer.scrollTop).toBe(50); /* eslint-disable-line no-magic-numbers */
            });
        });
    });

    describe('actions', () => {
        it('zooms so workflow fits container', () => {
            const factor = store.getters['canvas/fitToScreenZoomFactor'];
            store.dispatch('canvas/setZoomToFit');
            expect(store.state.canvas.zoomFactor).toBe(factor);
        });

        it('zooms in by keyboard', async () => {
            const state = store.state.canvas;

            store.commit('canvas/setFactor', 1);
            store.commit('canvas/setContainerSize', {
                width: 50,
                height: 50
            });
            workflowBounds = {
                left: 0,
                top: 0,
                right: 50,
                bottom: 50
            };

            let delta = findDelta(2); // zoom to 200%
            await store.dispatch('canvas/zoomCentered', delta);
            expect(state.zoomFactor).toBe(2);

            expect(scrollContainer.scrollLeft).toBe(25); /* eslint-disable-line no-magic-numbers */
            expect(scrollContainer.scrollTop).toBe(25); /* eslint-disable-line no-magic-numbers */
        });

        it('zooms to set value', () => {
            const state = store.state.canvas;
            const value = 0.75;
            store.dispatch('canvas/zoomTo', value);
            expect(state.zoomFactor).toBe(0.75);
        });

        it('resets zoom to default', () => {
            const state = store.state.canvas;
            store.dispatch('canvas/zoomToDefault');
            expect(state.zoomFactor).toBe(1);
        });
    });

    describe('getters', () => {
        test('fitToScreen zoom factor', () => {
            expect(store.getters['canvas/fitToScreenZoomFactor']).toBe(2);
        });

        test('saveState', () => {
            scrollContainer.scrollLeft = 50;
            scrollContainer.scrollTop = 100;
            store.state.canvas.zoomFactor = 2;
            expect(store.getters['canvas/toSave']).toStrictEqual({
                zoomFactor: 2,
                scrollLeft: 50,
                scrollTop: 100
            });
        });

        describe('contentBounds', () => {
            it('positive coordinates', () => {
                workflowBounds = {
                    left: 10,
                    top: 10,
                    right: 100,
                    bottom: 100
                };

                expect(store.getters['canvas/contentBounds']).toStrictEqual({
                    left: 0,
                    top: 0,
                    width: 100,
                    height: 100
                });
            });

            it('origin inside of workflow', () => {
                workflowBounds = {
                    left: -10,
                    top: -10,
                    right: 100,
                    bottom: 100
                };

                expect(store.getters['canvas/contentBounds']).toStrictEqual({
                    left: -10,
                    top: -10,
                    width: 110,
                    height: 110
                });
            });

            it('negative coordinates', () => {
                workflowBounds = {
                    left: -100,
                    top: -100,
                    right: -10,
                    bottom: -10
                };

                expect(store.getters['canvas/contentBounds']).toStrictEqual({
                    left: -100,
                    top: -100,
                    width: 100,
                    height: 100
                });
            });
        });

        describe('canvas, viewBox, absoluteCoordinates at 100%', () => {
            test('content larger than container', () => {
                store.commit('canvas/setContainerSize', {
                    width: 50,
                    height: 50
                });
                workflowBounds = {
                    left: 0,
                    top: 0,
                    right: 100,
                    bottom: 100
                };
                expect(store.getters['canvas/canvasSize']).toStrictEqual({
                    width: 100,
                    height: 100
                });
                expect(store.getters['canvas/viewBox']).toStrictEqual({
                    top: 0,
                    left: 0,
                    width: 100,
                    height: 100
                });
                let origin = { x: 0, y: 0 };
                expect(store.getters['canvas/getAbsoluteCoordinates'](origin)).toStrictEqual({
                    x: 0,
                    y: 0
                });
                expect(store.getters['canvas/fromAbsoluteCoordinates']([0, 0])).toStrictEqual([0, 0]);
            });

            test('content smaller than container (origin included)', () => {
                store.commit('canvas/setContainerSize', {
                    width: 100,
                    height: 100
                });
                workflowBounds = {
                    left: 0,
                    top: 0,
                    right: 50,
                    bottom: 50
                };
                expect(store.getters['canvas/canvasSize']).toStrictEqual({
                    width: 100,
                    height: 100
                });
                expect(store.getters['canvas/viewBox']).toStrictEqual({
                    top: -25,
                    left: -25,
                    width: 100,
                    height: 100
                });
                let origin = { x: 0, y: 0 };
                expect(store.getters['canvas/getAbsoluteCoordinates'](origin)).toStrictEqual({
                    x: 25,
                    y: 25
                });
                expect(store.getters['canvas/fromAbsoluteCoordinates']([25, 25])).toStrictEqual([0, 0]);
            });

            test('content smaller than container - (negative, origin not included)', () => {
                store.commit('canvas/setContainerSize', {
                    width: 200,
                    height: 200
                });
                workflowBounds = {
                    left: -100,
                    top: -100,
                    right: -50,
                    bottom: -50
                };
                // bounds are expanded to include origin
                // {-100, -100, 0, 0}
                expect(store.getters['canvas/canvasSize']).toStrictEqual({
                    width: 200,
                    height: 200
                });
                // space of 100 to distribute -> expand viewBox by 50 each side
                expect(store.getters['canvas/viewBox']).toStrictEqual({
                    top: -150,
                    left: -150,
                    width: 200,
                    height: 200
                });
                let origin = { x: 0, y: 0 };
                expect(store.getters['canvas/getAbsoluteCoordinates'](origin)).toStrictEqual({
                    x: 150,
                    y: 150
                });
                expect(store.getters['canvas/fromAbsoluteCoordinates']([150, 150])).toStrictEqual([0, 0]);
            });
        });

        describe('canvas, viewBox, absoluteCoordinates at 100%', () => {
            beforeEach(() => {
                store.commit('canvas/setFactor', 2);
            });

            test('content larger than container', () => {
                store.commit('canvas/setContainerSize', {
                    width: 50,
                    height: 50
                });
                workflowBounds = {
                    left: 0,
                    top: 0,
                    right: 50,
                    bottom: 50
                };
                expect(store.getters['canvas/canvasSize']).toStrictEqual({
                    width: 100,
                    height: 100
                });
                expect(store.getters['canvas/viewBox']).toStrictEqual({
                    top: 0,
                    left: 0,
                    width: 50,
                    height: 50
                });
                let origin = { x: 0, y: 0 };
                expect(store.getters['canvas/getAbsoluteCoordinates'](origin)).toStrictEqual({
                    x: 0,
                    y: 0
                });
                expect(store.getters['canvas/fromAbsoluteCoordinates']([0, 0])).toStrictEqual([0, 0]);
            });

            test('content smaller than container (origin included)', () => {
                store.commit('canvas/setContainerSize', {
                    width: 200,
                    height: 200
                });
                workflowBounds = {
                    left: 0,
                    top: 0,
                    right: 50,
                    bottom: 50
                };
                // canvas same size as container
                expect(store.getters['canvas/canvasSize']).toStrictEqual({
                    width: 200,
                    height: 200
                });
                // viewBox width and height have same proportions as canvas
                // but are half as big (100, 100)
                // comparing with workflow, we have 50 to distribute around content
                // so the shift is -25
                expect(store.getters['canvas/viewBox']).toStrictEqual({
                    top: -25,
                    left: -25,
                    width: 100,
                    height: 100
                });
                let origin = { x: 0, y: 0 };
                // origin is shifted by 25 in workflow space.
                // absolute shift is 50.
                expect(store.getters['canvas/getAbsoluteCoordinates'](origin)).toStrictEqual({
                    x: 50,
                    y: 50
                });
                expect(store.getters['canvas/fromAbsoluteCoordinates']([50, 50])).toStrictEqual([0, 0]);
            });

            test('content smaller than container - (negative, origin not included)', () => {
                store.commit('canvas/setContainerSize', {
                    width: 400,
                    height: 400
                });
                workflowBounds = {
                    left: -100,
                    top: -100,
                    right: -50,
                    bottom: -50
                };
                // bounds are expanded to include origin
                // {-100, -100, 0, 0}
                expect(store.getters['canvas/canvasSize']).toStrictEqual({
                    width: 400,
                    height: 400
                });
                // space of 100 to distribute in worfklow space -> expand viewBox by 50 each side
                expect(store.getters['canvas/viewBox']).toStrictEqual({
                    top: -150,
                    left: -150,
                    width: 200,
                    height: 200
                });
                let origin = { x: 0, y: 0 };
                expect(store.getters['canvas/getAbsoluteCoordinates'](origin)).toStrictEqual({
                    x: 300,
                    y: 300
                });
                expect(store.getters['canvas/fromAbsoluteCoordinates']([300, 300])).toStrictEqual([0, 0]);
            });
        });
    });
});
