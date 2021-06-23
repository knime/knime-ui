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
        const wrapper = shallowMount(FloatingMenu, {
            propsData: {
                items
            }
        });
        expect(wrapper.html()).toBeTruthy();
        expect(wrapper.findAll('li').length).toBe(items.length);
    });

    it('renders with disabled items', () => {
        items[1].disabled = true;
        const wrapper = shallowMount(FloatingMenu, {
            propsData: {
                items
            }
        });
        expect(wrapper.html()).toBeTruthy();
        const btn = wrapper.findAll('button').at(1);
        expect(btn.classes('disabled')).toBeTruthy();
        expect(btn.attributes('tabindex')).toBeFalsy();
        expect(wrapper.findAll('button').at(0).attributes('tabindex')).toBe('0');
    });

    it('fires item-click event on click', () => {
        const wrapper = shallowMount(FloatingMenu, {
            propsData: {
                items
            }
        });
        wrapper.findAll('li').at(1).trigger('click');
        expect(wrapper.emitted()['item-click']).toBeTruthy();
        expect(wrapper.emitted()['item-click'][0][1].userData)
            .toStrictEqual({ storeAction: 'workflow/executeNode' });
    });

    it('closes menu on click', async () => {
        const wrapper = shallowMount(FloatingMenu, {
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

    it('ignores click on disabled items', () => {
        items[0].disabled = true;
        const wrapper = shallowMount(FloatingMenu, {
            propsData: {
                items
            }
        });
        wrapper.findAll('li').at(0).trigger('click');
        expect(wrapper.emitted()['item-click']).toBeFalsy();
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

    describe('keyboard interaction', () => {
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

        it('triggers item-click on enter of current focussed item', async () => {
            items[0].disabled = false;
            const wrapper = shallowMount(FloatingMenu, {
                propsData: {
                    items
                }
            });
            wrapper.vm.showMenu(0, 0);
            await Vue.nextTick();
            expect(wrapper.vm.$el.classList).toContain('isVisible');
            const btn = wrapper.findAll('button').at(1);
            btn.element.focus();
            btn.trigger('keydown.enter');
            await Vue.nextTick();
            expect(wrapper.emitted()['item-click']).toBeTruthy();
            expect(wrapper.emitted()['item-click'][0][1].text).toBe('Oranges');
        });

        it('focus item next item on down', async () => {
            let getActiveElementMock = jest.fn();
            const wrapper = mount(FloatingMenu, {
                propsData: {
                    items
                }
            });
            expect(wrapper.vm.getActiveElement).toBeTruthy();
            wrapper.vm.getActiveElement = getActiveElementMock;
            const btn = wrapper.findAll('button').at(1);
            const nextBtn = wrapper.findAll('button').at(2);
            let mockNextBtnFocus = jest.fn();
            nextBtn.element.focus = mockNextBtnFocus;
            getActiveElementMock.mockReturnValue(btn.element);
            wrapper.trigger('keydown.down');
            await Vue.nextTick();
            expect(mockNextBtnFocus).toBeCalledTimes(1);
        });

        it('focus item prev item on up', async () => {
            let getActiveElementMock = jest.fn();
            const wrapper = mount(FloatingMenu, {
                propsData: {
                    items
                }
            });
            wrapper.vm.getActiveElement = getActiveElementMock;
            const btn = wrapper.findAll('button').at(1);
            const prevBtn = wrapper.findAll('button').at(0);
            let mockPrevButton = jest.fn();
            prevBtn.element.focus = mockPrevButton;
            getActiveElementMock.mockReturnValue(btn.element);
            wrapper.trigger('keydown.up');
            await Vue.nextTick();
            expect(mockPrevButton).toBeCalledTimes(1);
        });

        it('ignores disabled items on key navigation', async () => {
            let getActiveElementMock = jest.fn();
            items[0].disabled = true;
            const wrapper = mount(FloatingMenu, {
                propsData: {
                    items
                }
            });
            wrapper.vm.getActiveElement = getActiveElementMock;
            const btn = wrapper.findAll('button').at(1);
            const prevBtn = wrapper.findAll('button').at(0);
            let mockPrevButton = jest.fn();
            prevBtn.element.focus = mockPrevButton;
            getActiveElementMock.mockReturnValue(btn.element);
            const prevBtn2 = wrapper.findAll('button').at(2);
            let mockPrevButton2 = jest.fn();
            prevBtn2.element.focus = mockPrevButton2;
            wrapper.trigger('keydown.up');
            await Vue.nextTick();
            expect(mockPrevButton).toBeCalledTimes(0);
            expect(mockPrevButton2).toBeCalledTimes(1);
        });
    });
});
