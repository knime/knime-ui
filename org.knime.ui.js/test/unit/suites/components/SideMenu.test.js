import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore, shallowMountWithAsyncData } from '~/test/unit/test-utils';
import Vuex from 'vuex';

import * as panelStoreConfig from '~/store/panel';

import SideMenu from '~/components/SideMenu';
import NodeRepository from '~/components/noderepo/NodeRepository';
import WorkflowMetadata from '~/components/WorkflowMetadata';

describe('SideMenu.vue', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    let store, workflow, wrapper, doShallowMount;

    beforeEach(() => {
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
                SideMenu,
                { store },
                {
                    mocks: { $store: store }
                }
            );
        };
    });

    describe('Workflow Metadata', () => {
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

        it('no metadata hides metadata panel', async () => {
            workflow.info.containerType = null;
            await doShallowMount();
            expect(wrapper.findComponent(WorkflowMetadata).exists()).toBe(false);
        });
    });

    describe('Node Repository', () => {
        beforeEach(async () => {
            await doShallowMount();
            store.dispatch('panel/setNodeRepositoryActive');
        });

        it('shows NodeRepository', () => {
            expect(wrapper.findComponent(WorkflowMetadata).exists()).toBe(false);
            expect(wrapper.findComponent(NodeRepository).exists()).toBe(true);
        });
    });

    // TODO: test switching tabs properly
});
