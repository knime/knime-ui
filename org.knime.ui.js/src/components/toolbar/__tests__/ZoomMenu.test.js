import { mount as deepMount, shallowMount } from '@vue/test-utils';

import { mockVuexStore } from '@/test/test-utils';
import SubMenu from 'webapps-common/ui/components/SubMenu.vue';

import ZoomMenu from '../ZoomMenu.vue';

describe('ZoomMenu', () => {
    let props, doMount, $store, $shortcuts, zoomFactor, wrapper, storeConfig;

    beforeEach(() => {
        zoomFactor = 1;
        props = { };

        $shortcuts = {
            get: jest.fn().mockImplementation(shortcut => ({ name: shortcut })),
            dispatch: jest.fn()
        };

        doMount = (mountMethod) => {
            storeConfig = {
                canvas: {
                    state: {
                        zoomFactor
                    },
                    actions: {
                        zoomCentered({ state }, { delta, factor }) {
                            if (factor) {
                                state.zoomFactor = factor;
                            }
                        }
                    }
                }
            };

            $store = mockVuexStore(storeConfig);
            wrapper = mountMethod(ZoomMenu, {
                propsData: props,
                global: { plugins: [$store], mocks: { $shortcuts } }
            });
        };
    });


    it('renders', () => {
        doMount(deepMount);
        expect(wrapper.findComponent(SubMenu).exists()).toBe(true);
        expect(wrapper.findComponent(SubMenu).props('disabled')).toBe(false);
        expect(wrapper.find('input').exists()).toBe(true);
    });

    it('can be disabled', () => {
        props.disabled = true;
        doMount(shallowMount);

        expect(wrapper.findComponent(SubMenu).props('disabled')).toBe(true);
    });

    describe('zoom value input', () => {
        it('shows current zoom level', () => {
            zoomFactor = 0.53;
            doMount(shallowMount);

            expect(wrapper.find('.zoom-input').element.value).toBe('53%');
        });

        it('selects all text of input on click', () => {
            zoomFactor = 0.63;
            doMount(shallowMount);

            let input = wrapper.find('.zoom-input');
            input.element.select = jest.fn();
            input.trigger('click');

            expect(input.element.select).toHaveBeenCalled();
        });

        it('parses input with % sign', async () => {
            zoomFactor = 0.53;
            doMount(deepMount);

            let input = wrapper.find('.zoom-input');
            input.element.value = '33%';
            await input.trigger('keydown.enter');

            expect(input.element.value).toBe('33%');
        });

        it('parses input without % sign', async () => {
            zoomFactor = 0.53;
            doMount(deepMount);

            let input = wrapper.find('.zoom-input');
            input.element.value = '44';
            await input.trigger('keydown.enter');

            expect(input.element.value).toBe('44%');
        });

        it('ignores invalid input', async () => {
            zoomFactor = 0.63;
            doMount(deepMount);

            let input = wrapper.find('.zoom-input');
            input.element.value = 'asdf';
            await input.trigger('keydown.enter');

            expect(input.element.value).toBe('63%');
        });

        it('ignores any input on focus out', () => {
            zoomFactor = 0.63;
            doMount(deepMount);

            let input = wrapper.find('.zoom-input');
            input.element.value = '99';
            input.trigger('focusout');

            expect(input.element.value).toBe('63%');
        });
    });

    it('dispatches action on click of item', () => {
        zoomFactor = 0.63;
        doMount(shallowMount);

        wrapper.findComponent(SubMenu).vm.$emit('item-click', null, { name: 'shortcut' });

        expect($shortcuts.dispatch).toHaveBeenCalledWith('shortcut');
    });

    it('zooms in and out on mousewheel', async () => {
        zoomFactor = 0.63;
        doMount(deepMount);
        $store.dispatch = jest.fn();

        let input = wrapper.find('.zoom-input');
        await input.trigger('wheel', { deltaY: 1 });

        expect($store.dispatch).toHaveBeenCalledWith('canvas/zoomCentered', { delta: -1 });

        await input.trigger('wheel', { deltaY: -1 });

        expect($store.dispatch).toHaveBeenCalledWith('canvas/zoomCentered', { delta: 1 });
    });
});
