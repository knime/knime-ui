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
                },
                getters: {
                    isWorkflowEmpty: jest.fn()
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
        it('renders zoomMenu', () => {
            doShallowMount();
            expect(wrapper.findComponent(ZoomMenu).exists()).toBe(true);
            expect(wrapper.findComponent(ZoomMenu).props('disabled')).toBe(false);
        });

        it('hides ZoomMenu if no workflow is open', () => {
            storeConfig.workflow.state.activeWorkflow = null;
            doShallowMount();

            expect(wrapper.findComponent(ZoomMenu).exists()).toBe(false);
        });

        it('disables ZoomMenu if workflow is empty', () => {
            storeConfig.workflow.getters.isWorkflowEmpty.mockReturnValue(true);
            doShallowMount();

            expect(wrapper.findComponent(ZoomMenu).props('disabled')).toBe(true);
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

    describe('visibility of toolbar items', () => {
        it('shows nothing if no workflow is active', () => {
            storeConfig.workflow.state.activeWorkflow = null;
            doShallowMount();
            let toolbarCommands = wrapper.findAllComponents(ToolbarCommandButton).wrappers.map(tb => tb.props('name'));
            expect(toolbarCommands).toStrictEqual([]);
        });

        it('shows menu items if no node is selected', () => {
            doShallowMount();
            let toolbarCommands = wrapper.findAllComponents(ToolbarCommandButton).wrappers.map(tb => tb.props('name'));
            expect(toolbarCommands).toStrictEqual([
                'save',
                'undo',
                'redo',
                'executeAll',
                'cancelAll',
                'resetAll'
            ]);
        });

        it('shows correct menu items if one node is selected', () => {
            let node = {
                id: 'root:0',
                allowedActions: {}
            };
            storeConfig.selection.getters.selectedNodes = () => [node];
            doShallowMount();
            let toolbarCommands = wrapper.findAllComponents(ToolbarCommandButton).wrappers.map(tb => tb.props('name'));
            expect(toolbarCommands).toStrictEqual([
                'save',
                'undo',
                'redo',
                'executeSelected',
                'cancelSelected',
                'resetSelected',
                'createMetanode',
                'createComponent'
            ]);
        });

        it('shows correct menu items if multiple nodes are selected', () => {
            let node = {
                id: 'root:0',
                allowedActions: {}
            };
            storeConfig.selection.getters.selectedNodes = () => [node, { ...node, id: 'root:1' }];
            doShallowMount();
            let toolbarCommands = wrapper.findAllComponents(ToolbarCommandButton).wrappers.map(tb => tb.props('name'));
            expect(toolbarCommands).toStrictEqual([
                'save',
                'undo',
                'redo',
                'executeSelected',
                'cancelSelected',
                'resetSelected',
                'createMetanode',
                'createComponent'
            ]);
        });
    });
});
