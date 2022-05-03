/* eslint-disable no-magic-numbers */
import { shallowMount } from '@vue/test-utils';

import FloatingMenu from '~/components/FloatingMenu';

describe('FloatingMenu.vue', () => {
    let propsData, doMount, wrapper;

    beforeEach(() => {
        propsData = {
            position: {
                x: 0,
                y: 0
            }
        };
        doMount = () => {
            wrapper = shallowMount(FloatingMenu, {
                propsData
            });
        };
    });

    describe('close menu', () => {
        it('closes menu on escape key', () => {
            doMount();

            wrapper.trigger('keydown.esc');
            expect(wrapper.emitted('menu-close')).toBeDefined();
        });

        it('closes menu when focus leaves the component', () => {
            jest.useFakeTimers();

            doMount();
            wrapper.trigger('focusout');

            jest.runAllTimers();

            expect(wrapper.emitted('menu-close')).toBeDefined();
        });
    });

    it('positions menu to be always visible', async () => {
        // mock window
        const originalWindow = { ...window };
        const windowSpy = jest.spyOn(global, 'window', 'get');
        windowSpy.mockImplementation(() => ({
            ...originalWindow,
            innerWidth: 1200,
            innerHeight: 800
        }));

        // mount visible menu
        propsData.isVisible = true;
        doMount();

        // "mock" element values
        wrapper.vm.$el = {
            ...wrapper.vm.$el,
            offsetWidth: 200,
            offsetHeight: 400
        };

        // trigger update via position change
        await wrapper.setProps({
            position: {
                x: 1200,
                y: 800
            }
        });

        expect(wrapper.attributes('style')).toBe('left: 996px; top: 396px;');

        // cleanup
        windowSpy.mockRestore();
    });
});
