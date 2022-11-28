import * as Vue from 'vue';
import { merge } from 'lodash';
import { shallowMount } from '@vue/test-utils';

import { mockVuexStore } from '@/test/test-utils/mockVuexStore';

import * as selectionStore from '@/store/selection';
import * as applicationStore from '@/store/application';

import ContextMenu from '@/components/application/ContextMenu.vue';
import PortTypeMenu from '@/components/workflow/ports/PortTypeMenu.vue';

import WorkflowPanel from '../WorkflowPanel.vue';
import QuickAddNodeMenu from '@/components/workflow/node/quickAdd/QuickAddNodeMenu.vue';

describe('WorkflowPanel', () => {
    const doShallowMount = ({ props = {}, workflow = {} } = {}) => {
        const baseWorkflow = {
            info: {
                containerType: 'project',
                containerId: 'root'
            },
            parents: []
        };
        
        const workflowStoreConfig = {
            state: {
                activeWorkflow: merge(baseWorkflow, workflow)
            },
            getters: {
                isLinked() {
                    return baseWorkflow.info.linked;
                },
                isInsideLinked() {
                    return baseWorkflow.parents.some(p => p.linked);
                },
                insideLinkedType() {
                    return baseWorkflow.parents.find(p => p.linked).containerType;
                },
                isStreaming() {
                    return baseWorkflow.info.jobManager;
                },
                isWritable() {
                    return !(baseWorkflow.info.linked || baseWorkflow.parents.some(p => p.linked));
                }
            }
        };

        const storeConfig = {
            workflow: workflowStoreConfig,
            application: applicationStore,
            canvas: {
                getters: {
                    screenToCanvasCoordinates: () => position => position
                }
            },
            selection: selectionStore
        };

        const $store = mockVuexStore(storeConfig);

        const wrapper = shallowMount(WorkflowPanel, {
            props,
            global: { plugins: [$store] }
        });

        return { wrapper, $store };
    };

    describe('Linked and Streaming', () => {
        it.each(['metanode', 'component'])('write-protects linked %s and shows warning', (containerType) => {
            const { wrapper } = doShallowMount({ workflow: { info: { linked: true, containerType } } });
            expect(wrapper.find('.read-only').exists()).toBe(true);

            const notification = wrapper.find('.workflow-info').find('span');
            expect(notification.text()).toBe(`This is a linked ${containerType} and can therefore not be edited.`);
            expect(notification.text()).not.toContain('inside a linked');
        });

        it.each([
            ['metanode', 'component'],
            ['component', 'metanode']
        ])('write-protects %s inside a linked %s and shows warning', (containerType, insideLinkedType) => {
            const { wrapper } = doShallowMount({
                workflow: {
                    parents: [{ linked: true, containerType: insideLinkedType }],
                    info: { containerType }
                }
            });

            expect(wrapper.find('.read-only').exists()).toBe(true);

            const notification = wrapper.find('.workflow-info').find('span');
            expect(notification.text())
                .toBe(`This is a ${containerType} inside a linked ${insideLinkedType} and cannot be edited.`);
            expect(notification.text()).not.toContain(`This is a linked ${containerType}`);
        });

        it('shows decorator in streaming component', () => {
            const { wrapper } = doShallowMount({ workflow: { info: { jobManager: 'test' } } });
            expect(wrapper.find('.streaming-indicator').exists()).toBe(true);
        });

        it('is not linked', () => {
            const { wrapper } = doShallowMount();
            expect(wrapper.find('.read-only').exists()).toBe(false);
            expect(wrapper.find('.workflow-info').exists()).toBe(false);
        });
    });

    describe('Context menu', () => {
        it('renders context menu', async () => {
            const { wrapper } = doShallowMount();

            expect(wrapper.findComponent(ContextMenu).exists()).toBe(false);

            await wrapper.trigger('contextmenu', { clientX: 242, clientY: 122 });

            expect(wrapper.findComponent(ContextMenu).props('position')).toStrictEqual({ x: 242, y: 122 });
        });

        it('handles @menuClose event from ContextMenu properly', async () => {
            const { wrapper } = doShallowMount();

            await wrapper.trigger('contextmenu', { clientX: 100, clientY: 200 });

            wrapper.findComponent(ContextMenu).vm.$emit('menuClose');

            await wrapper.vm.$nextTick();
            expect(wrapper.findComponent(ContextMenu).exists()).toBe(false);
        });

        it('closes PortTypeMenu when context menu is opened', async () => {
            const { wrapper } = doShallowMount();

            const id = '0';
            const closeCallback = (_wrapper, id) => () => {
                _wrapper.trigger('close-port-type-menu', { detail: { id } });
            };

            await wrapper.trigger('open-port-type-menu', {
                detail: {
                    id,
                    props: { side: 'input', position: { x: 0, y: 0 } },
                    events: { onMenuClose: closeCallback(wrapper, id) }
                }
            });

            expect(wrapper.findComponent(PortTypeMenu).exists()).toBe(true);

            await wrapper.trigger('contextmenu', { clientX: 100, clientY: 200 });

            expect(wrapper.findComponent(PortTypeMenu).exists()).toBe(false);
        });
        
        it('closes QuickAddNodeMenu when context menu is opened', async () => {
            const { wrapper } = doShallowMount();

            const id = '0';
            const closeCallback = (_wrapper, id) => () => {
                _wrapper.trigger('close-quick-add-node-menu', { detail: { id } });
            };

            wrapper.trigger('open-quick-add-node-menu', {
                detail: {
                    id,
                    props: { direction: 'in', position: { x: 0, y: 0 }, port: { index: 2 }, nodeId: 'node:0' },
                    events: { onMenuClose: closeCallback(wrapper, id) }
                }
            });

            await Vue.nextTick();
            expect(wrapper.findComponent(QuickAddNodeMenu).exists()).toBe(true);

            await wrapper.trigger('contextmenu', { clientX: 100, clientY: 200 });

            expect(wrapper.findComponent(QuickAddNodeMenu).exists()).toBe(false);
        });
    });

    describe('Port Type menu', () => {
        const mountAndOpenMenu = async () => {
            const mountResult = doShallowMount();

            expect(mountResult.wrapper.findComponent(PortTypeMenu).exists()).toBe(false);
            
            const closeCallback = jest.fn();
            await mountResult.wrapper.trigger('open-port-type-menu', {
                detail: {
                    id: '0',
                    props: { side: 'input', position: { x: 0, y: 0 } },
                    events: { onMenuClose: closeCallback }
                }
            });

            return { ...mountResult, closeCallback };
        };

        test('passes props', async () => {
            const { wrapper } = await mountAndOpenMenu();
            let portMenu = wrapper.findComponent(PortTypeMenu);

            expect(portMenu.vm.side).toBe('input');
        });

        test('binds events', async () => {
            const { wrapper, closeCallback } = await mountAndOpenMenu();
            let portMenu = wrapper.findComponent(PortTypeMenu);
            await portMenu.vm.$emit('menuClose');
            expect(closeCallback).toHaveBeenCalled();
        });

        test('opening another menu closes current one', async () => {
            const { wrapper, closeCallback } = await mountAndOpenMenu();
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
            const { wrapper } = await mountAndOpenMenu();
            wrapper.trigger('close-port-type-menu', {
                detail: {
                    id: '0'
                }
            });
            await Vue.nextTick();

            expect(wrapper.findComponent(PortTypeMenu).exists()).toBe(false);
        });

        test('close event doesn`t interfere with current menu', async () => {
            const { wrapper } = await mountAndOpenMenu();
            wrapper.trigger('close-port-type-menu', {
                detail: {
                    id: '1'
                }
            });
            await Vue.nextTick();

            expect(wrapper.findComponent(PortTypeMenu).exists()).toBe(true);
        });
    });

    describe('Quick add node menu', () => {
        const mountAndOpenMenu = async () => {
            const mountResult = doShallowMount();

            expect(mountResult.wrapper.findComponent(QuickAddNodeMenu).exists()).toBe(false);

            const closeCallback = jest.fn();
            mountResult.wrapper.trigger('open-quick-add-node-menu', {
                detail: {
                    id: '0',
                    props: { direction: 'in', position: { x: 0, y: 0 }, port: { index: 2 }, nodeId: 'node:0' },
                    events: { onMenuClose: closeCallback }
                }
            });

            await Vue.nextTick();
            return { ...mountResult, closeCallback };
        };

        test('passes props', async () => {
            const { wrapper } = await mountAndOpenMenu();
            let quickAddNodeMenu = wrapper.findComponent(QuickAddNodeMenu);
            expect(quickAddNodeMenu.props()).toEqual({
                nodeId: 'node:0',
                port: { index: 2 },
                position: {
                    x: 0,
                    y: 0
                }
            });
        });

        test('binds events', async () => {
            const { wrapper, closeCallback } = await mountAndOpenMenu();
            let quickAddNodeMenu = wrapper.findComponent(QuickAddNodeMenu);
            quickAddNodeMenu.vm.$emit('menuClose');
            expect(closeCallback).toHaveBeenCalled();
        });

        test('close menu', async () => {
            const { wrapper } = await mountAndOpenMenu();
            wrapper.trigger('close-quick-add-node-menu', {
                detail: {
                    id: '0'
                }
            });
            await Vue.nextTick();

            expect(wrapper.findComponent(QuickAddNodeMenu).exists()).toBe(false);
        });

        test('close event doesn`t interfere with current menu', async () => {
            const { wrapper } = await mountAndOpenMenu();
            wrapper.trigger('close-quick-add-node-menu', {
                detail: {
                    id: '1'
                }
            });
            await Vue.nextTick();

            expect(wrapper.findComponent(QuickAddNodeMenu).exists()).toBe(true);
        });
    });
});
