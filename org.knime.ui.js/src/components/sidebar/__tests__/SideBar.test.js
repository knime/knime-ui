import Vue from 'vue';
import vuex from 'vuex';
import { shallowMount, createLocalVue } from '@vue/test-utils';

import { mockVuexStore } from '@/test/test-utils/mockVuexStore';
import * as panelStoreConfig from '@/store/panel';
import * as nodeRepositoryStoreConfig from '@/store/nodeRepository';

import PlusIcon from 'webapps-common/ui/assets/img/icons/circle-plus.svg';
import Metainfo from '@/assets/metainfo.svg';

import NodeRepository from '@/components/nodeRepository/NodeRepository.vue';
import WorkflowMetadata from '@/components/workflowMetadata/WorkflowMetadata.vue';
import NodeDialogWrapper from '@/components/embeddedViews/NodeDialogWrapper.vue';
import Sidebar from '../Sidebar.vue';

Vue.config.ignoredElements = ['portal-target'];

describe('Sidebar', () => {
    let store, workflow, wrapper, doShallowMount;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(vuex);
    });

    const mockFeatureFlags = {
        shouldDisplayEmbeddedDialogs: jest.fn(() => true)
    };

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

        store = mockVuexStore({
            application: {
                state: {
                    activeProjectId: 'activeProject1'
                }
            },
            workflow: {
                state: {
                    activeWorkflow: workflow
                }
            },
            panel: panelStoreConfig,
            nodeRepository: nodeRepositoryStoreConfig
        });

        doShallowMount = () => {
            wrapper = shallowMount(Sidebar, {
                mocks: {
                    $store: store,
                    $features: mockFeatureFlags
                }
            });
        };
    });

    it('renders default', () => {
        doShallowMount();
        expect(wrapper.exists()).toBe(true);
        expect(wrapper.findComponent(Metainfo).exists()).toBe(true);
        expect(wrapper.findComponent(PlusIcon).exists()).toBe(true);

        expect(wrapper.find('[title="Workflow metadata"]').classes('active')).toBe(true);
        expect(wrapper.find('[title="Node repository"]').classes('active')).toBe(false);
        wrapper.findAll('li').wrappers.forEach(wp => {
            expect(wp.classes('expanded')).toBe(true);
        });
    });

    it('expands and activates tab', async () => {
        const tabName = 'Node repository';
        doShallowMount();
        expect(wrapper.find(`[title="${tabName}"]`).classes('expanded')).toBe(true);

        await wrapper.find(`[title="${tabName}"]`).trigger('click');
        expect(wrapper.find(`[title="${tabName}"]`).classes('expanded')).toBe(true);
        expect(wrapper.find(`[title="${tabName}"]`).classes('active')).toBe(true);

        expect(wrapper.findComponent(NodeRepository).exists()).toBe(true);
    });

    it('clicking on open tab should close it', async () => {
        const tabName = 'Workflow metadata';
        doShallowMount();
        await wrapper.find(`[title="${tabName}"]`).trigger('click');
        expect(wrapper.find(`[title="${tabName}"]`).classes('expanded')).toBe(false);

        await wrapper.find(`[title="${tabName}"]`).trigger('click');
        expect(wrapper.find(`[title="${tabName}"]`).classes('expanded')).toBe(true);
    });

    it('click on node repository icon when description panel is open closes both panels', async () => {
        doShallowMount();
        // open node repository
        await wrapper.find('[title="Node repository"]').trigger('click');
        // emulate opening the description panel
        await store.dispatch('nodeRepository/openDescriptionPanel');
        expect(store.state.nodeRepository.isDescriptionPanelOpen).toBe(true);

        await wrapper.find('[title="Node repository"]').trigger('click');
        expect(store.state.nodeRepository.isDescriptionPanelOpen).toBe(false);
    });

    it('click on a different tab when description panel is open, closes the description panel', async () => {
        doShallowMount();

        await wrapper.find('[title="Node repository"]').trigger('click');
        // emulate opening the description panel
        await store.dispatch('nodeRepository/openDescriptionPanel');

        // back to workflow metadata
        await wrapper.find('[title="Workflow metadata"]').trigger('click');

        // back to node repository
        await wrapper.find('[title="Node repository"]').trigger('click');

        expect(store.state.nodeRepository.isDescriptionPanelOpen).toBe(false);
    });

    it('has portal for extension panel', () => {
        doShallowMount();
        expect(wrapper.find('portal-target[name="extension-panel"').exists()).toBe(true);
    });

    it('should not display node dialog section when flag is set to false', () => {
        mockFeatureFlags.shouldDisplayEmbeddedDialogs.mockImplementation(() => false);

        doShallowMount();

        expect(wrapper.find('ul').findAll('li').length).toBe(3);
        expect(wrapper.findComponent(NodeDialogWrapper).exists()).toBe(false);
    });
});
