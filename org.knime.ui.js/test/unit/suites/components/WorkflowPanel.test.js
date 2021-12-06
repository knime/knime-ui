/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';
import Vue from 'vue';

import * as $shapes from '~/style/shapes';

import WorkflowPanel from '~/components/WorkflowPanel';
import Kanvas from '~/components/Kanvas';

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
                containerType: 'project'
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
                }
            }
        };
        storeConfig = {
            workflow: workflowStoreConfig,
            selection: {
                actions: {
                    deselectAllObjects: jest.fn()
                }
            }
        };

        $store = mockVuexStore(storeConfig);

        mocks = { $store, $shapes };
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

    it('deselects all objects when clicking the canvas', async () => {
        doShallowMount();

        wrapper.findComponent(Kanvas).vm.$emit('empty-pointerdown');
        await Vue.nextTick();

        expect(storeConfig.selection.actions.deselectAllObjects).toHaveBeenCalled();
    });

    // TODO: NXT-803 add tests for the context menu?
});
