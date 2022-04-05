/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';
import Vue from 'vue';

import WorkflowCanvas from '~/components/WorkflowCanvas';
import Workflow from '~/components/workflow/Workflow';
import SelectionRectangle from '~/components/SelectionRectangle';
import Kanvas from '~/components/Kanvas';
import WorkflowEmpty from '~/components/workflow/WorkflowEmpty';

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
            }
        };

        $store = mockVuexStore(storeConfig);

        mocks = { $store };
        doShallowMount = () => {
            wrapper = shallowMount(WorkflowCanvas, { mocks });
        };
    });

    it('draws workflow boundary', () => {
        doShallowMount();

        let workflowSheet = wrapper.find('.workflow-sheet');
        expect(Number(workflowSheet.attributes('x'))).toBe(5);
        expect(Number(workflowSheet.attributes('y'))).toBe(10);
        expect(Number(workflowSheet.attributes('width'))).toBe(20);
        expect(Number(workflowSheet.attributes('height'))).toBe(30);
    });

    it('zooms to fit after mounting', async () => {
        doShallowMount();
        await Vue.nextTick();

        expect(storeConfig.canvas.actions.fillScreen).toHaveBeenCalled();
    });

    it('clicking on empty canvas deselects all', () => {
        doShallowMount();
        
        let workflowComponent = wrapper.findComponent(Workflow);
        
        workflowComponent.vm.applyNodeSelectionPreview = jest.fn();
        wrapper.findComponent(SelectionRectangle).vm.$emit('node-selection-preview', 'args');

        expect(workflowComponent.vm.applyNodeSelectionPreview).toHaveBeenCalledWith('args');
    });

    it('correctly renders when isWorkflowEmpty is true', () => {
        isWorkflowEmpty = true;
        doShallowMount();

        expect(wrapper.findComponent(WorkflowEmpty).exists()).toBe(true);
        expect(wrapper.findComponent(Workflow).exists()).toBe(false);
    });

    it('correctly renders when isWorkflowEmpty is false', () => {
        doShallowMount();

        expect(wrapper.findComponent(WorkflowEmpty).exists()).toBe(false);
        expect(wrapper.findComponent(Workflow).exists()).toBe(true);
    });

    it('calls setInteractionsEnabled', () => {
        doShallowMount();

        expect(storeConfig.canvas.mutations.setInteractionsEnabled).toHaveBeenCalledWith(expect.anything(), true);
    });

    it('fills the screen', async () => {
        isWorkflowEmpty = true;
        doShallowMount();
        await Vue.nextTick();
        expect(storeConfig.canvas.actions.fillScreen).toHaveBeenCalled();
        const kanvas = wrapper.findComponent(Kanvas);
        kanvas.vm.$emit('container-size-updated');

        await Vue.nextTick();
        await Vue.nextTick();
        expect(storeConfig.canvas.actions.fillScreen).toHaveBeenCalledTimes(2);
    });

    it('does not fill the screen if workflow is not empty', async () => {
        doShallowMount();
        await Vue.nextTick();
        expect(storeConfig.canvas.actions.fillScreen).toHaveBeenCalled();
        const kanvas = wrapper.findComponent(Kanvas);
        kanvas.vm.$emit('container-size-updated');

        await Vue.nextTick();
        await Vue.nextTick();
        expect(storeConfig.canvas.actions.fillScreen).toHaveBeenCalledTimes(1);
    });
});
