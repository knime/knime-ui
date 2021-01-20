import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import Vuex from 'vuex';
import * as canvasStoreConfig from '~/store/canvas';
const { defaultZoomFactor, minZoomFactor, maxZoomFactor, zoomMultiplier } = canvasStoreConfig;

describe('Opened projects store', () => {
    let localVue, store, workflowBounds;

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
        store = mockVuexStore({
            canvas: {
                ...canvasStoreConfig,
                state: {
                    ...canvasStoreConfig.state,
                    containerSize: { width: 200, height: 200 }
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
        test('resetZoom', () => {
            store.commit('setFactor', defaultZoomFactor + 1);
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

        test('setContainerSize', () => {
            store.commit('canvas/setContainerSize', { width: 5, height: 5 });
            expect(store.state.canvas.containerSize).toStrictEqual({
                width: 5,
                height: 5
            });
        });

        test('saveContainerScroll', () => {
            store.commit('canvas/saveContainerScroll', { left: 5, top: 5 });
            expect(store.state.canvas.savedContainerScroll).toStrictEqual({
                left: 5,
                top: 5
            });
        });

        test('zoomWithPointer', () => {
            //TODO
        });
    });

    describe('actions', () => {
        it('zooms so workflow fits container', () => {
            const factor = store.getters['canvas/fitToScreenZoomFactor'];
            store.dispatch('canvas/setZoomToFit');
            expect(store.state.canvas.zoomFactor).toBe(factor);
        });
    });

    describe('getters', () => {
        test('fitToScreen zoom factor', () => {
            expect(store.getters['canvas/fitToScreenZoomFactor']).toBe(2);
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
                x: 0,
                y: 0,
                width: 110,
                height: 110
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
                x: -10,
                y: -10,
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
                x: -110,
                y: -110,
                width: 110,
                height: 110
            });
        });
    });


});
