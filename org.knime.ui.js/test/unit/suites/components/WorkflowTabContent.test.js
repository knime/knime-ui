import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore, shallowMountWithAsyncData } from '~/test/unit/test-utils';
import Vuex from 'vuex';

import * as panelStoreConfig from '~/store/panel';

import NodeRepository from '~/components/NodeRepository';
import WorkflowTabContent from '~/components/WorkflowTabContent';
import Kanvas from '~/components/Kanvas';
import WorkflowMetadata from '~/components/WorkflowMetadata';
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
                },
                panel: panelStoreConfig
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
            expect(wrapper.findComponent(NodeRepository).exists()).toBe(false);
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
            expect(wrapper.findComponent(NodeRepository).exists()).toBe(false);
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

    describe('node repository', () => {
        beforeEach(async () => {
            await doShallowMount();
            wrapper.vm.$store.dispatch('panel/setNodeRepositoryActive');
        });

        it('shows NodeRepository', () => {
            expect(wrapper.findComponent(WorkflowMetadata).exists()).toBe(false);
            expect(wrapper.findComponent(NodeRepository).exists()).toBe(true);
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
            expect(wrapper.find('.metadata').exists()).toBe(false);
        });
    });
});
