/* eslint-disable no-magic-numbers */
import { mount, shallowMount } from '@vue/test-utils';
import Vue from 'vue';

import FloatingMenu from '~/components/FloatingMenu';

describe('FloatingMenu.vue', () => {
    let items;

    beforeEach(() => {
        items = [{
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
    });

    it('renders', () => {
        const wrapper = mount(FloatingMenu, {
            propsData: {
                items: []
            }
        });
        expect(wrapper.html()).toBeTruthy();
    });

    it('renders with items', () => {
        const wrapper = mount(FloatingMenu, {
            propsData: {
                items
            }
        });
        expect(wrapper.html()).toBeTruthy();
        expect(wrapper.findAll('li').length).toBe(items.length);
    });

    describe('close menu', () => {
        it('closes menu on escape key', async () => {
            const wrapper = shallowMount(FloatingMenu, {
                propsData: {
                    items
                }
            });
            wrapper.vm.showMenu(0, 0);
            await Vue.nextTick();
            expect(wrapper.vm.$el.classList).toContain('isVisible');
            wrapper.trigger('keydown.esc');
            await Vue.nextTick();
            expect(wrapper.vm.$el.classList).not.toContain('isVisible');
        });

        it('closes menu on click', async () => {
            const wrapper = mount(FloatingMenu, {
                propsData: {
                    items
                }
            });
            wrapper.vm.showMenu(0, 0);
            await Vue.nextTick();
            expect(wrapper.vm.$el.classList).toContain('isVisible');
            wrapper.findAll('li').at(1).trigger('click');
            await Vue.nextTick();
            expect(wrapper.vm.$el.classList).not.toContain('isVisible');
        });

        it('closes menu when focus leaves the component', () => {
            jest.useFakeTimers();

            const wrapper = mount(FloatingMenu, {
                propsData: {
                    items
                }
            });

            let onFocusOutMock = jest.spyOn(wrapper.vm, 'onFocusOut');
            let closeMenuMock = jest.spyOn(wrapper.vm, 'closeMenu');
            expect(wrapper.vm.isVisible).toBe(false);
            wrapper.setData({ isVisible: true });
            expect(wrapper.vm.isVisible).toBe(true);

            wrapper.trigger('focusout');

            jest.runAllTimers();

            expect(onFocusOutMock).toHaveBeenCalled();
            expect(closeMenuMock).toHaveBeenCalled();
            expect(wrapper.vm.isVisible).toBe(false);
        });
    });

    describe('item click', () => {
        it('fires item-click event on click', () => {
            const wrapper = shallowMount(FloatingMenu, {
                propsData: {
                    items
                }
            });
            wrapper.vm.onItemClick({}, items[1]);
            expect(wrapper.emitted()['item-click']).toBeTruthy();
            expect(wrapper.emitted()['item-click'][0][1].userData)
                .toStrictEqual({ storeAction: 'workflow/executeNode' });
        });

        it('ignores click on disabled items', () => {
            items[0].disabled = true;
            const wrapper = mount(FloatingMenu, {
                propsData: {
                    items
                }
            });
            wrapper.findAll('li').at(0).trigger('click');
            expect(wrapper.emitted()['item-click']).toBeFalsy();
        });
    });

    it('positions menu to be always visible', () => {
        const wrapper = shallowMount(FloatingMenu, {
            propsData: {
                items
            }
        });
        let { top, left } = wrapper.vm.calculateMenuPosition({
            offsetWidth: 200,
            offsetHeight: 400
        }, 1200, 800, {
            innerWidth: 1200,
            innerHeight: 800
        });
        expect(top).toBe(396);
        expect(left).toBe(996);
    });
});
