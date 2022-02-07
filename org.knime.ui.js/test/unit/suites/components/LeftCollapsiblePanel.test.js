import { shallowMount, createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vue from 'vue';
import vuex from 'vuex';
import * as panelStoreConfig from '~/store/panel';
import LeftCollapsiblePanel from '~/components/LeftCollapsiblePanel';
import SwitchIcon from '~/webapps-common/ui/assets/img/icons/arrow-prev.svg?inline';

describe('LeftCollapsiblePanel.vue', () => {
    let wrapper, $store;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(vuex);
    });


    beforeEach(() => {
        $store = mockVuexStore({ panel: panelStoreConfig });

        wrapper = shallowMount(LeftCollapsiblePanel, {
            propsData: {
                title: 'hover-title',
                width: '200px'
            },
            mocks: {
                $store
            }
        });
    });

    it('is initially closed', () => {
        expect(wrapper.vm.expanded).toBe(false);
        expect(wrapper.find('.container').attributes().style).toBe('width: 0px;');
    });

    it('is opened via store', () => {
        expect(wrapper.vm.expanded).toBe(false);
        wrapper.vm.$store.dispatch('panel/toggleExpanded');
        expect(wrapper.vm.expanded).toBe(true);
    });

    it('is opened via button', () => {
        expect(wrapper.vm.expanded).toBe(false);
        wrapper.find('button').trigger('click');
        expect(wrapper.vm.expanded).toBe(true);
    });

    it('disabled if descriptionPanel is active', async () => {
        wrapper.vm.$store.dispatch('panel/openDescriptionPanel');
        expect(wrapper.vm.descriptionPanel).toBe(true);
        const button = wrapper.find('button');
        await Vue.nextTick();
        expect(button.element.disabled).toBe(true);
    });

    describe('open panel', () => {
        beforeEach(() => {
            wrapper.vm.$store.dispatch('panel/toggleExpanded');
        });

        it('doesn’t display a hover title', () => {
            expect(wrapper.find('button').attributes().title).toBeUndefined();
        });

        it('icon is not flipped', () => {
            expect(wrapper.findComponent(SwitchIcon).props().style).toBeUndefined();
        });
    });

    describe('closed panel', () => {
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
