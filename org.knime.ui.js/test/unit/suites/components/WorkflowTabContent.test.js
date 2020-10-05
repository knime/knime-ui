import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore, shallowMountWithAsyncData } from '~/test/unit/test-utils';
import Vuex from 'vuex';

import WorkflowTabContent from '~/components/WorkflowTabContent';
import Kanvas from '~/components/Kanvas';
import WorkflowBreadcrumb from '~/components/WorkflowBreadcrumb';

describe('WorkflowTabContent.vue', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    let store, workflow, wrapper, doShallowMount;

    beforeEach(() => {
        workflow = null;

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

    it('initiates', async () => {
        workflow = 'this is a dummy workflow';
        await doShallowMount();

        expect(wrapper.findComponent(Kanvas).exists()).toBe(true);
    });

    it('shows placeholder', async () => {
        await doShallowMount();

        expect(wrapper.findComponent(Kanvas).exists()).toBe(false);
        expect(wrapper.find('.placeholder').text()).toMatch('No workflow opened');
    });

    describe('breadcrumb', () => {
        it('shows no breadcrumb by default', async () => {
            await doShallowMount();

            expect(wrapper.findComponent(WorkflowBreadcrumb).exists()).toBe(false);
        });

        it('shows breadcrumb when available', async () => {
            workflow = {
                parents: [{
                    containerType: 'project',
                    name: 'foo'
                }, {
                    containerType: 'component',
                    containerId: 'root:201',
                    name: 'Component'
                }]
            };
            await doShallowMount();

            expect(wrapper.findComponent(WorkflowBreadcrumb).exists()).toBe(true);
        });
    });
});
