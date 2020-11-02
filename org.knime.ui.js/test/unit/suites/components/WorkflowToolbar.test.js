import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';
import * as workflowStoreConfig from '~/store/workflow';

import WorkflowToolbar from '~/components/WorkflowToolbar';
import ToolbarButton from '~/components/ToolbarButton';
import WorkflowBreadcrumb from '~/components/WorkflowBreadcrumb';

jest.mock('~api', () => {}, { virtual: true });

describe('WorkflowToolbar.vue', () => {
    let propsData, mocks, doShallowMount, wrapper, $store, executeNodes, cancelNodeExecution, resetNodes;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        executeNodes = jest.fn();
        cancelNodeExecution = jest.fn();
        resetNodes = jest.fn();
        wrapper = null;
        propsData = {};
        $store = mockVuexStore({
            workflow: {
                ...workflowStoreConfig,
                actions: {
                    ...workflowStoreConfig.actions,
                    executeNodes,
                    cancelNodeExecution,
                    resetNodes
                }
            }
        });

        mocks = { $store };
        doShallowMount = () => {
            wrapper = shallowMount(WorkflowToolbar, { propsData, mocks });
        };
    });

    describe('buttons', () => {
        it('deactivates buttons by default', () => {
            $store.commit('workflow/setActiveWorkflow', { info: {} });
            doShallowMount();
            let buttons = wrapper.findAllComponents(ToolbarButton);
            expect(buttons.at(0).attributes('disabled')).toBeTruthy();
            expect(buttons.at(1).attributes('disabled')).toBeTruthy();
            expect(buttons.at(2).attributes('disabled')).toBeTruthy();
        });

        it('activates buttons when possible', () => {
            $store.commit('workflow/setActiveWorkflow', {
                info: {},
                allowedActions: {
                    canExecute: true,
                    canCancel: true,
                    canReset: true
                }
            });
            doShallowMount();
            let buttons = wrapper.findAllComponents(ToolbarButton);
            expect(buttons.at(0).attributes('disabled')).toBeFalsy();
            expect(buttons.at(1).attributes('disabled')).toBeFalsy();
            expect(buttons.at(2).attributes('disabled')).toBeFalsy();
        });

        it('triggers store actions when a button is clicked', () => {
            let projectId = Math.random();
            $store.commit('workflow/setActiveWorkflow', {
                info: {},
                projectId,
                allowedActions: {
                    canExecute: true,
                    canCancel: true,
                    canReset: true
                }
            });
            doShallowMount();
            let buttons = wrapper.findAllComponents(ToolbarButton);

            expect(executeNodes).not.toHaveBeenCalled();
            expect(cancelNodeExecution).not.toHaveBeenCalled();
            expect(resetNodes).not.toHaveBeenCalled();

            buttons.at(0).trigger('click');
            expect(executeNodes).toHaveBeenCalledWith(expect.anything(), { nodeIds: ['root'], projectId });
            buttons.at(1).trigger('click');
            expect(cancelNodeExecution).toHaveBeenCalledWith(expect.anything(), { nodeIds: ['root'], projectId });
            buttons.at(2).trigger('click');
            expect(resetNodes).toHaveBeenCalledWith(expect.anything(), { nodeIds: ['root'], projectId });
        });

    });

    describe('breadcrumb', () => {
        it('hides breadcrumb by default', () => {
            $store.commit('workflow/setActiveWorkflow', { info: {} });
            doShallowMount();
            expect(wrapper.findComponent(WorkflowBreadcrumb).exists()).toBe(false);
        });
        it('shows breadcrumb if required', () => {
            $store.commit('workflow/setActiveWorkflow', { info: {}, parents: [{ dummy: true }] });
            doShallowMount();
            expect(wrapper.findComponent(WorkflowBreadcrumb).exists()).toBe(true);
        });
    });
});
