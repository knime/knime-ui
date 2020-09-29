import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore, shallowMountWithAsyncData } from '~/test/unit/test-utils';
import Vuex from 'vuex';

import WorkflowTabContent from '~/components/WorkflowTabContent';
import Kanvas from '~/components/Kanvas';

describe('WorkflowTabContent.vue', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    let store, workflow, wrapper, doShallowMount;

    beforeEach(() => {
        window.switchToJavaUI = jest.fn();

        workflow = null;

        doShallowMount = async () => {
            store = mockVuexStore({
                workflows: {
                    state: {
                        workflow
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
});
