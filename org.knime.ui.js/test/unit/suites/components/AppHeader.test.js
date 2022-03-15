import { shallowMount, createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import Vuex from 'vuex';

import AppHeader from '~/components/AppHeader';
import FunctionButton from '~/webapps-common/ui/components/FunctionButton';
import CloseIcon from '~/assets/cancel-execution.svg?inline';

describe('AppHeader.vue', () => {
    let propsData, mocks, doShallowMount, wrapper, storeConfig, $store;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;

        storeConfig = {
            workflow: {
                state: {
                    activeWorkflow: {
                        info: {
                            containerType: 'project',
                            containerId: 'root',
                            name: 'Title'
                        },
                        parents: []
                    }
                },
                actions:
                {
                    closeWorkflow: jest.fn()
                }
            }
        };

        $store = mockVuexStore(storeConfig);
        mocks = { $store };
        doShallowMount = () => {
            wrapper = shallowMount(AppHeader, { propsData, mocks });
        };
    });

    it('renders', () => {
        doShallowMount();
        expect(wrapper.findComponent(FunctionButton).exists()).toBe(true);
        expect(wrapper.findComponent(CloseIcon).exists()).toBe(true);
    });

    it('allows switching to old UI', () => {
        window.switchToJavaUI = jest.fn();
        doShallowMount();
        wrapper.findComponent(FunctionButton).vm.$emit('click');
        expect(window.switchToJavaUI).toHaveBeenCalled();
    });

    it('allows to close workflow', () => {
        doShallowMount();
        wrapper.findComponent(CloseIcon).vm.$emit('click');

        expect(storeConfig.workflow.actions.closeWorkflow).toHaveBeenCalled();
    });

    it('renders name of the workflow', () => {
        doShallowMount();
        const title = wrapper.find('.workflow-title');

        expect(title.text()).toBe('Title');
    });
});
