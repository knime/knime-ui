import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore, shallowMountWithAsyncData } from '~/test/unit/test-utils';
import Vuex from 'vuex';

import WorkflowTabContent from '~/components/WorkflowTabContent';
import Kanvas from '~/components/Kanvas';
import WorkflowMetadata from '~/components/WorkflowMetadata';
import WorkflowToolbar from '~/components/WorkflowToolbar';
import Splitter from '~/components/Splitter';

describe('WorkflowTabContent.vue', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    let store, workflow, wrapper, doShallowMount;

    beforeEach(() => {
        window.switchToJavaUI = jest.fn();

        workflow = {
            projectMetadata: {
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

        it('displays node output', async () => {
            await doShallowMount();

            let splitter = wrapper.findComponent(Splitter);
            expect(splitter.exists()).toBe(true);
            expect(splitter.vm.$slots.secondary[0].componentOptions.tag).toBe('NodeOutput');
        });

        it('shows metadata panel with workflow metadata data', async () => {
            await doShallowMount();

            let metadata = wrapper.findComponent(WorkflowMetadata);
            expect(metadata.exists()).toBe(true);
            expect(metadata.props().title).toBe('title');
        });

        it('uses placeholder metadata if none are given', async () => {
            delete workflow.projectMetadata;
            await doShallowMount();

            expect(wrapper.findComponent(WorkflowMetadata).props().title).toBe('fileName');
        });

        it('no metadata for metanodes', async () => {
            workflow.info.containerType = 'metanode';
            await doShallowMount();

            expect(wrapper.findComponent(WorkflowMetadata).exists()).toBe(false);
        });

        it('displays component metadata', async () => {
            workflow = {
                info: {
                    containerType: 'component'
                },
                componentMetadata: {
                    name: 'name',
                    description: 'description',
                    inPorts: ['inPorts'],
                    outPorts: ['outPorts'],
                    icon: 'icon',
                    type: 'type',
                    views: ['views'],
                    options: ['options']
                }
            };
            await doShallowMount();
            expect(wrapper.findComponent(WorkflowMetadata).props()).toStrictEqual(
                expect.objectContaining({
                    title: 'name',
                    description: 'description',
                    isComponent: true,
                    nodePreview: {
                        inPorts: ['inPorts'],
                        outPorts: ['outPorts'],
                        icon: 'icon',
                        type: 'type',
                        isComponent: true,
                        hasDynPorts: false
                    },
                    nodeFeatures: {
                        inPorts: ['inPorts'],
                        outPorts: ['outPorts'],
                        views: ['views'],
                        options: ['options']
                    }
                })
            );
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
