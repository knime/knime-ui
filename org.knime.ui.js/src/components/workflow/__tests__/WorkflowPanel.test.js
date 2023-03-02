import * as Vue from 'vue';
import { merge } from 'lodash';
import { shallowMount } from '@vue/test-utils';

import { mockVuexStore } from '@/test/test-utils/mockVuexStore';

import Button from 'webapps-common/ui/components/Button.vue';

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
                activeWorkflow: merge(baseWorkflow, workflow),
                portTypeMenu: {
                    isOpen: false
                },
                quickAddNodeMenu: {
                    isOpen: false
                }
            },
            actions: {
                saveWorkflowAs: () => {}
            },
            getters: {
                isLinked({ activeWorkflow }) {
                    return activeWorkflow.info.linked;
                },
                isInsideLinked({ activeWorkflow }) {
                    return activeWorkflow.parents.some(({ linked }) => linked);
                },
                insideLinkedType({ activeWorkflow }) {
                    return activeWorkflow.parents.find(({ linked }) => linked).containerType;
                },
                isStreaming({ activeWorkflow }) {
                    return activeWorkflow.info.jobManager;
                },
                isWritable({ activeWorkflow }) {
                    return !(activeWorkflow.info.linked || activeWorkflow.parents.some(({ linked }) => linked));
                },
                isOnHub({ activeWorkflow }) {
                    return activeWorkflow.info.onHub || activeWorkflow.parents.some(({ onHub }) => onHub);
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

        const dispatchSpy = vi.spyOn($store, 'dispatch');

        const wrapper = shallowMount(WorkflowPanel, {
            props,
            global: { plugins: [$store] }
        });

        return { wrapper, $store, dispatchSpy };
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

    describe('On the hub', () => {
        it('shows banner if workflow is on the hub', async () => {
            const { wrapper, $store } = doShallowMount();
            $store.state.workflow.activeWorkflow.info.onHub = true;
            await Vue.nextTick();
            await Vue.nextTick();
            await Vue.nextTick();
            expect(wrapper.find('.banner').exists()).toBe(true);
        });

        it('saves workflow locally when button is clicked', async () => {
            const { wrapper, $store, dispatchSpy } = doShallowMount();
            $store.state.workflow.activeWorkflow.info.onHub = true;
            await Vue.nextTick();
            const button = wrapper.findComponent(Button);
            expect(button.exists()).toBe(true);
            await button.vm.$emit('click');

            expect(dispatchSpy).toHaveBeenCalledWith('workflow/saveWorkflowAs');
        });
    });

    describe('Context menu', () => {
        const createEvent = (x, y) => ({
            clientX: x,
            clientY: y,
            preventDefault: vi.fn(),
            stopPropagation: vi.fn()
        });

        it('renders context menu', async () => {
            const { wrapper } = doShallowMount();

            expect(wrapper.findComponent(ContextMenu).exists()).toBe(false);

            wrapper.vm.$store.dispatch('application/toggleContextMenu', { event: createEvent(242, 122) });
            await wrapper.vm.$nextTick();

            expect(wrapper.findComponent(ContextMenu).props('position')).toStrictEqual({ x: 242, y: 122 });
        });

        it('handles @menuClose event from ContextMenu properly', async () => {
            const { wrapper } = doShallowMount();

            wrapper.trigger('contextmenu', { clientX: 100, clientY: 200 });
            wrapper.vm.$store.dispatch('application/toggleContextMenu', { event: createEvent(100, 200) });
            await wrapper.vm.$nextTick();

            wrapper.findComponent(ContextMenu).vm.$emit('menuClose');

            await wrapper.vm.$nextTick();
            expect(wrapper.findComponent(ContextMenu).exists()).toBe(false);
        });

        it('prevents native context menu by default', async () => {
            const { wrapper } = doShallowMount();
            const preventDefault = vi.fn();
            await wrapper.trigger('contextmenu', { preventDefault });
            expect(preventDefault).toHaveBeenCalled();
        });

        it('allows native context menu if source element allows it', async () => {
            const { wrapper } = doShallowMount();
            const preventDefault = vi.fn();
            wrapper.element.classList.add('native-context-menu');
            await wrapper.trigger('contextmenu', { preventDefault });
            expect(preventDefault).not.toHaveBeenCalled();
        });
    });

    describe('Port Type menu', () => {
        const mountAndOpenMenu = async ({ closeCallback = vi.fn() } = {}) => {
            const mountResult = doShallowMount();
            mountResult.$store.state.workflow.portTypeMenu = {
                isOpen: true,
                props: {
                    side: 'input',
                    position: { x: 0, y: 0 }
                },
                events: { menuClose: closeCallback }
            };
            await Vue.nextTick();

            return { ...mountResult, closeCallback };
        };

        test('renders if open', async () => {
            const { wrapper, $store } = doShallowMount();
            expect(wrapper.findComponent(PortTypeMenu).exists()).toBe(false);

            $store.state.workflow.portTypeMenu = {
                isOpen: true,
                props: {
                    side: 'input',
                    position: { x: 0, y: 0 }
                },
                events: {}
            };

            await Vue.nextTick();
            expect(wrapper.findComponent(PortTypeMenu).exists()).toBe(true);
        });

        test('passes props', async () => {
            const { wrapper } = await mountAndOpenMenu();
            expect(wrapper.findComponent(PortTypeMenu).exists()).toBe(true);
            let portMenu = wrapper.findComponent(PortTypeMenu);

            expect(portMenu.vm.side).toBe('input');
        });

        test('binds events', async () => {
            const { wrapper, closeCallback } = await mountAndOpenMenu();
            let portMenu = wrapper.findComponent(PortTypeMenu);
            await portMenu.vm.$emit('menuClose');
            expect(closeCallback).toHaveBeenCalled();
        });
    });

    describe('Quick add node menu', () => {
        const mountAndOpenMenu = async ({ closeCallback = vi.fn() } = {}) => {
            const mountResult = doShallowMount();
            mountResult.$store.state.workflow.quickAddNodeMenu = {
                isOpen: true,
                props: { direction: 'in', position: { x: 0, y: 0 }, port: { index: 2 }, nodeId: 'node:0' },
                events: { menuClose: closeCallback }
            };
            await Vue.nextTick();

            return { ...mountResult, closeCallback };
        };

        test('renders menu if open', async () => {
            const { wrapper, $store } = doShallowMount();
            expect(wrapper.findComponent(QuickAddNodeMenu).exists()).toBe(false);

            $store.state.workflow.quickAddNodeMenu = {
                isOpen: true,
                props: { direction: 'in', position: { x: 0, y: 0 }, port: { index: 2 }, nodeId: 'node:0' },
                events: { }
            };

            await Vue.nextTick();
            expect(wrapper.findComponent(QuickAddNodeMenu).exists()).toBe(true);
        });

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
    });
});
