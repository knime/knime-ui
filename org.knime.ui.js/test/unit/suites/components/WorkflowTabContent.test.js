import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore, shallowMountWithAsyncData } from '~/test/unit/test-utils';
import Vuex from 'vuex';

import WorkflowTabContent from '~/components/WorkflowTabContent';
import Kanvas from '~/components/Kanvas';
import Splitter from '~/components/Splitter';
import SideMenu from '~/components/SideMenu';

describe('WorkflowTabContent.vue', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    let store, workflow, wrapper, doShallowMount;

    beforeEach(() => {
        doShallowMount = async () => {
            store = mockVuexStore({
                workflow: {
                    state: {
                        activeWorkflow: workflow
                    }
                }
            });

            wrapper = await shallowMountWithAsyncData(
                WorkflowTabContent,
                { store },
                {
                    mocks: { $store: store }
                }
            );
        };
    });

    describe('workflow loaded', () => {
        beforeEach(() => {
            // some workflow
            workflow = {};
        });

        it('displays Workflow', async () => {
            await doShallowMount();

            expect(wrapper.findComponent(Kanvas).exists()).toBe(true);
        });

        it('displays node output', async () => {
            await doShallowMount();

            let splitter = wrapper.findComponent(Splitter);
            expect(splitter.exists()).toBe(true);
            expect(splitter.vm.$slots.secondary[0].componentOptions.tag).toBe('NodeOutput');
        });

        it('displays side menu', async () => {
            await doShallowMount();

            expect(wrapper.findComponent(SideMenu).exists()).toBe(true);
        });
    });

    describe('no workflow loaded', () => {
        beforeEach(async () => {
            workflow = null;
            await doShallowMount();
        });

        it('shows placeholder', () => {
            expect(wrapper.findComponent(Kanvas).exists()).toBe(false);
            expect(wrapper.find('.placeholder').text()).toMatch('No workflow opened');
        });
    });
});
