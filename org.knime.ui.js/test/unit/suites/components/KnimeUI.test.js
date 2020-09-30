import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore, shallowMountWithAsyncData } from '~/test/unit/test-utils';
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

    let store, workflow, wrapper, doShallowMount, initState;

    beforeEach(() => {
        window.switchToJavaUI = jest.fn();
        initState = jest.fn();

        workflow = null;

        doShallowMount = async () => {
            store = mockVuexStore({
                workflows: {
                    state: {
                        workflow
                    },
                    actions: {
                        initState
                    }
                }
            });

            wrapper = await shallowMountWithAsyncData(
                KnimeUI,
                { store },
                {
                    mocks: { $store: store },
                    stubs: { SwitchIcon, KnimeIcon }
                }
            );
        };
    });

    // TODO: test onClick method for preventing navigation

    describe('workflow loaded', () => {
        beforeEach(async () => {
            workflow = 'this is a dummy workflow';
            await doShallowMount();
        });

        it('initializes app state', () => {
            expect(initState).toHaveBeenCalled();
        });

        it('displays Workflow and Metadata panel', () => {
            expect(wrapper.findComponent(Kanvas).exists()).toBe(true);
        });
    });

    describe('no workflow loaded', () => {
        beforeEach(async () => {
            await doShallowMount();
        });

        it('shows placeholder', () => {
            expect(wrapper.findComponent(Kanvas).exists()).toBe(false);
            expect(wrapper.find('main').text()).toMatch('No workflow opened');
        });

        it('hides metadata panel', () => {
            expect(wrapper.find('#metadata').exists()).toBe(false);
        });
    });
});
