/* eslint-disable no-magic-numbers */
import { mount, shallowMount } from '@vue/test-utils';
import Vue from 'vue';

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
            },
            isVisible: false
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
        expect(wrapper.findAll('li').length).toBe(propsData.items.length);
    });

    describe('close menu', () => {
        it('closes menu on escape key', async () => {
            doMount();
            expect(wrapper.classes()).not.toContain('isVisible');
            wrapper.setProps({ isVisible: true });
            await Vue.nextTick();
            expect(wrapper.classes()).toContain('isVisible');
            wrapper.trigger('keydown.esc');
            await Vue.nextTick();
            expect(wrapper.emitted('menu-close')).toStrictEqual([[]]);
        });

        it('closes menu on click', async () => {
            doMount();
            wrapper.setProps({ isVisible: true });
            await Vue.nextTick();
            expect(wrapper.classes()).toContain('isVisible');
            wrapper.findAll('li').at(1).trigger('click');
            await Vue.nextTick();
            expect(wrapper.emitted('menu-close')).toStrictEqual([[]]);
        });

        it('closes menu when focus leaves the component', async () => {
            jest.useFakeTimers();

            doMount();

            expect(wrapper.classes()).not.toContain('isVisible');
            wrapper.setProps({ isVisible: true });
            await Vue.nextTick();
            expect(wrapper.classes()).toContain('isVisible');

            wrapper.trigger('focusout');

            jest.runAllTimers();

            expect(wrapper.emitted('menu-close')).toStrictEqual([[]]);
        });
    });

    describe('item click', () => {
        it('fires item-click event on click', () => {
            doMount();
            // emulate click on MenuItems item
            // TODO: Up for discussion: vm.$emit ?! Better solutions?
            wrapper.findComponent(MenuItems).vm.$emit('item-click', propsData.items[1]);
            expect(wrapper.emitted()['item-click']).toBeTruthy();
            expect(wrapper.emitted()['item-click'][0][0].userData).toStrictEqual(
                { storeAction: 'workflow/executeNode' }
            );
        });

        it('ignores click on disabled items', () => {
            propsData.items[0].disabled = true;
            doMount();
            // TODO: Up for discussion: This violates the "unit" as it checks for HTML elements of a sub-component
            wrapper.findAll('li').at(0).trigger('click');
            expect(wrapper.emitted()['item-click']).toBeFalsy();
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
        wrapper.setProps({
            position: {
                x: 1200,
                y: 800
            }
        });

        await Vue.nextTick();

        expect(wrapper.attributes('style')).toBe('left: 996px; top: 396px;');

        // cleanup
        windowSpy.mockRestore();
    });
});
