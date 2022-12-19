import Vue from 'vue';
import Vuex from 'vuex';
import { shallowMount, createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '@/test/test-utils';

import NodeLabel from '../NodeLabel.vue';
import NodeLabelText from '../NodeLabelText.vue';
import NodeLabelEditor from '../NodeLabelEditor.vue';

describe('NodeLabel', () => {
    const defaultProps = {
        nodeId: 'root:1',
        nodePosition: { x: 15, y: 13 },
        kind: 'metanode',
        value: 'Test label',
        editable: true
    };

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    const doShallowMount = ({ propsData = {}, $store }) => {
        const wrapper = shallowMount(NodeLabel, {
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
                        labelEditorNodeId: 'root:2'
                    },
                    actions: {
                        openLabelEditor: jest.fn(),
                        closeLabelEditor: jest.fn(),
                        renameNodeLabel: jest.fn()
                    }
                }
            };

            const $store = mockVuexStore(storeConfig);

            wrapper = doShallowMount({ $store });
        });

        it('should render properly', () => {
            expect(wrapper.findComponent(NodeLabelText).exists()).toBe(true);
            expect(wrapper.findComponent(NodeLabelEditor).exists()).toBe(false);
        });

        it('should forward props', () => {
            expect(wrapper.findComponent(NodeLabelText).props()).toEqual(
                expect.objectContaining({
                    value: defaultProps.value,
                    kind: defaultProps.kind,
                    editable: defaultProps.editable,
                    nodeId: defaultProps.nodeId
                })
            );
        });

        it('should emit a contextmenu event', () => {
            wrapper.findComponent(NodeLabelText).vm.$emit('contextmenu', { mock: 'mock' });

            expect(wrapper.emitted('contextmenu')[0][0]).toEqual({ mock: 'mock' });
        });

        it('should handle a name change request', () => {
            wrapper.findComponent(NodeLabelText).vm.$emit('request-edit');
            expect(storeConfig.workflow.actions.openLabelEditor).toHaveBeenCalled();
        });
    });

    describe('Handles editor', () => {
        let storeConfig, wrapper, $store;

        beforeEach(() => {
            storeConfig = {
                workflow: {
                    state: {
                        labelEditorNodeId: 'root:1'
                    },
                    actions: {
                        openLabelEditor: jest.fn(),
                        closeLabelEditor: jest.fn(),
                        renameNodeLabel: jest.fn()
                    }
                }
            };

            $store = mockVuexStore(storeConfig);

            wrapper = doShallowMount({ $store });
        });

        it('should render properly', () => {
            expect(wrapper.findComponent(NodeLabelEditor).exists()).toBe(true);
            expect(wrapper.findComponent(NodeLabelText).exists()).toBe(false);
        });

        it('should portal editor when visible', () => {
            expect(wrapper.find('portal[to="node-text-editor"]').exists()).toBe(true);
        });

        it('should forward props', () => {
            expect(wrapper.findComponent(NodeLabelEditor).props()).toEqual(
                expect.objectContaining({
                    nodeId: defaultProps.nodeId,
                    value: defaultProps.value,
                    kind: defaultProps.kind,
                    nodePosition: defaultProps.nodePosition
                })
            );
        });

        it('should handle saving the label', async () => {
            jest.useFakeTimers();
            const saveEventPayload = { newLabel: 'New label' };

            wrapper.findComponent(NodeLabelEditor).vm.$emit('save', saveEventPayload);
            expect(storeConfig.workflow.actions.renameNodeLabel).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({ nodeId: defaultProps.nodeId, label: saveEventPayload.newLabel })
            );

            jest.runAllTimers();
            expect(storeConfig.workflow.actions.closeLabelEditor).toHaveBeenCalled();

            // emulate editor being closed from store
            $store.state.workflow.labelEditorNodeId = null;

            await Vue.nextTick();
            expect(wrapper.findComponent(NodeLabelEditor).exists()).toBe(false);
            expect(wrapper.findComponent(NodeLabelText).exists()).toBe(true);
        });

        it('should handle closing the editor', async () => {
            wrapper.findComponent(NodeLabelEditor).vm.$emit('cancel');

            expect(storeConfig.workflow.actions.closeLabelEditor).toHaveBeenCalled();

            // emulate editor being closed from store
            $store.state.workflow.labelEditorNodeId = null;

            await Vue.nextTick();
            expect(wrapper.findComponent(NodeLabelEditor).exists()).toBe(false);
            expect(wrapper.findComponent(NodeLabelText).exists()).toBe(true);
        });
    });
});
