import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore, fetchFirst } from '~/test/unit/test-utils';
import Vuex from 'vuex';

import KnimeUI from '~/components/KnimeUI';
import Kanvas from '~/components/Kanvas';
import SwitchIcon from '~/webapps-common/ui/assets/img/icons/perspective-switch.svg?inline';
import KnimeIcon from '~assets/knime.svg?inline';


describe('KnimeUI.vue', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    let store, workflow, wrapper, mount;

    beforeEach(() => {
        window.switchToJavaUI = jest.fn();

        workflow = null;

        mount = async () => {
            store = mockVuexStore({
                workflows: {
                    state: {
                        workflow
                    }
                }
            });
            store.dispatch = jest.fn();

            wrapper = await fetchFirst(shallowMount)(
                KnimeUI,
                { store },
                {
                    mocks: { $store: store },
                    stubs: { SwitchIcon, KnimeIcon }
                }
            );
        };
    });

    it('initiates', async () => {
        workflow = 'this is a dummy workflow';
        await mount();

        expect(store.dispatch).toHaveBeenCalledWith('workflows/initState');
        expect(wrapper.findComponent(Kanvas).exists()).toBe(true);
    });

    it('shows placeholder', async () => {
        await mount();

        expect(wrapper.findComponent(Kanvas).exists()).toBe(false);
        expect(wrapper.find('main').text()).toMatch('No workflow opened');
    });
});
