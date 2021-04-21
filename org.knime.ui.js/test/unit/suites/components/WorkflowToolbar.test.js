/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';

import WorkflowToolbar from '~/components/WorkflowToolbar';
import ToolbarButton from '~/components/ToolbarButton';
import WorkflowBreadcrumb from '~/components/WorkflowBreadcrumb';

jest.mock('~api', () => { }, { virtual: true });

describe('WorkflowToolbar.vue', () => {
    let workflow, storeConfig, propsData, mocks, doShallowMount, wrapper, $store, selectedNodes, selectedConnections,
        userAgentGetter;

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
        storeConfig = {
            workflow: {
                state: {
                    activeWorkflow: workflow
                },
                actions: {
                    executeNodes: jest.fn(),
                    cancelNodeExecution: jest.fn(),
                    resetNodes: jest.fn(),
                    deleteSelectedObjects: jest.fn(),
                    undo: jest.fn(),
                    redo: jest.fn()
                }
            },
            selection: {
                getters: {
                    selectedNodes: () => selectedNodes,
                    selectedConnections: () => selectedConnections
                }
            }
        };

        userAgentGetter = jest.spyOn(window.navigator, 'userAgent', 'get');

        doShallowMount = () => {
            $store = mockVuexStore(storeConfig);
            mocks = { $store };
            wrapper = shallowMount(WorkflowToolbar, { propsData, mocks });
        };
    });

    describe('buttons', () => {
        let buttonArray = ['undo', 'redo', 'execute', 'cancel', 'reset', 'delete'];
        describe('ALL - no selection', () => {
            it('deactivates buttons by default', () => {
                doShallowMount();
                let buttons = wrapper.findAllComponents(ToolbarButton);
                buttonArray.forEach((button, index) => {
                    expect(buttons.at(index).attributes('disabled')).toBeTruthy();
                });
            });

            it('shows actions for all by default', () => {
                doShallowMount();
                let buttons = wrapper.findAllComponents(ToolbarButton);
                expect(buttons.at(2).text()).toMatch('all');
                expect(buttons.at(3).text()).toMatch('all');
                expect(buttons.at(4).text()).toMatch('all');
            });

            it('activates global action buttons when possible', () => {
                workflow.allowedActions = {
                    canExecute: true,
                    canCancel: true,
                    canReset: true
                };
                doShallowMount();
                let buttons = wrapper.findAllComponents(ToolbarButton);
                expect(buttons.at(2).attributes('disabled')).toBeFalsy();
                expect(buttons.at(3).attributes('disabled')).toBeFalsy();
                expect(buttons.at(4).attributes('disabled')).toBeFalsy();
            });

            it('triggers store actions when a button is clicked', () => {
                workflow.allowedActions = {
                    canExecute: true,
                    canCancel: true,
                    canReset: true,
                    canUndo: true,
                    canRedo: true
                };
                doShallowMount();
                let buttons = wrapper.findAllComponents(ToolbarButton);
                let { executeNodes, cancelNodeExecution, resetNodes, undo, redo } = storeConfig.workflow.actions;

                expect(executeNodes).not.toHaveBeenCalled();
                expect(cancelNodeExecution).not.toHaveBeenCalled();
                expect(resetNodes).not.toHaveBeenCalled();
                expect(undo).not.toHaveBeenCalled();
                expect(redo).not.toHaveBeenCalled();


                buttons.at(0).trigger('click');
                expect(undo).toHaveBeenCalled();
                buttons.at(1).trigger('click');
                expect(redo).toHaveBeenCalled();
                buttons.at(2).trigger('click');
                expect(executeNodes).toHaveBeenCalledWith(expect.anything(), 'all');
                buttons.at(3).trigger('click');
                expect(cancelNodeExecution).toHaveBeenCalledWith(expect.anything(), 'all');
                buttons.at(4).trigger('click');
                expect(resetNodes).toHaveBeenCalledWith(expect.anything(), 'all');
            });

            it('translates tooltips to mac formats', () => {
                userAgentGetter.mockReturnValue('mac');
                doShallowMount();
                let windowsTooltip = 'Shift + – Delete Ctrl + ';
                let macTooltip = wrapper.vm.checkForMacShortcuts(windowsTooltip);
                expect(macTooltip).toMatch('⇧ – ⌫ ⌘ ');
            });
        });

        describe('Selection', () => {
            it('shows actions for selected', () => {
                selectedNodes = [workflow.nodes['root:1'], workflow.nodes['root:2']];
                doShallowMount();
                let buttons = wrapper.findAllComponents(ToolbarButton);
                expect(buttons.at(2).text()).toMatch('Execute');
                expect(buttons.at(3).text()).toMatch('Cancel');
                expect(buttons.at(4).text()).toMatch('Reset');
            });

            it('disable actions for selection (all false)', () => {
                selectedNodes = [workflow.nodes['root:1'], workflow.nodes['root:1']];
                doShallowMount();
                let buttons = wrapper.findAllComponents(ToolbarButton);
                expect(buttons.at(2).attributes('disabled')).toBeTruthy();
                expect(buttons.at(3).attributes('disabled')).toBeTruthy();
                expect(buttons.at(4).attributes('disabled')).toBeTruthy();
            });

            it('enable actions for selection (some true)', () => {
                selectedNodes = [workflow.nodes['root:1'], workflow.nodes['root:2']];
                doShallowMount();
                let buttons = wrapper.findAllComponents(ToolbarButton);
                expect(buttons.at(2).attributes('disabled')).toBeFalsy();
                expect(buttons.at(3).attributes('disabled')).toBeFalsy();
                expect(buttons.at(4).attributes('disabled')).toBeFalsy();
            });

            it('triggers store actions when a button is clicked', () => {
                selectedNodes = [workflow.nodes['root:1'], workflow.nodes['root:2']];
                doShallowMount();
                let buttons = wrapper.findAllComponents(ToolbarButton);
                let {
                    executeNodes,
                    cancelNodeExecution,
                    resetNodes,
                    deleteSelectedObjects
                } = storeConfig.workflow.actions;

                expect(executeNodes).not.toHaveBeenCalled();
                expect(cancelNodeExecution).not.toHaveBeenCalled();
                expect(resetNodes).not.toHaveBeenCalled();
                expect(deleteSelectedObjects).not.toHaveBeenCalled();

                buttons.at(2).trigger('click');
                expect(executeNodes).toHaveBeenCalledWith(expect.anything(), 'selected');
                buttons.at(3).trigger('click');
                expect(cancelNodeExecution).toHaveBeenCalledWith(expect.anything(), 'selected');
                buttons.at(4).trigger('click');
                expect(resetNodes).toHaveBeenCalledWith(expect.anything(), 'selected');
                buttons.at(5).trigger('click');
                expect(deleteSelectedObjects).toHaveBeenCalled();
            });
        });
    });

    describe('breadcrumb', () => {
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
