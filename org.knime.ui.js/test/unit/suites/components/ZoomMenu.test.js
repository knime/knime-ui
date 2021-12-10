/* eslint-disable no-magic-numbers */
import { createLocalVue, mount } from '@vue/test-utils';
import Vuex from 'vuex';
import { mockVuexStore } from '~/test/unit/test-utils';

import ZoomMenu from '~/components/ZoomMenu';

describe('ZoomMenu', () => {
    let doMount, $store, zoomFactor, wrapper, storeConfig;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        zoomFactor = 1;

        doMount = () => {
            storeConfig = {
                canvas: {
                    state: {
                        zoomFactor
                    },
                    mutations: {
                        setFactor(state, factor) {
                            state.zoomFactor = factor;
                        }
                    },
                    getters: {
                        fitToScreenZoomFactor() {
                            return 5;
                        }
                    },
                    actions: {
                        zoomCentered: jest.fn()
                    }
                },
                userActions: {
                    getters: {
                        zoomActionItems() {
                            return [{
                                text: '100 %',
                                storeAction: 'testZoomTo100',
                                storeActionParams: []
                            }];
                        }
                    }
                }
            };

            $store = mockVuexStore(storeConfig);
            wrapper = mount(ZoomMenu, {
                mocks: {
                    $store
                }
            });
        };
    });


    it('renders', () => {
        doMount();
        expect(wrapper.html()).toBeTruthy();
    });

    describe('zoom value input', () => {
        it('shows current zoom level', () => {
            zoomFactor = 0.53;
            doMount();

            expect(wrapper.find('.zoom-input').element.value).toBe('53%');
        });

        it('selects all text of input on click', () => {
            zoomFactor = 0.63;
            doMount();

            let input = wrapper.find('.zoom-input');
            input.element.select = jest.fn();
            input.trigger('click');

            expect(input.element.select).toHaveBeenCalled();
        });

        it('parses input with % sign', async () => {
            zoomFactor = 0.53;
            doMount();

            let input = wrapper.find('.zoom-input');
            input.element.value = '33%';
            await input.trigger('keydown', { keyCode: 13 });

            expect(input.element.value).toBe('33%');
        });

        it('parses input without % sign', async () => {
            zoomFactor = 0.53;
            doMount();

            let input = wrapper.find('.zoom-input');
            input.element.value = '44';
            await input.trigger('keydown', { keyCode: 13 });

            expect(input.element.value).toBe('44%');
        });

        it('ignores invalid input', async () => {
            zoomFactor = 0.63;
            doMount();

            let input = wrapper.find('.zoom-input');
            input.element.value = 'asdf';
            await input.trigger('keydown', { keyCode: 13 });

            expect(input.element.value).toBe('63%');
        });

        it('ignores any input on focus out', () => {
            zoomFactor = 0.63;
            doMount();

            let input = wrapper.find('.zoom-input');
            input.element.value = '99';
            input.trigger('focusout');

            expect(input.element.value).toBe('63%');
        });
    });

    it('dispatches action on click of item', () => {
        zoomFactor = 0.63;
        doMount();
        $store.dispatch = jest.fn();

        let li = wrapper.find('li');
        li.trigger('click');

        expect($store.dispatch).toHaveBeenCalledWith('testZoomTo100');
    });

    it('zooms in and out on mousewheel', async () => {
        zoomFactor = 0.63;
        doMount();
        $store.dispatch = jest.fn();

        let input = wrapper.find('.zoom-input');
        await input.trigger('wheel', { deltaY: 1 });

        expect($store.dispatch).toHaveBeenCalledWith('canvas/zoomCentered', -1);

        await input.trigger('wheel', { deltaY: -1 });

        expect($store.dispatch).toHaveBeenCalledWith('canvas/zoomCentered', 1);
    });
});
