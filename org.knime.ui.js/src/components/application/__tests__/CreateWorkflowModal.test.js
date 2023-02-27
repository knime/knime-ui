import Vue from 'vue';
import Vuex from 'vuex';
import { mount, createLocalVue } from '@vue/test-utils';

import { mockVuexStore } from '@/test/test-utils';
import * as spacesStore from '@/store/spaces';

import CreateWorkflowModal from '../CreateWorkflowModal.vue';

describe('CreateWorkflowModal.vue', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    const MOCK_DATA = [
        {
            id: '1',
            name: 'File 1'
        },
        {
            id: '2',
            name: 'File 2'
        },
        {
            id: '3',
            name: 'File 3'
        },
        {
            id: '4',
            name: 'File 3'
        }
    ];

    const doMount = ({ items = MOCK_DATA, isOpen = true } = {}) => {
        const storeConfig = {
            spaces: {
                ...spacesStore,
                state: {
                    activeSpace: { activeWorkflowGroup: { items } },
                    isLoading: false,
                    isCreateWorkflowModalOpen: isOpen
                }
            }
        };
        
        const store = mockVuexStore(storeConfig);
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        const commitSpy = jest.spyOn(store, 'commit');
        
        const mocks = {
            $store: store
        };
        const wrapper = mount(CreateWorkflowModal, { mocks, stubs: { BaseModal: true } });

        return { wrapper, store, dispatchSpy, commitSpy };
    };

    describe('CreateWorkflowModal', () => {
        it('Opens on state change', async () => {
            const { wrapper, store } = doMount({ isOpen: false });
            await store.commit('spaces/setIsCreateWorkflowModalOpen', true);
            await Vue.nextTick();
            expect(wrapper.find('input').exists()).toBe(true);
        });

        it('Closes on state change', async () => {
            const { wrapper, commitSpy } = doMount({ isOpen: true });
            wrapper.vm.closeModal();
            await Vue.nextTick();
            expect(wrapper.find('input').exists()).toBe(false);
            expect(commitSpy).toHaveBeenCalledWith('spaces/setIsCreateWorkflowModalOpen', false);
        });

        describe('Name Suggestion', () => {
            it('should set default name suggestion', () => {
                const { wrapper } = doMount();
                const input = wrapper.find('input');
                expect(input.element.value).toBe('KNIME_project');
            });
            
            it('should find suitable name suggestion', () => {
                const { wrapper } = doMount({ items: [{
                    id: '1',
                    name: 'KNIME_project'
                },
                {
                    id: '2',
                    name: 'KNIME_project1'
                }] });
                const input = wrapper.find('input');
                expect(input.element.value).toBe('KNIME_project2');
            });
        });

        it('should create workflow', async () => {
            const { wrapper, dispatchSpy } = await doMount();

            const newName = 'Test name';
            const input = wrapper.find('input');
            input.element.value = newName;
            input.trigger('input');

            await wrapper.findAll('button').at(-1).trigger('click');
            expect(dispatchSpy).toHaveBeenCalledWith('spaces/createWorkflow', { workflowName: newName });
        });

        it.each(['.', '\\', '/'])('should clean workflow input', async (invalidChar) => {
            const { wrapper, dispatchSpy } = await doMount();

            const newName = 'Test name';
            const input = wrapper.find('input');
            input.element.value = invalidChar + newName + invalidChar;
            input.trigger('input');

            await wrapper.findAll('button').at(-1).trigger('click');
            expect(dispatchSpy).toHaveBeenCalledWith('spaces/createWorkflow', { workflowName: newName });
        });

        it('should disable button when name is invalid', async () => {
            const { wrapper } = await doMount();

            const input = wrapper.find('input');
            input.element.value = 'invalid Name?*?#:"<>%~|/\\>?';
            input.trigger('input');
            await Vue.nextTick();

            const errorMessage = wrapper.find('.item-error');
            expect(errorMessage.text()).toMatch('contains invalid characters');
        });

        it('Should focus the input', async () => {
            jest.useFakeTimers();
            const { wrapper } = await doMount();

            const input = wrapper.find('input');
            const focusSpy = jest.spyOn(input.element, 'focus');
            jest.runAllTimers();
            expect(focusSpy).toHaveBeenCalled();
        });
    });
});
