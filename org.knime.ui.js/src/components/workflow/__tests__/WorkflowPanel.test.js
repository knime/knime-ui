import Vuex from 'vuex';
import { createLocalVue, shallowMount } from '@vue/test-utils';

import { mockVuexStore } from '@/test/test-utils/mockVuexStore';

import { saveWorkflowLocally } from '@api';
import Button from 'webapps-common/ui/components/Button.vue';

import * as selectionStore from '@/store/selection';
import * as applicationStore from '@/store/application';

import ContextMenu from '@/components/application/ContextMenu.vue';
import PortTypeMenu from '@/components/workflow/ports/PortTypeMenu.vue';

import WorkflowPanel from '../WorkflowPanel.vue';
import QuickAddNodeMenu from '@/components/workflow/node/quickAdd/QuickAddNodeMenu.vue';

jest.mock('@api', () => ({
    __esModule: true,
    saveWorkflowLocally: jest.fn()
}));

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
                activeWorkflow: workflow,
                portTypeMenu: {
                    isOpen: false,
                    props: {},
                    events: {}
                },
                quickAddNodeMenu: {
                    isOpen: false,
                    props: {},
                    events: {}
                }
            },
            actions: {
                openQuickAddNodeMenu: jest.fn(),
                closeQuickAddNodeMenu: jest.fn(),
                openPortTypeMenu: jest.fn(),
                closePortTypeMenu: jest.fn()
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
                isOnHub() {
                    return workflow.info.onHub || workflow.parents.some(p => p.onHub);
                }
            }
        };
        storeConfig = {
            workflow: workflowStoreConfig,
            application: applicationStore,
            canvas: {
                getters: {
                    screenToCanvasCoordinates: () => position => position
                }
            },
            selection: selectionStore
        };

        $store = mockVuexStore(storeConfig);

        mocks = { $store };
        doShallowMount = () => {
            wrapper = shallowMount(WorkflowPanel, { propsData, mocks, $store });
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

    describe('On the hub', () => {
        it('shows banner if workflow is on the hub', () => {
            workflow.info.onHub = true;
            doShallowMount();
            expect(wrapper.find('.banner').exists()).toBe(true);
        });

        it('saves workflow locally when button is clicked', async () => {
            workflow.info.onHub = true;
            $store.state.application.activeProjectId = 'id1';
            doShallowMount();
            const button = wrapper.findComponent(Button);
            expect(button.exists()).toBe(true);
            await button.vm.$emit('click');

            expect(saveWorkflowLocally).toHaveBeenCalledWith({ projectId: 'id1' });
        });
    });

    describe('Context menu', () => {
        const createEvent = (x, y) => ({
            clientX: x,
            clientY: y,
            preventDefault: jest.fn(),
            stopPropagation: jest.fn()
        });

        it('renders context menu', async () => {
            doShallowMount();

            expect(wrapper.findComponent(ContextMenu).exists()).toBe(false);

            wrapper.vm.$store.dispatch('application/toggleContextMenu', { event: createEvent(242, 122) });
            await wrapper.vm.$nextTick();

            expect(wrapper.findComponent(ContextMenu).props('position')).toStrictEqual({ x: 242, y: 122 });
        });

        it('handles @menu-close event from ContextMenu properly', async () => {
            doShallowMount();

            wrapper.trigger('contextmenu', { clientX: 100, clientY: 200 });
            wrapper.vm.$store.dispatch('application/toggleContextMenu', { event: createEvent(100, 200) });
            await wrapper.vm.$nextTick();

            wrapper.findComponent(ContextMenu).vm.$emit('menu-close');

            await wrapper.vm.$nextTick();
            expect(wrapper.findComponent(ContextMenu).exists()).toBe(false);
        });

        it('prevents native context menu by default', async () => {
            doShallowMount();
            const preventDefault = jest.fn();
            await wrapper.trigger('contextmenu', { preventDefault });
            expect(preventDefault).toHaveBeenCalled();
        });

        it('allows native context menu if source element allows it', async () => {
            doShallowMount();
            const preventDefault = jest.fn();
            wrapper.element.classList.add('native-context-menu');
            await wrapper.trigger('contextmenu', { preventDefault });
            expect(preventDefault).not.toHaveBeenCalled();
        });
    });

    describe('Port Type menu', () => {
        let closeCallback;

        beforeEach(() => {
            closeCallback = jest.fn();
            storeConfig.workflow.state.portTypeMenu = {
                isOpen: true,
                props: {
                    side: 'input',
                    position: { x: 0, y: 0 }
                },
                events: { 'menu-close': closeCallback }
            };
        });

        test('renders if open', () => {
            storeConfig.workflow.state.portTypeMenu.isOpen = false;
            doShallowMount();
            expect(wrapper.findComponent(PortTypeMenu).exists()).toBe(false);

            storeConfig.workflow.state.portTypeMenu.isOpen = true;
            doShallowMount();
            expect(wrapper.findComponent(PortTypeMenu).exists()).toBe(true);
        });

        test('passes props', () => {
            storeConfig.workflow.state.portTypeMenu.isOpen = true;
            doShallowMount();
            expect(wrapper.findComponent(PortTypeMenu).exists()).toBe(true);
            let portMenu = wrapper.findComponent(PortTypeMenu);
            expect(portMenu.vm.side).toBe('input');
        });

        test('binds events', () => {
            storeConfig.workflow.state.portTypeMenu.isOpen = true;
            doShallowMount();
            let portMenu = wrapper.findComponent(PortTypeMenu);
            portMenu.vm.$emit('menu-close');
            expect(closeCallback).toHaveBeenCalled();
        });
    });

    describe('Quick add node menu', () => {
        let closeCallback;

        beforeEach(() => {
            closeCallback = jest.fn();
            storeConfig.workflow.state.quickAddNodeMenu = {
                isOpen: true,
                props: { direction: 'in', position: { x: 0, y: 0 }, port: { index: 2 }, nodeId: 'node:0' },
                events: { 'menu-close': closeCallback }
            };
        });

        test('renders menu if open', () => {
            storeConfig.workflow.state.quickAddNodeMenu.isOpen = false;
            doShallowMount();
            expect(wrapper.findComponent(QuickAddNodeMenu).exists()).toBe(false);

            storeConfig.workflow.state.quickAddNodeMenu.isOpen = true;
            doShallowMount();
            expect(wrapper.findComponent(QuickAddNodeMenu).exists()).toBe(true);
        });

        test('passes props', () => {
            doShallowMount();
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

        test('binds events', () => {
            doShallowMount();
            let quickAddNodeMenu = wrapper.findComponent(QuickAddNodeMenu);
            quickAddNodeMenu.vm.$emit('menu-close');
            expect(closeCallback).toHaveBeenCalled();
        });
    });
});
