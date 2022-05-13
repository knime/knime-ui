/* eslint-disable no-magic-numbers */
import { shallowMount, createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import Vuex from 'vuex';

import AppHeader from '~/components/AppHeader';
import FunctionButton from '~/webapps-common/ui/components/FunctionButton';
import CloseIcon from '~/assets/cancel.svg?inline';

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
        wrapper.find('.switch-classic').vm.$emit('click');
        expect(window.switchToJavaUI).toHaveBeenCalled();
    });

    it('check if feedback URL is correct', () => {
        doShallowMount();
        expect(wrapper.find('.feedback').attributes('href')).toBe('https://knime.com/modern-ui-feedback');
    });

    it('allows to close workflow', () => {
        doShallowMount();
        wrapper.findComponent(FunctionButton).vm.$emit('click');
        expect(storeConfig.workflow.actions.closeWorkflow).toHaveBeenCalled();
    });

    it('renders name of the workflow', () => {
        doShallowMount();
        const title = wrapper.find('.workflow-title');

        expect(title.text()).toBe('Title');
    });

    describe('truncates the workflow name', () => {
        const longName = `
            KNIME_project2 KNIME_project2 KNIME_project2 v KNIME_project2 KNIME_project2 KNIME_project2 
            KNIME_project2 KNIME_project2 KNIME_project2 KNIME_project2 KNIME_project2KNIME_project2 alkjsdf ölaksjd 
            fölkj aklsdjfhkajsdhf
        `.trim();
        
        
        it.each([
            // [viewport size, max characters]
            [400, 10],
            [700, 20],
            [1000, 50],
            [1366, 100]
        ])('truncates the name for a %spx width to a max of %s characters long', (width, maxChars) => {
            window.innerWidth = width;
            storeConfig.workflow.state.activeWorkflow.info.name = longName;
            doShallowMount();
            const nameElement = wrapper.find('.workflow-title .text');
            
            // +3 to account for the "..."
            expect(nameElement.text().length).toBe(maxChars + 3);
        });
    });
});
