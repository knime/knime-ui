import * as Vue from 'vue';
import { shallowMount } from '@vue/test-utils';

import { mockVuexStore } from '@/test/test-utils/mockVuexStore';

import ContextMenu from '@/components/application/ContextMenu.vue';
import PortTypeMenu from '@/components/workflow/ports/PortTypeMenu.vue';

import WorkflowPanel from '../WorkflowPanel.vue';

describe('WorkflowPanel', () => {
    let props, doShallowMount, wrapper, $store, workflow, workflowStoreConfig, storeConfig;

    beforeEach(() => {
        wrapper = null;
        props = {};
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
                }
            }
        };
        storeConfig = {
            workflow: workflowStoreConfig,
            canvas: {
                getters: {
                    screenToCanvasCoordinates: () => position => position
                }
            }
        };

        $store = mockVuexStore(storeConfig);

        doShallowMount = () => {
            wrapper = shallowMount(WorkflowPanel, { props, global: { plugins: [$store] } });
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

    describe('Port Type menu', () => {
        let closeCallback;

        beforeEach(async () => {
            doShallowMount();

            expect(wrapper.findComponent(PortTypeMenu).exists()).toBe(false);

            closeCallback = jest.fn();
            wrapper.trigger('open-port-type-menu', {
                detail: {
                    id: '0',
                    props: { side: 'input', position: { x: 0, y: 0 } },
                    events: { 'menu-close': closeCallback }
                }
            });

            await Vue.nextTick();
        });

        test('passes props', () => {
            let portMenu = wrapper.findComponent(PortTypeMenu);
            expect(portMenu.vm.side).toBe('input');
        });

        test('binds events', () => {
            let portMenu = wrapper.findComponent(PortTypeMenu);
            portMenu.vm.$emit('menu-close');
            expect(closeCallback).toHaveBeenCalled();
        });

        test('opening another menu closes current one', () => {
            expect(closeCallback).not.toHaveBeenCalled();

            wrapper.trigger('open-port-type-menu', {
                detail: {
                    id: '1',
                    props: { side: 'input', position: { x: 0, y: 0 } },
                    events: {}
                }
            });

            expect(closeCallback).toHaveBeenCalled();
        });

        test('close menu', async () => {
            wrapper.trigger('close-port-type-menu', {
                detail: {
                    id: '0'
                }
            });
            await Vue.nextTick();

            expect(wrapper.findComponent(PortTypeMenu).exists()).toBe(false);
        });

        test('close event doesn`t interfere with current menu', async () => {
            wrapper.trigger('close-port-type-menu', {
                detail: {
                    id: '1'
                }
            });
            await Vue.nextTick();

            expect(wrapper.findComponent(PortTypeMenu).exists()).toBe(true);
        });
    });
});
