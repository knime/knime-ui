/* eslint-disable no-magic-numbers */
import { mount, shallowMount } from '@vue/test-utils';

import FloatingMenu from '~/components/FloatingMenu';
import MenuItems from '~/webapps-common/ui/components/MenuItems';

describe('FloatingMenu.vue', () => {
    let propsData, doMount, wrapper;

    beforeEach(() => {
        let items = [{
            text: 'Apples',
            disabled: false,
            hotkeyText: 'CTRL + A'
        }, {
            text: 'Oranges',
            userData: {
                storeAction: 'workflow/executeNode'
            }
        }, {
            text: 'Ananas',
            hotkeyText: 'F9'
        }];

        propsData = {
            items,
            position: {
                x: 0,
                y: 0
            }
        };
        doMount = () => {
            wrapper = mount(FloatingMenu, {
                propsData
            });
        };
    });

    it('renders', () => {
        wrapper = shallowMount(FloatingMenu, {
            propsData: { ...propsData, items: [] }
        });
        expect(wrapper.classes()).not.toContain('isVisible');
        expect(wrapper.html()).toBeTruthy();
    });

    it('renders with items', () => {
        doMount();
        expect(wrapper.html()).toBeTruthy();
        expect(wrapper.findComponent(MenuItems).props('items').length).toBe(propsData.items.length);
    });

    describe('close menu', () => {
        it('closes menu on escape key', () => {
            doMount();

            wrapper.trigger('keydown.esc');
            expect(wrapper.emitted('menu-close')).toBeDefined();
        });

        it('closes menu if item is clicked', () => {
            doMount();
            wrapper.findComponent(MenuItems).vm.$emit('item-click', propsData.items[0]);
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

    it('fires item-click event on click', () => {
        doMount();
        // emulate click on MenuItems item
        wrapper.findComponent(MenuItems).vm.$emit('item-click', propsData.items[1]);
        expect(wrapper.emitted()['item-click']).toBeTruthy();
        expect(wrapper.emitted()['item-click'][0][0].userData).toStrictEqual(
            { storeAction: 'workflow/executeNode' }
        );
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
