import Vue from 'vue';
import vuex from 'vuex';
import { shallowMount, createLocalVue } from '@vue/test-utils';

import { mockVuexStore } from '@/test/test-utils/mockVuexStore';
import SwitchIcon from '~/webapps-common/ui/assets/img/icons/arrow-prev.svg';

import * as panelStoreConfig from '@/store/panel';
import LeftCollapsiblePanel from '../LeftCollapsiblePanel.vue';

describe('LeftCollapsiblePanel.vue', () => {
    let wrapper, $store, doShallowMount;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(vuex);
    });


    beforeEach(() => {
        $store = mockVuexStore({ panel: panelStoreConfig });

        doShallowMount = (customProps = {}) => {
            wrapper = shallowMount(LeftCollapsiblePanel, {
                propsData: {
                    title: 'hover-title',
                    width: '200px',
                    ...customProps
                },
                mocks: {
                    $store
                }
            });
        };
    });

    it('is initially closed', () => {
        doShallowMount();

        expect(wrapper.find('.container').attributes('style')).toBe('width: 0px;');
    });

    it('is opened via props', async () => {
        doShallowMount();
        
        expect(wrapper.find('.container').attributes('style')).toMatch('width: 0px');
        
        await wrapper.setProps({ expanded: true });
        expect(wrapper.find('.container').attributes('style')).toMatch('width: 200px');
    });

    it('width matches prop', () => {
        doShallowMount({ width: '400px', expanded: true });
        
        expect(wrapper.find('.container').attributes('style')).toMatch('width: 400px');
    });

    it('emits "toggle-expand" event when clicking on button', () => {
        doShallowMount();
        
        wrapper.find('button').trigger('click');
        expect(wrapper.emitted('toggle-expand')).toBeDefined();
    });

    it('disables button if "disabled" prop is true', () => {
        doShallowMount({ disabled: true });

        const button = wrapper.find('button');
        expect(button.element.disabled).toBe(true);
    });

    it('correctly container transitions at mount', async () => {
        const waitRAF = () => new Promise(resolve => requestAnimationFrame(resolve));
        doShallowMount();
        await Vue.nextTick();
        expect(wrapper.find('.container').classes()).toContain('no-transition');
        await waitRAF();
        expect(wrapper.find('.container').classes()).not.toContain('no-transition');
    });

    describe('open panel', () => {
        it('doesn’t display a hover title', () => {
            doShallowMount({ expanded: true });
            expect(wrapper.find('button').attributes().title).toBeUndefined();
        });

        it('icon is not flipped', () => {
            doShallowMount({ expanded: true });
            expect(wrapper.findComponent(SwitchIcon).props().style).toBeUndefined();
        });
    });

    describe('closed panel', () => {
        beforeEach(() => {
            doShallowMount();
        });
        
        it('collapses panel', () => {
            expect(wrapper.find('.container').attributes().style).toBe('width: 0px;');
        });

        it('shows hover title', () => {
            expect(wrapper.find('button').attributes().title).toBe('hover-title');
        });

        it('flips icon', () => {
            expect(wrapper.findComponent(SwitchIcon).attributes().style).toBe('transform: scaleX(-1);');
        });
    });
});
