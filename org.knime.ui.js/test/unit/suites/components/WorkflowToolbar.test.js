/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';

import WorkflowToolbar from '~/components/WorkflowToolbar';
import ToolbarCommandButton from '~/components/ToolbarCommandButton';
import WorkflowBreadcrumb from '~/components/WorkflowBreadcrumb';
import ZoomMenu from '~/components/ZoomMenu';

describe('WorkflowToolbar.vue', () => {
    let workflow, storeConfig, propsData, mocks, doShallowMount, wrapper,
        $store, $commands, selectedNodes, selectedConnections;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;
        propsData = {};

        selectedNodes = [];
        selectedConnections = [];
        workflow = {
            info: {},
            nodes: {
                'root:1': {
                    id: 'root:1',
                    allowedActions: {
                        canExecute: false,
                        canCancel: false,
                        canReset: false,
                        canDelete: false
                    }
                },
                'root:2': {
                    id: 'root:2',
                    allowedActions: {
                        canExecute: true,
                        canCancel: true,
                        canReset: true,
                        canDelete: true
                    }
                }
            }
        };

        $commands = {
            isEnabled: jest.fn().mockReturnValue(true)
        };

        storeConfig = {
            workflow: {
                state: {
                    activeWorkflow: workflow
                }
            },
            selection: {
                getters: {
                    selectedNodes: () => selectedNodes,
                    selectedConnections: () => selectedConnections
                }
            }
        };

        doShallowMount = () => {
            $store = mockVuexStore(storeConfig);
            mocks = { $store, $commands };
            wrapper = shallowMount(WorkflowToolbar, { propsData, mocks });
        };
    });

    describe('Toolbar Command', () => {
        test('Command buttons match computed items', () => {
            doShallowMount();
    
            let commandButtons = wrapper.findAllComponents(ToolbarCommandButton).wrappers;
            expect(commandButtons.map(button => button.props('name'))).toStrictEqual(wrapper.vm.toolbarCommands);
        });

        it('hides toolbar command buttons if no workflow is open', () => {
            storeConfig.workflow.state.activeWorkflow = null;
            doShallowMount();
            expect(wrapper.findComponent(ToolbarCommandButton).exists()).toBe(false);
        });
    });

    describe('zoom', () => {
        it('hides ZoomMenu if no workflow is open', () => {
            storeConfig.workflow.state.activeWorkflow = null;
            doShallowMount();
            expect(wrapper.findComponent(ZoomMenu).exists()).toBe(false);
        });
    });

    describe('breadcrumb', () => {
        it('hides breadcrumb if no workflow is open', () => {
            storeConfig.workflow.state.activeWorkflow = null;
            doShallowMount();
            expect(wrapper.findComponent(WorkflowBreadcrumb).exists()).toBe(false);
        });

        it('hides breadcrumb by default', () => {
            doShallowMount();
            expect(wrapper.findComponent(WorkflowBreadcrumb).exists()).toBe(false);
        });

        it('shows breadcrumb if required', () => {
            workflow.parents = [{ dummy: true }];
            doShallowMount();
            expect(wrapper.findComponent(WorkflowBreadcrumb).exists()).toBe(true);
        });
    });
});
