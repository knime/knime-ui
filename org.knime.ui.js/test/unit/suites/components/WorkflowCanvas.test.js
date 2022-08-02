/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';
import Vue from 'vue';

import WorkflowCanvas from '~/components/WorkflowCanvas.vue';
import Workflow from '~/components/workflow/Workflow.vue';
import SelectionRectangle from '~/components/SelectionRectangle.vue';
import Kanvas from '~/components/Kanvas.vue';
import WorkflowEmpty from '~/components/workflow/WorkflowEmpty.vue';

describe('Kanvas', () => {
    let mocks, doShallowMount, wrapper, $store, storeConfig, isWorkflowEmpty;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        isWorkflowEmpty = false;
        storeConfig = {
            canvas: {
                state: {
                    zoomFactor: 1
                },
                getters: {
                    contentBounds: () => ({
                        left: 5,
                        top: 10,
                        width: 20,
                        height: 30
                    })
                },
                actions: {
                    fillScreen: jest.fn()
                },
                mutations: {
                    setInteractionsEnabled: jest.fn()
                }
            },
            selection: {
                actions: {
                    deselectAllObjects: jest.fn()
                }
            },
            workflow: {
                state: {
                    activeWorkflow: {
                        info: {
                            containerId: 'workflow1'
                        }
                    }
                },
                getters: {
                    isWorkflowEmpty() {
                        return isWorkflowEmpty;
                    }
                }
            },
            nodeRepository: {
                state: {
                    isDraggingNode: false
                }
            },
            panel: {
                actions: {
                    setNodeRepositoryActive: jest.fn(),
                    setWorkflowMetaActive: jest.fn()
                }
            },
            application: {
                state: {
                    activeProjectId: 'project1'
                },
                mutations: {
                    setSavedStates: jest.fn()
                },
                getters: {
                    workflowCanvasState: () => null
                }
            }
        };

        $store = mockVuexStore(storeConfig);

        mocks = { $store };
        doShallowMount = () => {
            wrapper = shallowMount(WorkflowCanvas, { mocks });
        };
    });

    describe('with Workflow', () => {
        it('renders workflow, if it is not empty', () => {
            doShallowMount();
    
            expect(wrapper.findComponent(WorkflowEmpty).exists()).toBe(false);
            expect(wrapper.findComponent(Workflow).exists()).toBe(true);
        });
    
        it('draws workflow boundary', () => {
            doShallowMount();
    
            let workflowSheet = wrapper.find('.workflow-sheet');
            expect(Number(workflowSheet.attributes('x'))).toBe(5);
            expect(Number(workflowSheet.attributes('y'))).toBe(10);
            expect(Number(workflowSheet.attributes('width'))).toBe(20);
            expect(Number(workflowSheet.attributes('height'))).toBe(30);
        });

        it('clicking on empty canvas deselects all', () => {
            doShallowMount();
            
            let workflowComponent = wrapper.findComponent(Workflow);
            
            workflowComponent.vm.applyNodeSelectionPreview = jest.fn();
            wrapper.findComponent(SelectionRectangle).vm.$emit('node-selection-preview', 'args');
    
            expect(workflowComponent.vm.applyNodeSelectionPreview).toHaveBeenCalledWith('args');
        });

        it('does not fill the screen if workflow is not empty', async () => {
            doShallowMount();
            await Vue.nextTick();
            expect(storeConfig.canvas.actions.fillScreen).toHaveBeenCalled();
            const kanvas = wrapper.findComponent(Kanvas);
            kanvas.vm.$emit('container-size-changed');
    
            await Vue.nextTick();
            await Vue.nextTick();
            expect(storeConfig.canvas.actions.fillScreen).toHaveBeenCalledTimes(1);
        });

        test('switch from empty workflow', async () => {
            doShallowMount();
            await Vue.nextTick();
            storeConfig.canvas.actions.fillScreen.mockReset();

            // workaround, instead of triggering the canvas getter to reevaluate
            wrapper.vm.$options.watch.isWorkflowEmpty.handler.call(wrapper.vm, false);
            await Vue.nextTick();

            expect(storeConfig.canvas.mutations.setInteractionsEnabled).toHaveBeenCalledWith(expect.anything(), true);
            expect(storeConfig.canvas.actions.fillScreen).not.toHaveBeenCalled();
            expect(storeConfig.panel.actions.setNodeRepositoryActive).not.toHaveBeenCalled();
        });

        it('sets workflow meta information as active', () => {
            doShallowMount();

            expect(storeConfig.panel.actions.setWorkflowMetaActive).toHaveBeenCalled();
        });
    });

    describe('with empty workflow', () => {
        beforeEach(async () => {
            isWorkflowEmpty = true;
            doShallowMount();
            await Vue.nextTick();
        });

        it('renders workflow placeholder, if workflow is empty', () => {
            expect(wrapper.findComponent(WorkflowEmpty).exists()).toBe(true);
            expect(wrapper.findComponent(Workflow).exists()).toBe(false);
        });

        it('container size update fills the screen', async () => {
            storeConfig.canvas.actions.fillScreen.mockReset();
            
            const kanvas = wrapper.findComponent(Kanvas);
            kanvas.vm.$emit('container-size-changed');
    
            await Vue.nextTick();
            expect(storeConfig.canvas.actions.fillScreen).toHaveBeenCalledTimes(1);
        });

        test('switch to empty workflow', async () => {
            storeConfig.canvas.actions.fillScreen.mockReset();

            // workaround, instead of triggering the canvas getter to reevaluate
            wrapper.vm.$options.watch.isWorkflowEmpty.handler.call(wrapper.vm, true);
            await Vue.nextTick();

            expect(storeConfig.canvas.mutations.setInteractionsEnabled).toHaveBeenCalledWith(expect.anything(), false);
            expect(storeConfig.canvas.actions.fillScreen).toHaveBeenCalled();
            expect(storeConfig.panel.actions.setNodeRepositoryActive).toHaveBeenCalled();
        });

        it('sets node repository as active', () => {
            doShallowMount();

            expect(storeConfig.panel.actions.setNodeRepositoryActive).toHaveBeenCalled();
        });
    });

    it('zooms to fit after mounting', async () => {
        doShallowMount();
        await Vue.nextTick();

        expect(storeConfig.canvas.actions.fillScreen).toHaveBeenCalled();
    });

    it('does not zoom to fit after mounting if a canvas state exists for this worflow', async () => {
        storeConfig.application.getters.workflowCanvasState = () => ({});
        $store = mockVuexStore(storeConfig);

        mocks = { $store };
        shallowMount(WorkflowCanvas, { mocks });
        await Vue.nextTick();

        expect(storeConfig.canvas.actions.fillScreen).not.toHaveBeenCalled();
    });

    describe('clearing selected objects', () => {
        it('should deselect when right-clicking on canvas', () => {
            doShallowMount();
            wrapper.findComponent(Kanvas).vm.$emit('contextmenu', {});
    
            expect(storeConfig.selection.actions.deselectAllObjects).toHaveBeenCalled();
        });

        it('should not deselect when event was already prevented', () => {
            doShallowMount();
            wrapper.findComponent(Kanvas).vm.$emit('contextmenu', { defaultPrevented: true });
    
            expect(storeConfig.selection.actions.deselectAllObjects).not.toHaveBeenCalled();
        });
    });
});
