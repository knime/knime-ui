import { shallowMount } from '@vue/test-utils';
import Vue from 'vue';
import LeftCollapsiblePanel from '~/components/LeftCollapsiblePanel';
import SwitchIcon from '~/webapps-common/ui/assets/img/icons/arrow-prev.svg?inline';

describe('LeftCollapsiblePanel.vue', () => {

    let wrapper;

    beforeEach(() => {
        wrapper = shallowMount(LeftCollapsiblePanel, {
            propsData: {
                title: 'hover-title',
                width: '200px'
            }
        });
    });

    it('uses default size and is initially opened', () => {
        expect(wrapper.find('.container').attributes().style).toBe('width: 200px;');
    });

    it('doesn’t display a hover title', () => {
        expect(wrapper.find('button').attributes().title).toBeUndefined();
    });

    it('icon is not flipped', () => {
        expect(wrapper.findComponent(SwitchIcon).props().style).toBeUndefined();
    });

    describe('close panel', () => {
        beforeEach(() => {
            wrapper.find('button').trigger('click');
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

        it('opens again', async () => {
            wrapper.find('button').trigger('click');
            await Vue.nextTick();
            expect(wrapper.find('.container').attributes().style).toBe('width: 200px;');
        });
    });
});
