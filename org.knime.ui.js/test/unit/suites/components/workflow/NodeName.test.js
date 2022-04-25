import { shallowMount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import Vue from 'vue';
import { mockVuexStore } from '~/test/unit/test-utils';

import NodeName from '~/components/workflow/NodeName';
import NodeNameText from '~/components/workflow/NodeNameText';
import NodeNameEditor from '~/components/workflow/NodeNameEditor';

describe('NodeName', () => {
    const defaultProps = {
        nodeId: 'root:1',
        nodePosition: { x: 15, y: 13 },
        editable: true,
        value: 'Test Name'
    };

    // TODO: please use common unit test pattern
    const createStore = (customState) => {
        const state = {
            ...customState
        };

        const actions = {
            renameContainer: jest.fn()
        };
    
        const mockStore = mockVuexStore({
            workflow: {
                state,
                actions
            }
        });

        return { $store: mockStore, actions, state };
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
        let $store, actions, wrapper;

        beforeEach(() => {
            const mockStore = createStore();
            $store = mockStore.$store;
            actions = mockStore.actions;
            
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
            ['mouseleave', { mock: 'mock' }],
            ['contextmenu', { mock: 'mock' }]
        ])('should emit a (%s) event', (eventName, payload) => {
            wrapper.findComponent(NodeNameText).vm.$emit(eventName, payload);

            expect(wrapper.emitted(eventName)[0][0]).toEqual(payload);
        });
    
        it('should handle a name change request', () => {
            wrapper.findComponent(NodeNameText).vm.$emit('request-edit');
            expect(wrapper.emitted('edit-start')).toBeDefined();
        });
    });
    

    describe('Handles editor', () => {
        let $store, actions, wrapper;

        beforeEach(() => {
            const mockStore = createStore();
            $store = mockStore.$store;
            actions = mockStore.actions;
            wrapper = doShallowMount({ $store });
            wrapper.setData({ isEditing: true });
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
            expect(actions.renameContainer).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({ nodeId: defaultProps.nodeId, name: saveEventPayload.newName })
            );
            
            jest.runAllTimers();
            await Vue.nextTick();
            expect(wrapper.findComponent(NodeNameEditor).exists()).toBe(false);
            expect(wrapper.findComponent(NodeNameText).exists()).toBe(true);
        });

        it('should handle closing the editor', async () => {
            wrapper.findComponent(NodeNameEditor).vm.$emit('cancel');
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
            $store.state.workflow.nameEditorNodeId = null;
            await wrapper.vm.$nextTick();
            $store.state.workflow.nameEditorNodeId = defaultProps.nodeId;
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
