import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore, shallowMountWithAsyncData } from '~/test/unit/test-utils';
import Vuex from 'vuex';

import WorkflowTabContent from '~/components/WorkflowTabContent';
import Kanvas from '~/components/Kanvas';
import WorkflowMetadata from '~/components/WorkflowMetadata';
import WorkflowToolbar from '~/components/WorkflowToolbar';

describe('WorkflowTabContent.vue', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    let store, workflow, wrapper, doShallowMount;

    beforeEach(() => {
        window.switchToJavaUI = jest.fn();

        workflow = {
            metadata: {
                title: 'title'
            },
            info: {
                name: 'fileName',
                containerType: 'project'
            }
        };

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

        it('displays Workflow', async () => {
            await doShallowMount();

            expect(wrapper.findComponent(Kanvas).exists()).toBe(true);
        });

        it('shows metadata panel with data', async () => {
            await doShallowMount();

            let metadata = wrapper.findComponent(WorkflowMetadata);
            expect(metadata.exists()).toBe(true);
            expect(metadata.props().title).toBe('title');
        });

        it('uses placeholder metadata if none are given', async () => {
            delete workflow.metadata;
            await doShallowMount();

            expect(wrapper.findComponent(WorkflowMetadata).props().title).toBe('fileName');
        });

        it('shows no metadata panel if the workflow is not top-level', async () => {
            workflow.info.containerType = 'component';
            await doShallowMount();

            let metadata = wrapper.findComponent(WorkflowMetadata);
            expect(metadata.exists()).toBe(false);
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

        it('hides metadata panel', () => {
            expect(wrapper.find('#metadata').exists()).toBe(false);
        });
    });

    describe('toolbar', () => {
        it('shows no toolbar by default', async () => {
            workflow = null;
            await doShallowMount();

            expect(wrapper.findComponent(WorkflowToolbar).exists()).toBe(false);
        });

        it('shows breadcrumb when available', async () => {
            await doShallowMount();

            expect(wrapper.findComponent(WorkflowToolbar).exists()).toBe(true);
        });
    });
});
