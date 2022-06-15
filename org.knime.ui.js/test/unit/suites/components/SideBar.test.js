import vuex from 'vuex';
import Vue from 'vue';
import { shallowMount, createLocalVue } from '@vue/test-utils';

import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import * as panelStoreConfig from '~/store/panel';

import Sidebar from '~/components/Sidebar';

import InfoIcon from '~/webapps-common/ui/assets/img/icons/circle-info.svg?inline';
import PlusIcon from '~/webapps-common/ui/assets/img/icons/circle-plus.svg?inline';

import NodeRepository from '~/components/noderepo/NodeRepository';
import WorkflowMetadata from '~/components/WorkflowMetadata';

Vue.config.ignoredElements = ['portal-target'];

describe('Sidebar', () => {
    let store, workflow, wrapper, doShallowMount;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(vuex);
    });

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
            workflow: {
                state: {
                    activeWorkflow: workflow
                }
            },
            panel: panelStoreConfig
        });
        
        doShallowMount = () => {
            wrapper = shallowMount(Sidebar, {
                mocks: {
                    $store: store
                }
            });
        };
    });

    it('renders default', () => {
        doShallowMount();
        expect(wrapper.exists()).toBe(true);
        expect(wrapper.findComponent(InfoIcon).exists()).toBe(true);
        expect(wrapper.findComponent(PlusIcon).exists()).toBe(true);

        expect(wrapper.find('[title="Workflow metadata"]').classes('active')).toBe(true);
        expect(wrapper.find('[title="Node repository"]').classes('active')).toBe(false);
        wrapper.findAll('li').wrappers.forEach(wp => {
            expect(wp.classes('expanded')).toBe(false);
        });
    });

    it.each([
        ['Workflow metadata', WorkflowMetadata],
        ['Node repository', NodeRepository]
    ])('expands and activates "%s"', async (tabName, renderedComponent) => {
        doShallowMount();
        expect(wrapper.find(`[title="${tabName}"]`).classes('expanded')).toBe(false);

        await wrapper.find(`[title="${tabName}"]`).trigger('click');
        expect(wrapper.find(`[title="${tabName}"]`).classes('expanded')).toBe(true);
        expect(wrapper.find(`[title="${tabName}"]`).classes('active')).toBe(true);

        expect(wrapper.findComponent(renderedComponent).exists()).toBe(true);
    });

    it.each([
        ['Workflow metadata', WorkflowMetadata],
        ['Node repository', NodeRepository]
    ])('clicking on open tab should close it', async (tabName, renderedComponent) => {
        doShallowMount();
        await wrapper.find(`[title="${tabName}"]`).trigger('click');
        expect(wrapper.find(`[title="${tabName}"]`).classes('expanded')).toBe(true);

        await wrapper.find(`[title="${tabName}"]`).trigger('click');
        expect(wrapper.find(`[title="${tabName}"]`).classes('expanded')).toBe(false);
    });

    it('click on node repository icon when description panel is open closes both panels', async () => {
        doShallowMount();
        // open node repository
        await wrapper.find('[title="Node repository"]').trigger('click');
        // emulate opening the description panel
        await store.dispatch('panel/openDescriptionPanel');
        expect(store.state.panel.activeDescriptionPanel).toBe(true);

        await wrapper.find('[title="Node repository"]').trigger('click');
        expect(store.state.panel.activeDescriptionPanel).toBe(false);
    });

    it('click on a different tab when description panel is open, retains the description panel open', async () => {
        doShallowMount();

        await wrapper.find('[title="Node repository"]').trigger('click');
        // emulate opening the description panel
        await store.dispatch('panel/openDescriptionPanel');

        // back to workflow metadata
        await wrapper.find('[title="Workflow metadata"]').trigger('click');

        // back to node repository
        await wrapper.find('[title="Node repository"]').trigger('click');

        expect(store.state.panel.activeDescriptionPanel).toBe(true);
    });

    it('has portal for extension panel', () => {
        doShallowMount();
        expect(wrapper.find('portal-target[name="extension-panel"').exists()).toBe(true);
    });
});
