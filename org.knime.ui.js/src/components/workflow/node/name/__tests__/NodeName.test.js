import Vue from 'vue';
import Vuex from 'vuex';
import { shallowMount, createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '@/test/test-utils';

import NodeName from '../NodeName.vue';
import NodeNameText from '../NodeNameText.vue';
import NodeNameEditor from '../NodeNameEditor.vue';

describe('NodeName', () => {
    const defaultProps = {
        nodeId: 'root:1',
        nodePosition: { x: 15, y: 13 },
        editable: true,
        value: 'Test Name'
    };

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    const doShallowMount = ({ propsData = {}, $store }) => {
        const wrapper = shallowMount(NodeName, {
            propsData: { ...defaultProps, ...propsData },
            mocks: {
                $store
            }
        });

        return wrapper;
    };

    describe('Handles text', () => {
        let storeConfig, wrapper;

        beforeEach(() => {
            storeConfig = {
                workflow: {
                    state: {
                        nameEditorNodeId: 'editNodeId'
                    },
                    actions: {
                        openNameEditor: jest.fn(),
                        closeNameEditor: jest.fn(),
                        renameContainerNode: jest.fn()
                    }
                }
            };

            const $store = mockVuexStore(storeConfig);

            wrapper = doShallowMount({ $store });
        });

        it('should render properly', () => {
            expect(wrapper.findComponent(NodeNameText).exists()).toBe(true);
            expect(wrapper.findComponent(NodeNameEditor).exists()).toBe(false);
        });

        it('should forward props', () => {
            expect(wrapper.findComponent(NodeNameText).props()).toEqual(
                expect.objectContaining({
                    value: defaultProps.value,
                    editable: defaultProps.editable
                })
            );
        });

        it.each([
            ['width-change', 100],
            ['height-change', 100],
            ['mouseenter', { mock: 'mock' }],
            ['mouseleave', { mock: 'mock' }]
        ])('should emit a (%s) event', (eventName, payload) => {
            wrapper.findComponent(NodeNameText).vm.$emit(eventName, payload);

            expect(wrapper.emitted(eventName)[0][0]).toEqual(payload);
        });

        it('should handle a name change request', () => {
            wrapper.findComponent(NodeNameText).vm.$emit('request-edit');
            expect(storeConfig.workflow.actions.openNameEditor).toHaveBeenCalled();
        });

        it('should handle a name change requests triggered via the store (e.g. F2 key)', async () => {
            wrapper.vm.$store.state.workflow.nameEditorNodeId = wrapper.props('nodeId');
            await Vue.nextTick();
            expect(wrapper.emitted('edit-start')).toBeDefined();
        });
    });

    describe('Handles editor', () => {
        let storeConfig, wrapper, $store;

        beforeEach(() => {
            storeConfig = {
                workflow: {
                    state: {
                        nameEditorNodeId: defaultProps.nodeId
                    },
                    actions: {
                        openNameEditor: jest.fn(),
                        closeNameEditor: jest.fn(),
                        renameContainerNode: jest.fn()
                    }
                }
            };

            $store = mockVuexStore(storeConfig);

            wrapper = doShallowMount({ $store });
        });

        it('should render properly', () => {
            expect(wrapper.findComponent(NodeNameEditor).exists()).toBe(true);
            expect(wrapper.findComponent(NodeNameText).exists()).toBe(false);
        });

        it('should portal editor when visible', () => {
            expect(wrapper.find('portal[to="node-name-editor"]').exists()).toBe(true);
        });

        it('should forward props', () => {
            expect(wrapper.findComponent(NodeNameEditor).props()).toEqual(
                expect.objectContaining({
                    nodeId: defaultProps.nodeId,
                    value: defaultProps.value,
                    nodePosition: defaultProps.nodePosition
                })
            );
        });

        it.each([
            ['width-change', 100],
            ['height-change', 100]
        ])('should emit a (%s) event', (eventName, payload) => {
            wrapper.findComponent(NodeNameEditor).vm.$emit(eventName, payload);

            expect(wrapper.emitted(eventName)[0][0]).toEqual(payload);
        });

        it('should handle saving the name', async () => {
            jest.useFakeTimers();
            const saveEventPayload = {
                newName: 'This is new',
                dimensionsOnClose: {
                    width: 200,
                    height: 100
                }
            };

            wrapper.findComponent(NodeNameEditor).vm.$emit('save', saveEventPayload);
            expect(storeConfig.workflow.actions.renameContainerNode).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({ nodeId: defaultProps.nodeId, name: saveEventPayload.newName })
            );

            jest.runAllTimers();
            expect(storeConfig.workflow.actions.closeNameEditor).toHaveBeenCalled();

            // emulate editor being closed from store
            $store.state.workflow.nameEditorNodeId = null;

            await Vue.nextTick();
            expect(wrapper.findComponent(NodeNameEditor).exists()).toBe(false);
            expect(wrapper.findComponent(NodeNameText).exists()).toBe(true);
        });

        it('should handle closing the editor', async () => {
            wrapper.findComponent(NodeNameEditor).vm.$emit('cancel');

            expect(storeConfig.workflow.actions.closeNameEditor).toHaveBeenCalled();

            // emulate editor being closed from store
            $store.state.workflow.nameEditorNodeId = null;

            await Vue.nextTick();
            expect(wrapper.findComponent(NodeNameEditor).exists()).toBe(false);
            expect(wrapper.findComponent(NodeNameText).exists()).toBe(true);
        });

        it('should pass the initial dimensions to an editor that is opened a second time', async () => {
            const saveEventPayload = {
                newName: 'This is new',
                dimensionsOnClose: {
                    width: 200,
                    height: 100
                }
            };

            expect(wrapper.findComponent(NodeNameEditor).props('startWidth')).toBeNull();
            expect(wrapper.findComponent(NodeNameEditor).props('startHeight')).toBeNull();

            wrapper.findComponent(NodeNameEditor).vm.$emit('save', saveEventPayload);

            // emulate close and re-open editor
            await wrapper.vm.$nextTick();

            expect(wrapper.findComponent(NodeNameEditor).props('startWidth')).toBe(
                saveEventPayload.dimensionsOnClose.width
            );
            expect(wrapper.findComponent(NodeNameEditor).props('startHeight')).toBe(
                saveEventPayload.dimensionsOnClose.height
            );
        });
    });
});
