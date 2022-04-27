/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';

import WorkflowPanel from '~/components/WorkflowPanel';
import ContextMenu from '~/components/ContextMenu';

describe('WorkflowPanel', () => {
    let propsData, mocks, doShallowMount, wrapper, $store, workflow, workflowStoreConfig, storeConfig;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;
        propsData = {};
        workflow = {
            info: {
                containerType: 'project',
                containerId: 'root'
            },
            parents: []
        };
        workflowStoreConfig = {
            state: {
                activeWorkflow: workflow
            },
            getters: {
                isLinked() {
                    return workflow.info.linked;
                },
                isInsideLinked() {
                    return workflow.parents.some(p => p.linked);
                },
                insideLinkedType() {
                    return workflow.parents.find(p => p.linked).containerType;
                },
                isStreaming() {
                    return workflow.info.jobManager;
                },
                isWritable() {
                    return !(workflow.info.linked || workflow.parents.some(p => p.linked));
                },
                activeWorkflowId() {
                    return workflow.info.containerId;
                }
            }
        };
        storeConfig = {
            workflow: workflowStoreConfig
        };

        $store = mockVuexStore(storeConfig);

        mocks = { $store };
        doShallowMount = () => {
            wrapper = shallowMount(WorkflowPanel, { propsData, mocks });
        };
    });

    describe('Linked and Streaming', () => {
        it.each(['metanode', 'component'])('write-protects linked %s and shows warning', (containerType) => {
            workflow.info.linked = true;
            workflow.info.containerType = containerType;
            doShallowMount();

            expect(wrapper.find('.read-only').exists()).toBe(true);

            const notification = wrapper.find('.workflow-info').find('span');
            expect(notification.text()).toBe(`This is a linked ${containerType} and can therefore not be edited.`);
            expect(notification.text()).not.toContain('inside a linked');
        });

        it.each([
            ['metanode', 'component'],
            ['component', 'metanode']
        ])('write-protects %s inside a linked %s and shows warning', (containerType, insideLinkedType) => {
            workflow.parents.push({ linked: true, containerType: insideLinkedType });
            workflow.info.containerType = containerType;
            doShallowMount();

            expect(wrapper.find('.read-only').exists()).toBe(true);

            const notification = wrapper.find('.workflow-info').find('span');
            expect(notification.text())
                .toBe(`This is a ${containerType} inside a linked ${insideLinkedType} and cannot be edited.`);
            expect(notification.text()).not.toContain(`This is a linked ${containerType}`);
        });

        it('shows decorator in streaming component', () => {
            workflow.info.jobManager = 'test';
            doShallowMount();
            expect(wrapper.find('.streaming-indicator').exists()).toBe(true);
        });

        it('is not linked', () => {
            doShallowMount();
            expect(wrapper.find('.read-only').exists()).toBe(false);
            expect(wrapper.find('.workflow-info').exists()).toBe(false);
        });
    });

    describe('Context menu', () => {
        it('renders context menu', async () => {
            doShallowMount();
            
            expect(wrapper.findComponent(ContextMenu).exists()).toBe(false);
            
            wrapper.trigger('contextmenu', { clientX: 242, clientY: 122 });
            await wrapper.vm.$nextTick();
            
            expect(wrapper.findComponent(ContextMenu).props('position')).toStrictEqual({ x: 242, y: 122 });
        });

        it('handles @menu-close event from ContextMenu properly', async () => {
            doShallowMount();
            
            wrapper.trigger('contextmenu', { clientX: 100, clientY: 200 });
            await wrapper.vm.$nextTick();
            
            wrapper.findComponent(ContextMenu).vm.$emit('menu-close');
            
            await wrapper.vm.$nextTick();
            expect(wrapper.findComponent(ContextMenu).exists()).toBe(false);
        });
    });
});
